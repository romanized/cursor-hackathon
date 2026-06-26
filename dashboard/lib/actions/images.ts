"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Record a successful client-side image upload to `assets`. The browser
 * uploads to Supabase Storage directly with its session client; this just
 * writes the assets row so RLS + the project owner contract hold.
 */
export async function recordImageAsset(input: {
  projectId: string;
  beatId: string;
  storagePath: string;
  url: string;
}) {
  const { supabase } = await requireUser();

  // Replace any existing image for this beat (clean slate).
  await supabase
    .from("assets")
    .delete()
    .eq("project_id", input.projectId)
    .eq("beat_id", input.beatId)
    .eq("kind", "image");

  const row: TablesInsert<"assets"> = {
    project_id: input.projectId,
    beat_id: input.beatId,
    kind: "image",
    status: "ready",
    storage_path: input.storagePath,
    url: input.url,
  };
  const { error } = await supabase.from("assets").insert(row);
  if (error) throw error;
  revalidatePath(`/create/${input.projectId}/images`);
}
