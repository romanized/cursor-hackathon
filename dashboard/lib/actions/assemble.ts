"use server";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { TablesInsert } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createService } from "@/lib/supabase/service";

const W = 720;
const H = 1280;
const STILL_DURATION = 4;
const isVideoPath = (p: string) => /\.(mp4|webm|mov|m4v)$/i.test(p);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Step 7 — render a single 9:16 MP4 with all beat clips concatenated and the
 * ElevenLabs voiceover muxed in. Output is uploaded as `assets(kind='final')`
 * and played as a regular <video> in Step 8.
 *
 * Pipeline:
 *   1. Download every clip + voice from Storage to a temp dir.
 *   2. ffmpeg: scale/pad each input to 720x1280, concat, attach voice, encode
 *      H.264/AAC with +faststart.
 *   3. Upload the resulting mp4 back to Storage; signed URL goes on the asset.
 *
 * ponytail: re-encodes everything for codec/size sanity. If all clips are
 * already 720x1280 H.264 we could `-c copy` concat instead — current cost is
 * ~3-6s on a Mac for a 24s output, fine for the hackathon.
 */
export async function assembleFinal(projectId: string) {
  const { supabase, user } = await requireUser();
  const svc = createService();

  const [{ data: clips }, { data: voice }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, beat_id, url, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "clip")
      .eq("status", "ready")
      .order("created_at"),
    supabase
      .from("assets")
      .select("id, url, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "voiceover")
      .eq("status", "ready")
      .maybeSingle(),
  ]);

  if (!clips?.length) throw new Error("no clips ready");
  if (!voice?.storage_path) throw new Error("no voiceover ready");

  // Stable beat order: rejoin to beats.idx (clips arrive in created_at order
  // which usually matches, but failed/retried beats can skew it).
  const beatIds = clips
    .map((c) => c.beat_id)
    .filter((id): id is string => Boolean(id));
  const { data: beats } = await supabase
    .from("beats")
    .select("id, idx")
    .eq("project_id", projectId)
    .in("id", beatIds);
  const beatIdx = new Map((beats ?? []).map((b) => [b.id, b.idx] as const));
  const orderedClips = [...clips].sort((a, b) => {
    const ai = a.beat_id ? beatIdx.get(a.beat_id) ?? 999 : 999;
    const bi = b.beat_id ? beatIdx.get(b.beat_id) ?? 999 : 999;
    return ai - bi;
  });

  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `hookm-${projectId}-`)
  );
  console.log("[assemble] tmp", tmpDir, "clips", orderedClips.length);

  try {
    // Download all assets in parallel.
    const clipPaths = await Promise.all(
      orderedClips.map(async (clip, i) => {
        if (!clip.storage_path)
          throw new Error(`clip ${clip.id} has no storage_path`);
        const ext = path.extname(clip.storage_path).toLowerCase() || ".mp4";
        const dest = path.join(
          tmpDir,
          `clip${String(i).padStart(2, "0")}${ext}`
        );
        await downloadTo(svc, clip.storage_path, dest);
        return dest;
      })
    );
    const voicePath = path.join(
      tmpDir,
      `voice${path.extname(voice.storage_path) || ".mp3"}`
    );
    await downloadTo(svc, voice.storage_path, voicePath);

    const outPath = path.join(tmpDir, "final.mp4");
    await runFfmpeg(buildFfmpegArgs(clipPaths, voicePath, outPath));

    const bytes = await fs.readFile(outPath);
    const remotePath = `${user.id}/${projectId}/final/${randomUUID()}.mp4`;
    const { error: upErr } = await svc.storage
      .from("media")
      .upload(remotePath, bytes, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (upErr) throw upErr;
    const { data: signed } = await svc.storage
      .from("media")
      .createSignedUrl(remotePath, 60 * 60 * 24);

    await supabase
      .from("assets")
      .delete()
      .eq("project_id", projectId)
      .eq("kind", "final");

    const finalRow: TablesInsert<"assets"> = {
      project_id: projectId,
      kind: "final",
      status: "ready",
      storage_path: remotePath,
      url: signed?.signedUrl ?? null,
      meta: {
        kind: "rendered_mp4",
        bytes: bytes.length,
        clips: orderedClips.map((c) => ({ id: c.id, url: c.url })),
        voice: { id: voice.id, url: voice.url },
      } as never,
    };
    const { error } = await supabase.from("assets").insert(finalRow);
    if (error) throw error;

    await supabase
      .from("projects")
      .update({ status: "ready", current_step: 8 })
      .eq("id", projectId);

    console.log("[assemble] done", { remotePath, bytes: bytes.length });
    revalidatePath(`/create/${projectId}`, "layout");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  redirect(`/create/${projectId}/film`);
}

// ---------------------------------------------------------------------------

async function downloadTo(
  svc: ReturnType<typeof createService>,
  storagePath: string,
  dest: string
) {
  const { data, error } = await svc.storage.from("media").download(storagePath);
  if (error || !data)
    throw error ?? new Error(`download failed: ${storagePath}`);
  await fs.writeFile(dest, Buffer.from(await data.arrayBuffer()));
}

function buildFfmpegArgs(
  clipPaths: string[],
  voicePath: string,
  outPath: string
): string[] {
  const args: string[] = ["-y"];

  // Inputs: stills get -loop 1 -t N; videos go straight in.
  clipPaths.forEach((p) => {
    if (isVideoPath(p)) {
      args.push("-i", p);
    } else {
      args.push("-loop", "1", "-t", String(STILL_DURATION), "-i", p);
    }
  });
  args.push("-i", voicePath);

  // Normalize every clip to 720x1280 + 30fps + same SAR so concat doesn't fight.
  const filters = clipPaths
    .map(
      (_, i) =>
        `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,format=yuv420p[v${i}]`
    )
    .join(";");
  const concatInputs = clipPaths.map((_, i) => `[v${i}]`).join("");
  const filterComplex = `${filters};${concatInputs}concat=n=${clipPaths.length}:v=1:a=0[outv]`;

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[outv]",
    "-map",
    `${clipPaths.length}:a`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-shortest",
    outPath
  );
  return args;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[ffmpeg]", ffmpegInstaller.path, args.join(" "));
    const proc = spawn(ffmpegInstaller.path, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-800)}`));
    });
  });
}
