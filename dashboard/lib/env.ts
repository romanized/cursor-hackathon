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

  // Video clip provider for Step 6. "replicate-ltx" is the default — cheap
  // (~$0.05/clip), no rate-limit cliff. "google-veo" hits Google AI Studio's
  // Veo 3 Fast (higher quality but 2 RPM / 9 RPD on the free key).
  VIDEO_PROVIDER: z
    .enum(["replicate-kling", "replicate-ltx", "google-veo"])
    .default("replicate-kling"),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
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
