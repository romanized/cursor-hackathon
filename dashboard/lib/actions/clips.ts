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
 * ponytail: placeholder Step 6 — promotes every image asset to a "still" clip.
 * Ceiling: no motion, no transitions. Upgrade path: Remotion render or a
 * video model. Until then this lets the assembly + film steps function.
 */
export async function generateStillClips(projectId: string) {
  const { supabase } = await requireUser();

  const { data: images, error } = await supabase
    .from("assets")
    .select("id, beat_id, storage_path, url")
    .eq("project_id", projectId)
    .eq("kind", "image")
    .eq("status", "ready");
  if (error) throw error;
  if (!images?.length) throw new Error("no images to clip — upload images first");

  await supabase.from("assets").delete().eq("project_id", projectId).eq("kind", "clip");

  const rows: TablesInsert<"assets">[] = images.map((img) => ({
    project_id: projectId,
    beat_id: img.beat_id,
    kind: "clip",
    status: "ready",
    storage_path: img.storage_path,
    url: img.url,
    meta: { effect: "still", source_asset: img.id } as never,
  }));
  const { error: insErr } = await supabase.from("assets").insert(rows);
  if (insErr) throw insErr;

  await supabase.from("projects").update({ current_step: 7 }).eq("id", projectId).lt("current_step", 7);
  revalidatePath(`/create/${projectId}`, "layout");
  redirect(`/create/${projectId}/assemble`);
}
