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
 * ponytail: placeholder Step 7 — bundles the clip list + voiceover into one
 * `assets(kind='final')` row. The film page renders the clips as a slideshow
 * over the voiceover. Upgrade path: real FFmpeg/Remotion render.
 */
export async function assembleFinal(projectId: string) {
  const { supabase } = await requireUser();

  const [{ data: clips }, { data: voice }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, beat_id, url, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "clip")
      .eq("status", "ready")
      .order("created_at"),
    supabase
      .from("assets")
      .select("id, url, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "voiceover")
      .eq("status", "ready")
      .maybeSingle(),
  ]);

  if (!clips?.length) throw new Error("no clips ready");
  if (!voice) throw new Error("no voiceover ready");

  await supabase.from("assets").delete().eq("project_id", projectId).eq("kind", "final");

  const finalRow: TablesInsert<"assets"> = {
    project_id: projectId,
    kind: "final",
    status: "ready",
    storage_path: voice.storage_path,
    url: voice.url,
    meta: {
      kind: "slideshow",
      clips: clips.map((c) => ({ id: c.id, url: c.url })),
      voice: { id: voice.id, url: voice.url },
    } as never,
  };
  const { error } = await supabase.from("assets").insert(finalRow);
  if (error) throw error;

  await supabase
    .from("projects")
    .update({ status: "ready", current_step: 8 })
    .eq("id", projectId);

  revalidatePath(`/create/${projectId}`, "layout");
  redirect(`/create/${projectId}/film`);
}
