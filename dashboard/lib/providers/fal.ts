import "server-only";
import { fal } from "@fal-ai/client";
import { env, requireServer } from "@/lib/env";
import type { VeedSubtitlePreset } from "@/lib/media/subtitle-presets";

/**
 * fal.ai provider — the cheap-but-good replacement for the Google/Replicate
 * image + video providers. One key (FAL_KEY) covers both:
 *   - images: Nano Banana 2  (Google's newest, ~$0.08/image, ~½ of Pro)
 *   - video:  Veo 3.1 Lite   (Google tier on fal, 4s, audio off, ~$0.20/clip)
 *
 * Drop-in: both functions match the existing provider signatures exactly
 * ({ bytes, mimeType }), so `video.ts` and `images.ts` can swap to these with
 * a one-line change. Prices verified against fal.ai 2026-06-26 — re-check before
 * relying on them for billing.
 *
 * Audio is always disabled (the ElevenLabs voiceover is the only audio in the
 * final cut), matching the Kling/LTX/Veo providers.
 */

let _configured = false;
function ensure() {
  if (_configured) return;
  fal.config({ credentials: requireServer("FAL_KEY") });
  _configured = true;
}

/** True for errors worth retrying (network blips, rate limits, 5xx). */
function isTransient(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return /timeout|network|rate|429|5\d\d/.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, max = 2): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= max; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < max && isTransient(e)) continue;
      throw e;
    }
  }
  throw last;
}

async function downloadToBytes(url: string, what: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${what} download failed: ${resp.status} ${resp.statusText}`);
  return Buffer.from(await resp.arrayBuffer());
}

// --- Images (Step 4) --------------------------------------------------------
// Nano Banana 2 on fal. Accepts the product/mascot as reference image_urls to
// keep the product + character consistent across beats — same intent as the
// google.ts inlineData reference parts, but fal takes URLs not base64.
export async function generateBeatImageFal(input: {
  prompt: string;
  /** Public URLs of reference images (product, mascot) for consistency. */
  referenceImageUrls?: string[];
}): Promise<{ bytes: Buffer; mimeType: string }> {
  ensure();
  // Reference conditioning (product + mascot) ONLY works on the /edit endpoint —
  // the base text-to-image model silently drops image_urls, so every beat would
  // invent a new character. Route to /edit whenever we have reference images.
  const hasRefs = Boolean(input.referenceImageUrls?.length);
  const model = hasRefs ? "fal-ai/nano-banana-2/edit" : "fal-ai/nano-banana-2";
  const falInput = {
    prompt: input.prompt,
    aspect_ratio: "9:16" as const,
    ...(hasRefs ? { image_urls: input.referenceImageUrls } : {}),
  };

  const result = await withRetry(() => fal.subscribe(model, { input: falInput }));
  const data = result.data as { images?: Array<{ url: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("fal nano-banana-2 returned no image URL");

  const bytes = await downloadToBytes(url, "fal image");
  return { bytes, mimeType: "image/png" };
}

// --- Video (Step 6) ---------------------------------------------------------
// Veo 3.1 Lite on fal. Matches generateVideoFromImage()'s contract so it slots
// straight into video.ts. duration is the string enum "4s"|"6s"|"8s"; audio off.
export async function generateVideoFromImageFal(input: {
  imageUrl: string;
  prompt: string;
  durationSeconds?: number;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  ensure();
  const seconds = (input.durationSeconds ?? env.FAL_DURATION_SECONDS) > 5 ? 8 : 4;
  console.log("[fal.veo-lite] kickoff", { seconds, promptChars: input.prompt.length });

  const result = await withRetry(() =>
    fal.subscribe(env.FAL_VIDEO_MODEL, {
      input: {
        image_url: input.imageUrl,
        prompt: input.prompt,
        duration: `${seconds}s`, // Veo wants the string enum
        resolution: env.FAL_RESOLUTION, // 720p (cheap) or 1080p
        generate_audio: false, // voiceover is rendered separately (ElevenLabs)
      },
    }),
  );
  const data = result.data as { video?: { url: string } };
  const url = data.video?.url;
  if (!url) throw new Error("fal video returned no URL");

  const bytes = await downloadToBytes(url, "fal video");
  console.log("[fal.veo-lite] done", { bytes: bytes.length });
  return { bytes, mimeType: "video/mp4" };
}

// --- Subtitles (Step 7) -----------------------------------------------------
// VEED Subtitles on fal — burns styled captions into the assembled MP4.
// Pass srt_content to skip re-transcription (we already have ElevenLabs timing).
export async function addSubtitlesVeed(input: {
  videoBytes: Buffer;
  srtContent: string;
  preset: VeedSubtitlePreset;
  language?: string;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  ensure();
  const language = input.language ?? "en-US";
  console.log("[fal.veed-subtitles] upload", {
    preset: input.preset,
    bytes: input.videoBytes.length,
    srtChars: input.srtContent.length,
  });

  const videoUrl = await fal.storage.upload(
    new Blob([new Uint8Array(input.videoBytes)], { type: "video/mp4" }),
  );

  const result = await withRetry(() =>
    fal.subscribe("veed/subtitles", {
      input: {
        video_url: videoUrl,
        preset: input.preset,
        srt_content: input.srtContent,
        language,
      },
    }),
  );
  const data = result.data as { video?: { url: string } };
  const url = data.video?.url;
  if (!url) throw new Error("fal veed/subtitles returned no video URL");

  const bytes = await downloadToBytes(url, "fal veed subtitles");
  console.log("[fal.veed-subtitles] done", { bytes: bytes.length });
  return { bytes, mimeType: "video/mp4" };
}
