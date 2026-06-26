import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, requireServer } from "@/lib/env";
import type { Database } from "@/lib/db";

// Service-role client — bypasses RLS. Only use server-side, never expose.
export function createService() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    requireServer("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
