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
import type { VoiceAlignment } from "@/lib/providers/elevenlabs";
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
      .select("id, beat_id, url, storage_path, meta")
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
    path.join(os.tmpdir(), `hookline-${projectId}-`)
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

    // Captions: ASS with 2–3 word chunks + karaoke highlight, lower-third.
    let assName: string | null = null;
    if (project?.captions) {
      const cues = buildCaptionCues(
        pairs.map((p, i) => ({
          text: p.text,
          voiceDur: probed[i].voiceDur,
          alignment: parseVoiceAlignment(p.voice.meta),
        })),
      );
      if (cues.length) {
        assName = "captions.ass";
        await fs.writeFile(path.join(tmpDir, assName), toAss(cues), "utf8");
        console.log("[assemble] captions", { cues: cues.length });
      }
    }

    const outPath = path.join(tmpDir, "final.mp4");
    await runFfmpeg(buildFfmpegArgs(probed, outPath, assName), tmpDir);

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
  assName: string | null,
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
  // If captions: concat → [cv][outa], then burn ASS subs into [cv] → [outv].
  const tail = assName
    ? `${concatInputs}concat=n=${pairs.length}:v=1:a=1[cv][outa];[cv]subtitles='${assName}'[outv]`
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
// Captions — ASS, 3-word chunks, karaoke highlight, lower-third safe area.

type AssCue = { start: number; end: number; text: string };
type WordTiming = { word: string; start: number; end: number };
const WORDS_PER_CHUNK = 3;

function parseVoiceAlignment(meta: unknown): VoiceAlignment | null {
  if (!meta || typeof meta !== "object") return null;
  const alignment = (meta as { alignment?: VoiceAlignment }).alignment;
  if (
    !alignment?.characters?.length ||
    alignment.characterStartTimesSeconds.length !== alignment.characters.length ||
    alignment.characterEndTimesSeconds.length !== alignment.characters.length
  ) {
    return null;
  }
  return alignment;
}

function wordsFromAlignment(alignment: VoiceAlignment): WordTiming[] {
  const { characters, characterStartTimesSeconds, characterEndTimesSeconds } = alignment;
  const words: WordTiming[] = [];
  let current = "";
  let wordStart = 0;
  let wordEnd = 0;

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (current) words.push({ word: current, start: wordStart, end: wordEnd });
      current = "";
      continue;
    }
    if (!current) wordStart = characterStartTimesSeconds[i];
    current += ch;
    wordEnd = characterEndTimesSeconds[i];
  }
  if (current) words.push({ word: current, start: wordStart, end: wordEnd });
  return words;
}

/** Fallback when alignment missing (pre-timestamp voice assets). */
function estimateWordTimings(text: string, dur: number): WordTiming[] {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const weights = parts.map((w) => Math.max(w.length, 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return parts.map((word, i) => {
    const slice = (weights[i] / total) * dur;
    const start = t;
    t += slice;
    return { word, start, end: t };
  });
}

function chunkWordTimings(words: WordTiming[], maxWords = WORDS_PER_CHUNK): WordTiming[][] {
  const chunks: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords));
  }
  return chunks;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function buildKaraokeLine(words: WordTiming[]): string {
  return words
    .map((w) => {
      const cs = Math.max(1, Math.round((w.end - w.start) * 100));
      return `{\\k${cs}}${escapeAssText(w.word)}`;
    })
    .join(" ");
}

function buildCaptionCues(
  beats: { text: string | null; voiceDur: number; alignment: VoiceAlignment | null }[],
): AssCue[] {
  const cues: AssCue[] = [];
  let cursor = 0;
  for (const beat of beats) {
    const words = beat.alignment
      ? wordsFromAlignment(beat.alignment)
      : estimateWordTimings(beat.text ?? "", beat.voiceDur);
    const chunks = chunkWordTimings(words);
    for (const chunk of chunks) {
      cues.push({
        start: cursor + chunk[0].start,
        end: cursor + chunk[chunk.length - 1].end,
        text: buildKaraokeLine(chunk),
      });
    }
    cursor += beat.voiceDur;
  }
  return cues;
}

function toAss(cues: AssCue[]): string {
  const header = `[Script Info]
Title: Hookline captions
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${W}
PlayResY: ${H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,46,&H00FFFFFF,&H0000FFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,2,1,2,48,48,140,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const lines = cues.map(
    (c) =>
      `Dialogue: 0,${assTs(c.start)},${assTs(c.end)},Default,,0,0,0,,${c.text}`,
  );
  return header + lines.join("\n") + "\n";
}

function assTs(secs: number): string {
  const cs = Math.round(secs * 100);
  const hh = Math.floor(cs / 360000);
  const mm = Math.floor((cs % 360000) / 6000);
  const ss = Math.floor((cs % 6000) / 100);
  const cc = cs % 100;
  const pad = (n: number, w: number) => String(n).padStart(w, "0");
  return `${hh}:${pad(mm, 2)}:${pad(ss, 2)}.${pad(cc, 2)}`;
}

// ponytail: dev-only sanity check for alignment → word timing
if (process.env.NODE_ENV !== "production") {
  const words = wordsFromAlignment({
    characters: ["t", "r", "a", "n", "s", "f", "o", "r", "m", " ", "y", "o", "u", "r"],
    characterStartTimesSeconds: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65],
    characterEndTimesSeconds: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7],
  });
  console.assert(words.length === 2 && words[0].word === "transform");
}

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

