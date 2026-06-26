import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  // Server-only. Optional so the client bundle doesn't fail to boot when only
  // public vars are present at build time on Vercel; runtime guards below.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  APIFY_TOKEN: z.string().min(1).optional(),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_VOICE_ID: z.string().min(1).default("JBFqnCBsd6RMkjVDRZzb"),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  // Veo model + clip length. Used only when VIDEO_PROVIDER === "google-veo".
  VEO_MODEL: z.string().min(1).default("veo-3.0-fast-generate-001"),
  VEO_DURATION_SECONDS: z.coerce.number().int().min(4).max(8).default(4),

  // Video clip provider for Step 6. "fal" is the cheap drop-in replacement for
  // Google/Replicate: one key for image+video, ~$0.20/4s clip on Veo 3.1 Lite.
  // "replicate-kling" is best face consistency; "replicate-ltx" cheapest on
  // Replicate; "google-veo" hits Google AI Studio's Veo (2 RPM / 9 RPD free).
  VIDEO_PROVIDER: z
    .enum(["fal", "replicate-kling", "replicate-ltx", "google-veo"])
    .default("fal"),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),

  // fal.ai — one key for images (Nano Banana 2) AND video (Veo 3.1 Lite).
  // Used when VIDEO_PROVIDER=fal and/or IMAGE_PROVIDER=fal. SERVER ONLY.
  FAL_KEY: z.string().min(1).optional(),
  // Image provider for Step 4. "fal" = Nano Banana 2 on fal (default, ~$0.08/
  // image, paid). "google" = Gemini Nano-banana (free tier) as a fallback.
  IMAGE_PROVIDER: z.enum(["google", "fal"]).default("fal"),
  // fal video endpoint + clip length + resolution (used when VIDEO_PROVIDER=fal).
  FAL_VIDEO_MODEL: z.string().min(1).default("fal-ai/veo3.1/lite/image-to-video"),
  FAL_DURATION_SECONDS: z.coerce.number().int().min(4).max(8).default(4),
  FAL_RESOLUTION: z.enum(["720p", "1080p"]).default("720p"),
  // Fallback VEED subtitle preset when project.meta.caption_preset is absent.
  FAL_SUBTITLE_PRESET: z.string().min(1).default("simple"),
  // Community model on Replicate, so we must pin a `version` hash —
  // the `/v1/models/owner/name/predictions` endpoint only works for official
  // models. Format: `owner/name:version`.
  REPLICATE_LTX_MODEL: z
    .string()
    .min(1)
    .default(
      "lightricks/ltx-video:8c47da666861d081eeb4d1261853087de23923a268a69b63febdf5dc1dee08e4",
    ),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  VEO_MODEL: process.env.VEO_MODEL,
  VEO_DURATION_SECONDS: process.env.VEO_DURATION_SECONDS,
  VIDEO_PROVIDER: process.env.VIDEO_PROVIDER,
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
  REPLICATE_LTX_MODEL: process.env.REPLICATE_LTX_MODEL,
  FAL_KEY: process.env.FAL_KEY,
  IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
  FAL_VIDEO_MODEL: process.env.FAL_VIDEO_MODEL,
  FAL_DURATION_SECONDS: process.env.FAL_DURATION_SECONDS,
  FAL_RESOLUTION: process.env.FAL_RESOLUTION,
  FAL_SUBTITLE_PRESET: process.env.FAL_SUBTITLE_PRESET,
});

if (!parsed.success) {
  throw new Error(
    `[env] missing/invalid environment: ${parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ")}`
  );
}

export const env = parsed.data;

export function requireServer<K extends keyof typeof env>(
  key: K
): NonNullable<(typeof env)[K]> {
  const v = env[key];
  if (v === undefined || v === null || v === "") {
    throw new Error(`[env] ${String(key)} is required for this server action`);
  }
  return v as NonNullable<(typeof env)[K]>;
}
