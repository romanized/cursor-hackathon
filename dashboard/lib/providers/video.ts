import "server-only";
import { env } from "@/lib/env";
import { generateVideoFromImage as generateVeo } from "@/lib/providers/google";
import {
  generateVideoFromImageKling,
  generateVideoFromImageLTX,
} from "@/lib/providers/replicate";

/**
 * Provider-agnostic image-to-video. Defaults to LTX-Video on Replicate
 * (cheap, no rate-limit cliff). Switch to Veo via env: `VIDEO_PROVIDER=google-veo`.
 *
 * Each provider takes a different shape of input — Veo needs the bytes, LTX
 * is happy with a public URL — so we pass both and let each pick. Callers
 * already have both: `assets.storage_path` (→ bytes via service client) and
 * `assets.url` (signed URL good for 24h).
 */
export async function generateVideoFromImage(input: {
  imageUrl: string;
  imageBytes: Buffer;
  imageMimeType: string;
  prompt: string;
  durationSeconds?: number;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  switch (env.VIDEO_PROVIDER) {
    case "replicate-kling":
      return generateVideoFromImageKling({
        imageUrl: input.imageUrl,
        prompt: input.prompt,
        durationSeconds: input.durationSeconds,
      });
    case "replicate-ltx":
      return generateVideoFromImageLTX({
        imageUrl: input.imageUrl,
        prompt: input.prompt,
        durationSeconds: input.durationSeconds,
      });
    case "google-veo":
      return generateVeo({
        imageBytes: input.imageBytes,
        imageMimeType: input.imageMimeType,
        prompt: input.prompt,
        durationSeconds: input.durationSeconds,
      });
    default: {
      const _exhaustive: never = env.VIDEO_PROVIDER;
      throw new Error(`unknown VIDEO_PROVIDER: ${_exhaustive}`);
    }
  }
}
