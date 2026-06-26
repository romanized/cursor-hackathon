"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chargeCredits, COST } from "@/lib/credits";
// ponytail: per-action billing replaces the old hook/full upfront charge.
// saveScript no longer touches credits — the Step 3 spend is the
// generateScriptForProject AI call itself.
import { generateScript as runGenerateScript } from "@/lib/providers/google";
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
    beats: Array<{
      label: string;
      text: string;
      visual_prompt: string;
      type?: "character" | "microscopic";
      role?: string;
      duration_seconds?: number;
    }>;
  },
) {
  const { supabase } = await requireUser();

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
      meta: {
        type: b.type === "microscopic" ? "microscopic" : "character",
        role: b.role ?? "",
        duration_seconds: typeof b.duration_seconds === "number" ? b.duration_seconds : 4,
      } as never,
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

/**
 * Generate the voiceover script + beats from the saved brief using Gemini 2.5
 * Flash. Charges `COST.script` once Gemini returns a usable result.
 */
export async function generateScriptForProject(projectId: string) {
  const { supabase, user } = await requireUser();

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select(
      "template_id, runtime, product_name, target_audience, customer_issues, benefits, product_id, meta",
    )
    .eq("id", projectId)
    .single();
  if (pErr || !project) throw pErr ?? new Error("project not found");

  let productDescription: string | null = null;
  if (project.product_id) {
    const { data: product } = await supabase
      .from("products")
      .select("description")
      .eq("id", project.product_id)
      .maybeSingle();
    productDescription = product?.description ?? null;
  }

  console.log("[generateScriptForProject] start", {
    projectId,
    template: project.template_id,
    runtime: project.runtime,
  });

  const result = await runGenerateScript({
    templateId: project.template_id,
    productName: project.product_name,
    targetAudience: project.target_audience,
    customerIssues: project.customer_issues ?? [],
    benefits: project.benefits ?? [],
    runtime: project.runtime,
    productDescription,
  });

  // Replace beats wholesale.
  const { error: delErr } = await supabase.from("beats").delete().eq("project_id", projectId);
  if (delErr) throw delErr;

  if (result.beats.length) {
    const rows: TablesInsert<"beats">[] = result.beats.map((b, idx) => ({
      project_id: projectId,
      idx,
      label: b.label || null,
      text: b.text,
      visual_prompt: b.visual_prompt || null,
      meta: { type: b.type, role: b.role, duration_seconds: b.duration_seconds } as never,
    }));
    const { error: insErr } = await supabase.from("beats").insert(rows);
    if (insErr) throw insErr;
  }

  const existingMeta = (project.meta ?? {}) as Record<string, unknown>;
  const { error: upErr } = await supabase
    .from("projects")
    .update({
      voiceover_script: result.voiceover_script || null,
      meta: { ...existingMeta, script_metaphor: result.metaphor || null } as never,
    } satisfies TablesUpdate<"projects">)
    .eq("id", projectId);
  if (upErr) throw upErr;

  try {
    await chargeCredits({ userId: user.id, delta: COST.script, reason: "script", projectId });
  } catch (e) {
    console.warn("[generateScriptForProject] credit charge failed", e);
  }

  revalidatePath(`/create/${projectId}`, "layout");
  return { beats: result.beats.length, scriptChars: result.voiceover_script.length };
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
