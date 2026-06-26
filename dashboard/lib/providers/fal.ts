import "server-only";
import { fal } from "@fal-ai/client";
import { env, requireServer } from "@/lib/env";

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
  const falInput = {
    prompt: input.prompt,
    aspect_ratio: "9:16" as const,
    ...(input.referenceImageUrls?.length
      ? { image_urls: input.referenceImageUrls }
      : {}),
  };

  const result = await withRetry(() =>
    fal.subscribe("fal-ai/nano-banana-2", { input: falInput }),
  );
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
