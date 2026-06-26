"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chargeCredits, COST } from "@/lib/credits";
import type { TablesInsert, TablesUpdate } from "@/lib/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createDraft() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, status: "draft", current_step: 1 } satisfies TablesInsert<"projects">)
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("failed to create draft");
  redirect(`/create/${data.id}/template`);
}

export async function setTemplate(projectId: string, templateId: string, mediaType: "video" | "slideshow") {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .update({ template_id: templateId, media_type: mediaType, current_step: 2 } satisfies TablesUpdate<"projects">)
    .eq("id", projectId);
  if (error) throw error;
  revalidatePath(`/create/${projectId}`, "layout");
  redirect(`/create/${projectId}/product`);
}

export async function saveBrief(
  projectId: string,
  patch: {
    product_name: string;
    target_audience: string;
    customer_issues: string;  // textarea, newline-separated
    benefits: string;          // textarea, newline-separated
    runtime: "hook" | "full";
    captions: boolean;
  },
) {
  const { supabase } = await requireUser();
  const split = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const { error } = await supabase
    .from("projects")
    .update({
      product_name: patch.product_name || null,
      target_audience: patch.target_audience || null,
      customer_issues: split(patch.customer_issues),
      benefits: split(patch.benefits),
      runtime: patch.runtime,
      captions: patch.captions,
      current_step: 3,
    } satisfies TablesUpdate<"projects">)
    .eq("id", projectId);
  if (error) throw error;
  revalidatePath(`/create/${projectId}`, "layout");
  redirect(`/create/${projectId}/script`);
}

export async function saveScript(
  projectId: string,
  payload: {
    voiceover_script: string;
    beats: Array<{ label: string; text: string; visual_prompt: string }>;
  },
) {
  const { supabase, user } = await requireUser();

  // Read project to know runtime for credit cost + to avoid charging twice.
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("runtime, current_step")
    .eq("id", projectId)
    .single();
  if (pErr || !project) throw pErr ?? new Error("project not found");

  // Charge credits only the first time we advance past step 3.
  if (project.current_step < 4) {
    await chargeCredits({
      userId: user.id,
      delta: COST[project.runtime],
      reason: `script:${project.runtime}`,
      projectId,
    });
  }

  // Replace beats wholesale (delete + insert keyed on (project_id, idx)).
  const { error: delErr } = await supabase.from("beats").delete().eq("project_id", projectId);
  if (delErr) throw delErr;

  if (payload.beats.length) {
    const rows: TablesInsert<"beats">[] = payload.beats.map((b, idx) => ({
      project_id: projectId,
      idx,
      label: b.label || null,
      text: b.text,
      visual_prompt: b.visual_prompt || null,
    }));
    const { error: insErr } = await supabase.from("beats").insert(rows);
    if (insErr) throw insErr;
  }

  const { error: upErr } = await supabase
    .from("projects")
    .update({ voiceover_script: payload.voiceover_script || null, current_step: 4 })
    .eq("id", projectId);
  if (upErr) throw upErr;

  revalidatePath(`/create/${projectId}`, "layout");
  redirect(`/create/${projectId}/images`);
}

export async function advanceTo(projectId: string, nextStep: number, nextSlug: string) {
  const { supabase } = await requireUser();
  const { data: cur } = await supabase
    .from("projects")
    .select("current_step")
    .eq("id", projectId)
    .single();
  const step = Math.max(cur?.current_step ?? 1, nextStep);
  const { error } = await supabase
    .from("projects")
    .update({ current_step: step })
    .eq("id", projectId);
  if (error) throw error;
  revalidatePath(`/create/${projectId}`, "layout");
  redirect(`/create/${projectId}/${nextSlug}`);
}
