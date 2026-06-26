import "server-only";
import Replicate from "replicate";
import { env, requireServer } from "@/lib/env";

// LTX-Video on Replicate. Cheap (~$0.05 / 5s clip).
//
// ponytail: in-process throttle. Replicate's free tier caps creation at
// 6 RPM with burst=1 while account credit < $5. Parallel fan-out from
// `generateMotionClips` blows this instantly, so we gate `client.run()`
// calls through a single-flight queue with a min spacing and a 429-aware
// retry. Upgrade path: top up Replicate ($5+) → caps lift, gate becomes a
// no-op pass-through (1 in flight is still fine, just much faster).
const MIN_SPACING_MS = 11_000;  // 6 RPM = 1 per 10s; +1s safety.
const MAX_RETRIES = 4;

let _client: Replicate | null = null;
function client() {
  if (!_client) _client = new Replicate({ auth: requireServer("REPLICATE_API_TOKEN") });
  return _client;
}

let lastStartAt = 0;
let queueTail: Promise<unknown> = Promise.resolve();
function gated<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = lastStartAt + MIN_SPACING_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastStartAt = Date.now();
    return fn();
  };
  const next = queueTail.then(run, run);
  queueTail = next.catch(() => {});
  return next;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function parseRetryAfter(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  if (!/429|Too Many Requests|throttled/i.test(msg)) return null;
  const m = msg.match(/retry_after"?\s*:\s*(\d+(?:\.\d+)?)/i)
    ?? msg.match(/resets in ~?(\d+)\s*s/i);
  const seconds = m ? Number(m[1]) : 10;
  return Math.max(1, seconds) * 1000;
}

// LTX-Video accepts a fixed enum for `length` (frames). 25 fps target.
// 97 ≈ 3.9s, 129 ≈ 5.2s, 161 ≈ 6.4s, 193 ≈ 7.7s, 225 ≈ 9s, 257 ≈ 10.3s.
const LENGTHS = [97, 129, 161, 193, 225, 257] as const;
function pickLength(seconds: number): (typeof LENGTHS)[number] {
  const target = Math.max(2, Math.min(10, seconds)) * 25;
  return LENGTHS.reduce((best, n) =>
    Math.abs(n - target) < Math.abs(best - target) ? n : best,
  );
}

export async function generateVideoFromImageKling(input: {
  imageUrl: string;
  prompt: string;
  durationSeconds?: number;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  const duration: 5 | 10 = (input.durationSeconds ?? 5) > 7 ? 10 : 5;
  console.log("[replicate.kling] kickoff", {
    duration,
    promptChars: input.prompt.length,
  });

  // Kling 2.6 Pro: industry pick for character/face consistency in 9:16
  // image-to-video. ~$0.25 / 5s clip on Replicate, 1080p, 24fps.
  // - `aspect_ratio` is ignored when `start_image` is set (it inherits).
  // - `generate_audio` defaults to TRUE — we disable it so the ElevenLabs
  //   voiceover we already render is the only audio in the final video.
  const output = await runWithRetry(() =>
    client().run("kwaivgi/kling-v2.6", {
      input: {
        prompt: input.prompt,
        start_image: input.imageUrl,
        duration,
        generate_audio: false,
        negative_prompt: "low quality, blurry, distorted, warped, watermark, text, extra limbs, deformed face",
      },
    }),
  );

  const videoUrl = await toUrl(output);
  if (!videoUrl) {
    console.error("[replicate.kling] no video URL in output", { output });
    throw new Error("Replicate returned no video URL");
  }
  const resp = await fetch(videoUrl);
  if (!resp.ok) throw new Error(`Kling download failed: ${resp.status} ${resp.statusText}`);
  const bytes = Buffer.from(await resp.arrayBuffer());
  console.log("[replicate.kling] done", { bytes: bytes.length });
  return { bytes, mimeType: "video/mp4" };
}

async function runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await gated(fn);
    } catch (e) {
      const wait = parseRetryAfter(e);
      attempt++;
      if (wait === null || attempt > MAX_RETRIES) throw e;
      const backoff = wait + Math.floor(Math.random() * 1500);
      console.warn("[replicate] 429, backing off", { attempt, backoffMs: backoff });
      await sleep(backoff);
    }
  }
}

export async function generateVideoFromImageLTX(input: {
  imageUrl: string;
  prompt: string;
  durationSeconds?: number;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  const duration = input.durationSeconds ?? 5;
  const length = pickLength(duration);
  console.log("[replicate.ltx] kickoff", {
    model: env.REPLICATE_LTX_MODEL,
    durationSeconds: duration,
    length,
    promptChars: input.prompt.length,
  });

  const output = await runWithRetry(() =>
    client().run(env.REPLICATE_LTX_MODEL as `${string}/${string}:${string}`, {
      input: {
        prompt: input.prompt,
        image: input.imageUrl,
        length,
        target_size: 704,            // height; gives ~396x704 9:16 frames
        aspect_ratio: "9:16",
        cfg: 3,
        steps: 30,
        image_noise_scale: 0.15,     // lower → stick closer to source image
      },
    }),
  );

  const videoUrl = await toUrl(output);
  if (!videoUrl) {
    console.error("[replicate.ltx] no video URL in output", { output });
    throw new Error("Replicate returned no video URL");
  }

  const resp = await fetch(videoUrl);
  if (!resp.ok) throw new Error(`LTX download failed: ${resp.status} ${resp.statusText}`);
  const bytes = Buffer.from(await resp.arrayBuffer());
  console.log("[replicate.ltx] done", { bytes: bytes.length });
  return { bytes, mimeType: "video/mp4" };
}

// Replicate's run() output shape varies per model: string URL, string[] of
// URLs, or a FileOutput-like object with a `url` getter/method. Normalize.
async function toUrl(output: unknown): Promise<string | null> {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output[0];
    return typeof first === "string" ? first : toUrl(first);
  }
  if (output && typeof output === "object") {
    const u = (output as { url?: unknown }).url;
    if (typeof u === "string") return u;
    if (typeof u === "function") {
      const v = await (u as () => unknown).call(output);
      return v instanceof URL ? v.href : String(v);
    }
  }
  return null;
}
