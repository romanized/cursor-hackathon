"use server";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
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

  const [{ data: project }, { data: clips }, { data: voices }] = await Promise.all([
    supabase
      .from("projects")
      .select("captions")
      .eq("id", projectId)
      .single(),
    supabase
      .from("assets")
      .select("id, beat_id, url, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "clip")
      .eq("status", "ready")
      .not("beat_id", "is", null),
    supabase
      .from("assets")
      .select("id, beat_id, url, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "voiceover")
      .eq("status", "ready")
      .not("beat_id", "is", null),
  ]);

  if (!clips?.length) throw new Error("no clips ready");
  if (!voices?.length) throw new Error("no per-beat voiceover — re-render voice");

  // Pair each clip with its beat's voice. Beats keyed by id; output is in
  // beats.idx order so the final timeline matches the script.
  const beatIds = [
    ...new Set(clips.map((c) => c.beat_id!).concat(voices.map((v) => v.beat_id!))),
  ];
  const { data: beats } = await supabase
    .from("beats")
    .select("id, idx, text")
    .eq("project_id", projectId)
    .in("id", beatIds);
  const beatById = new Map((beats ?? []).map((b) => [b.id, b] as const));
  const voiceByBeat = new Map(voices.map((v) => [v.beat_id!, v] as const));

  type Pair = {
    beatId: string;
    idx: number;
    text: string | null;
    clip: (typeof clips)[number];
    voice: (typeof voices)[number];
  };
  const pairs: Pair[] = clips
    .map((c): Pair | null => {
      const v = voiceByBeat.get(c.beat_id!);
      const b = beatById.get(c.beat_id!);
      if (!v || !b) return null;
      return { beatId: c.beat_id!, idx: b.idx, text: b.text, clip: c, voice: v };
    })
    .filter((p): p is Pair => p !== null)
    .sort((a, b) => a.idx - b.idx);

  if (!pairs.length) {
    throw new Error("no clip/voice pairs — every beat needs both a clip and a voiceover");
  }

  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `hookm-${projectId}-`)
  );
  console.log("[assemble] tmp", tmpDir, "pairs", pairs.length);

  try {
    // Download all clip + voice files in parallel.
    const downloads = await Promise.all(
      pairs.map(async (p, i) => {
        if (!p.clip.storage_path) throw new Error(`clip ${p.clip.id} has no storage_path`);
        if (!p.voice.storage_path) throw new Error(`voice ${p.voice.id} has no storage_path`);
        const clipExt = path.extname(p.clip.storage_path).toLowerCase() || ".mp4";
        const voiceExt = path.extname(p.voice.storage_path).toLowerCase() || ".mp3";
        const ii = String(i).padStart(2, "0");
        const clipPath = path.join(tmpDir, `clip${ii}${clipExt}`);
        const voicePath = path.join(tmpDir, `voice${ii}${voiceExt}`);
        await Promise.all([
          downloadTo(svc, p.clip.storage_path, clipPath),
          downloadTo(svc, p.voice.storage_path, voicePath),
        ]);
        return { clipPath, voicePath };
      }),
    );

    // Probe durations — we need both to compute the setpts stretch ratio.
    const probed = await Promise.all(
      downloads.map(async (d) => {
        const [clipDur, voiceDur] = await Promise.all([
          probeDuration(d.clipPath).catch(() => STILL_DURATION),
          probeDuration(d.voicePath),
        ]);
        return { ...d, clipDur, voiceDur };
      }),
    );

    // Captions: cumulative offsets per beat, sized to the voice (which now
    // drives the final timeline).
    let srtName: string | null = null;
    if (project?.captions) {
      const cues: SrtCue[] = [];
      let cursor = 0;
      pairs.forEach((p, i) => {
        const dur = probed[i].voiceDur;
        const text = p.text?.trim();
        if (text) cues.push({ start: cursor, end: cursor + dur, text });
        cursor += dur;
      });
      if (cues.length) {
        srtName = "captions.srt";
        await fs.writeFile(path.join(tmpDir, srtName), toSrt(cues), "utf8");
        console.log("[assemble] captions", { cues: cues.length, totalSec: cursor });
      }
    }

    const outPath = path.join(tmpDir, "final.mp4");
    await runFfmpeg(buildFfmpegArgs(probed, outPath, srtName), tmpDir);

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
        pairs: pairs.map((p, i) => ({
          beatId: p.beatId,
          clipId: p.clip.id,
          voiceId: p.voice.id,
          clipDur: probed[i].clipDur,
          voiceDur: probed[i].voiceDur,
        })),
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

type ProbedPair = {
  clipPath: string;
  voicePath: string;
  clipDur: number;
  voiceDur: number;
};

function buildFfmpegArgs(
  pairs: ProbedPair[],
  outPath: string,
  srtName: string | null,
): string[] {
  const args: string[] = ["-y"];

  // Inputs: for each pair, the clip then the voice. Stills get -loop 1 -t
  // sized to the voice duration; videos go straight in and we'll setpts them.
  pairs.forEach((p) => {
    if (isVideoPath(p.clipPath)) {
      args.push("-i", p.clipPath);
    } else {
      args.push("-loop", "1", "-t", String(p.voiceDur), "-i", p.clipPath);
    }
    args.push("-i", p.voicePath);
  });

  // Per pair: scale+pad clip to 720x1280, then stretch with setpts so the
  // clip's duration matches the voice's. fps=30 last so the timing is exact.
  const vFilters = pairs.map((p, i) => {
    const inputIdx = i * 2;
    // Stills are already sized via `-t voiceDur` on the input — no stretch.
    // Real videos: setpts=PTS*(voiceDur/clipDur) makes the clip exactly the
    // length of the per-beat narration, locking lip/beat sync to that voice.
    const isStill = !isVideoPath(p.clipPath);
    const ratio = !isStill && p.clipDur > 0.05 ? p.voiceDur / p.clipDur : 1;
    return `[${inputIdx}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,setpts=PTS*${ratio.toFixed(6)},fps=30,format=yuv420p[v${i}]`;
  });
  // Per pair: normalize the voice to stereo 44.1k AAC-friendly source.
  const aFilters = pairs.map((p, i) => {
    const audioIdx = i * 2 + 1;
    return `[${audioIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`;
  });

  const concatInputs = pairs.map((_, i) => `[v${i}][a${i}]`).join("");
  // If captions: concat → [cv][outa], then burn subs into [cv] → [outv].
  // Else: concat straight to [outv][outa].
  const tail = srtName
    ? `${concatInputs}concat=n=${pairs.length}:v=1:a=1[cv][outa];[cv]subtitles='${srtName}':force_style='FontName=Arial,Fontsize=34,Bold=1,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BorderStyle=1,Outline=5,Shadow=1,Alignment=2,MarginV=180,Spacing=0.4'[outv]`
    : `${concatInputs}concat=n=${pairs.length}:v=1:a=1[outv][outa]`;

  const filterComplex = `${vFilters.join(";")};${aFilters.join(";")};${tail}`;

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[outv]",
    "-map",
    "[outa]",
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
    outPath,
  );
  return args;
}

function runFfmpeg(args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[ffmpeg]", ffmpegInstaller.path, args.join(" "));
    const proc = spawn(ffmpegInstaller.path, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
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

// ---------------------------------------------------------------------------
// Captions

type SrtCue = { start: number; end: number; text: string };

function probeDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobeInstaller.path, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      file,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout?.on("data", (d) => { out += d.toString(); });
    proc.stderr?.on("data", (d) => { err += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exit ${code}: ${err.slice(-400)}`));
      const n = Number(out.trim());
      if (!Number.isFinite(n) || n <= 0) return reject(new Error(`ffprobe bad duration: ${out}`));
      resolve(n);
    });
  });
}

function toSrt(cues: SrtCue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`)
    .join("\n");
}

function ts(secs: number): string {
  const ms = Math.round(secs * 1000);
  const hh = Math.floor(ms / 3600000);
  const mm = Math.floor((ms % 3600000) / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const mss = ms % 1000;
  const pad = (n: number, w: number) => String(n).padStart(w, "0");
  return `${pad(hh, 2)}:${pad(mm, 2)}:${pad(ss, 2)},${pad(mss, 3)}`;
}
