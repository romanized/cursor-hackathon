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
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
});

if (!parsed.success) {
  throw new Error(
    `[env] missing/invalid environment: ${parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ")}`,
  );
}

export const env = parsed.data;

export function requireServer<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const v = env[key];
  if (v === undefined || v === null || v === "") {
    throw new Error(`[env] ${String(key)} is required for this server action`);
  }
  return v as NonNullable<(typeof env)[K]>;
}
