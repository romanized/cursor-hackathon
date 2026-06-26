"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createService } from "@/lib/supabase/service";
import { synthesizeVoiceover } from "@/lib/providers/elevenlabs";
import { chargeCredits, COST } from "@/lib/credits";
import type { TablesInsert } from "@/lib/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function generateVoiceover(projectId: string) {
  const { supabase, user } = await requireUser();

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("voiceover_script")
    .eq("id", projectId)
    .single();
  if (pErr || !project?.voiceover_script) {
    throw new Error("voiceover_script is empty — write the script first");
  }

  // Replace any prior voiceover asset; we only ever keep one per project.
  await supabase
    .from("assets")
    .delete()
    .eq("project_id", projectId)
    .eq("kind", "voiceover");

  const processing: TablesInsert<"assets"> = {
    project_id: projectId,
    kind: "voiceover",
    status: "processing",
    provider: "elevenlabs",
  };
  const { data: asset, error: aErr } = await supabase
    .from("assets")
    .insert(processing)
    .select("id")
    .single();
  if (aErr || !asset) throw aErr ?? new Error("could not create voice asset");

  revalidatePath(`/create/${projectId}/voice`);

  try {
    const mp3 = await synthesizeVoiceover(project.voiceover_script);
    const path = `${user.id}/${projectId}/voice.mp3`;

    // Service-role upload — the user can already insert into their folder via
    // RLS, but using the service client avoids re-reading the session cookie
    // mid-action and keeps the bucket private.
    const svc = createService();
    const { error: upErr } = await svc
      .storage
      .from("media")
      .upload(path, mp3, { contentType: "audio/mpeg", upsert: true });
    if (upErr) throw upErr;

    const { data: signed } = await svc.storage.from("media").createSignedUrl(path, 60 * 60 * 24);

    await supabase
      .from("assets")
      .update({ status: "ready", storage_path: path, url: signed?.signedUrl ?? null })
      .eq("id", asset.id);

    try {
      await chargeCredits({ userId: user.id, delta: COST.voiceover, reason: "voiceover", projectId });
    } catch (e) {
      console.warn("[generateVoiceover] credit charge failed", e);
    }

    // First completion → advance furthest reachable step.
    await supabase
      .from("projects")
      .update({ current_step: 6 })
      .eq("id", projectId)
      .lt("current_step", 6);
  } catch (e) {
    await supabase
      .from("assets")
      .update({ status: "failed", error: e instanceof Error ? e.message : String(e) })
      .eq("id", asset.id);
    throw e;
  } finally {
    revalidatePath(`/create/${projectId}/voice`);
  }
}
