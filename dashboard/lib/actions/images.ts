"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createService } from "@/lib/supabase/service";
import { generateBeatImage, generateMascotImage } from "@/lib/providers/google";
import { chargeCredits, COST } from "@/lib/credits";
import { fitTo916 } from "@/lib/media/fit-916";
import { seedStaticMascotIfNeeded } from "@/lib/mascot/static-mascot";
import { hasTemplateReference } from "@/lib/references/template-mascots";
import type { TablesInsert, TablesUpdate } from "@/lib/db";

type ProjectMeta = { mascot_storage_path?: string | null };

/** Beat images + anything derived from them — stale after a mascot re-roll. */
async function clearDownstreamOfMascot(
  svc: ReturnType<typeof createService>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
) {
  const { data: rows } = await supabase
    .from("assets")
    .select("id, kind, beat_id, storage_path")
    .eq("project_id", projectId)
    .in("kind", ["image", "clip", "final"]);

  const stale = (rows ?? []).filter(
    (r) => r.kind === "clip" || r.kind === "final" || (r.kind === "image" && r.beat_id),
  );
  if (!stale.length) return;

  const paths = stale.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length) {
    const { error } = await svc.storage.from("media").remove(paths);
    if (error) console.warn("[clearDownstreamOfMascot] storage remove failed", error);
  }

  const { error: delErr } = await supabase
    .from("assets")
    .delete()
    .in(
      "id",
      stale.map((r) => r.id),
    );
  if (delErr) throw delErr;

  console.log("[clearDownstreamOfMascot]", { projectId, cleared: stale.length });
}

async function loadImageBytes(
  svc: ReturnType<typeof createService>,
  storagePath: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const { data, error } = await svc.storage.from("media").download(storagePath);
  if (error || !data) return null;
  const bytes = Buffer.from(await data.arrayBuffer());
  const mimeType = data.type || "image/png";
  return { bytes, mimeType };
}

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
  const svc = createService();

  // Enforce 9:16 even on manual uploads — crop in place before we record the row.
  const { data: blob, error: dlErr } = await svc.storage.from("media").download(input.storagePath);
  if (!dlErr && blob) {
    const fitted = await fitTo916(
      Buffer.from(await blob.arrayBuffer()),
      blob.type || "image/png",
    );
    await svc.storage.from("media").upload(input.storagePath, fitted.bytes, {
      contentType: fitted.mimeType,
      upsert: true,
    });
  }

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

/**
 * Generate the canonical mascot portrait for this project. Stored at
 * `projects.meta.mascot_storage_path` and passed as a second reference image
 * when generating per-beat stills so the character stays consistent.
 */
export async function generateMascot(projectId: string) {
  const { supabase, user } = await requireUser();
  const svc = createService();

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("template_id, meta")
    .eq("id", projectId)
    .single();
  if (pErr || !project) throw pErr ?? new Error("project not found");

  // Templates with a bundled reference image IS the mascot — never call Gemini.
  if (hasTemplateReference(project.template_id)) {
    const seeded = await seedStaticMascotIfNeeded({
      supabase,
      userId: user.id,
      projectId,
      templateId: project.template_id,
      meta: (project.meta ?? {}) as ProjectMeta,
    });
    revalidatePath(`/create/${projectId}/images`);
    return { url: seeded.url, cleared: false, static: true };
  }

  const meta = (project.meta ?? {}) as ProjectMeta;
  const isReroll = Boolean(meta.mascot_storage_path);
  if (isReroll) {
    await clearDownstreamOfMascot(svc, supabase, projectId);
  }

  const { bytes, mimeType } = await generateMascotImage({ templateId: project.template_id });

  const ext = mimeType.split("/")[1] ?? "png";
  const path = `${user.id}/${projectId}/mascot.${ext}`;
  const { error: upErr } = await svc.storage.from("media").upload(path, bytes, {
    contentType: mimeType,
    upsert: true,
  });
  if (upErr) throw upErr;

  const patch: TablesUpdate<"projects"> = {
    meta: { ...meta, mascot_storage_path: path } as never,
  };
  const { error: metaErr } = await supabase.from("projects").update(patch).eq("id", projectId);
  if (metaErr) throw metaErr;

  try {
    await chargeCredits({ userId: user.id, delta: COST.imagePerBeat, reason: "mascot", projectId });
  } catch (e) {
    console.warn("[generateMascot] credit charge failed", e);
  }

  const { data: signed } = await svc.storage.from("media").createSignedUrl(path, 60 * 60 * 24);
  revalidatePath(`/create/${projectId}/images`);
  revalidatePath(`/create/${projectId}`, "layout");
  return { url: signed?.signedUrl ?? null, cleared: isReroll, static: false };
}

/**
 * Generate one image per beat using Gemini 2.5 Flash Image (nano-banana).
 * Uses the first scraped product image (if any) as a visual reference so the
 * product itself stays consistent across beats. Skips beats that already have
 * a ready image — re-running the action only fills in the gaps.
 */
export async function generateBeatImages(projectId: string) {
  const { supabase, user } = await requireUser();
  const svc = createService();

  const [{ data: project }, { data: beats }, { data: existing }] = await Promise.all([
    supabase
      .from("projects")
      .select("template_id, product_name, product_id, meta")
      .eq("id", projectId)
      .single(),
    supabase
      .from("beats")
      .select("id, idx, label, text, visual_prompt")
      .eq("project_id", projectId)
      .order("idx"),
    supabase
      .from("assets")
      .select("beat_id, status")
      .eq("project_id", projectId)
      .eq("kind", "image"),
  ]);

  if (!project) throw new Error("project not found");
  if (!beats?.length) throw new Error("no beats — write the script first");

  let mascotPath = (project.meta as ProjectMeta | null)?.mascot_storage_path ?? null;
  if (hasTemplateReference(project.template_id)) {
    const seeded = await seedStaticMascotIfNeeded({
      supabase,
      userId: user.id,
      projectId,
      templateId: project.template_id,
      meta: project.meta as ProjectMeta,
    });
    mascotPath = seeded.path ?? mascotPath;
  } else if (!mascotPath) {
    throw new Error("generate the mascot first");
  }

  const readyBeatIds = new Set(
    (existing ?? []).filter((a) => a.status === "ready").map((a) => a.beat_id),
  );
  const todo = beats.filter((b) => !readyBeatIds.has(b.id));
  if (!todo.length) {
    revalidatePath(`/create/${projectId}/images`);
    return { generated: 0, skipped: beats.length };
  }

  // Best-effort: fetch the first scraped product image to use as a reference.
  let referenceImage: { bytes: Buffer; mimeType: string } | null = null;
  if (project.product_id) {
    const { data: product } = await supabase
      .from("products")
      .select("images")
      .eq("id", project.product_id)
      .single();
    const urls = Array.isArray(product?.images) ? (product!.images as string[]) : [];
    const firstUrl = urls[0];
    if (firstUrl) {
      try {
        const r = await fetch(firstUrl);
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          referenceImage = { bytes: buf, mimeType: r.headers.get("content-type") || "image/jpeg" };
        }
      } catch (e) {
        console.warn("[generateBeatImages] reference fetch failed", e);
      }
    }
  }

  // Mascot reference — canonical character portrait from Step 4.
  let mascotImage: { bytes: Buffer; mimeType: string } | null = null;
  if (mascotPath) {
    mascotImage = await loadImageBytes(svc, mascotPath);
    if (!mascotImage) console.warn("[generateBeatImages] mascot download failed", { mascotPath });
  }

  console.log("[generateBeatImages] start", {
    projectId,
    todo: todo.length,
    template: project.template_id,
    hasProductRef: Boolean(referenceImage),
    hasMascotRef: Boolean(mascotImage),
  });

  // Each beat is independent → run them in parallel. The DB row flips
  // processing → ready/failed per beat, and the client listens via Supabase
  // Realtime so the UI updates as each result lands (not at the end).
  const results = await Promise.allSettled(
    todo.map((beat) => generateOneImage({
      svc,
      supabase,
      userId: user.id,
      projectId,
      project,
      beat,
      referenceImage,
      mascotImage,
    })),
  );

  let generated = 0;
  const errors: Array<{ beat: number; error: string }> = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") generated += 1;
    else errors.push({ beat: todo[i].idx, error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
  });

  revalidatePath(`/create/${projectId}/images`);
  return { generated, skipped: beats.length - todo.length, errors };
}

async function generateOneImage(args: {
  svc: ReturnType<typeof createService>;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  projectId: string;
  project: { template_id: string | null; product_name: string | null };
  beat: { id: string; idx: number; label: string | null; text: string; visual_prompt: string | null };
  referenceImage: { bytes: Buffer; mimeType: string } | null;
  mascotImage: { bytes: Buffer; mimeType: string } | null;
}) {
  const { svc, supabase, userId, projectId, project, beat, referenceImage, mascotImage } = args;

  const { data: assetRow, error: insErr } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      beat_id: beat.id,
      kind: "image",
      status: "processing",
      provider: "google:gemini-2.5-flash-image",
    } satisfies TablesInsert<"assets">)
    .select("id")
    .single();
  if (insErr || !assetRow) throw insErr ?? new Error("insert failed");

  try {
    const { bytes, mimeType } = await generateBeatImage({
      templateId: project.template_id,
      productName: project.product_name,
      beat: { label: beat.label, text: beat.text, visual_prompt: beat.visual_prompt },
      referenceImage,
      mascotImage,
    });

    const ext = mimeType.split("/")[1] ?? "png";
    const path = `${userId}/${projectId}/images/${beat.id}-ai.${ext}`;
    const { error: upErr } = await svc.storage.from("media").upload(path, bytes, {
      contentType: mimeType,
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: signed } = await svc.storage.from("media").createSignedUrl(path, 60 * 60 * 24);

    await supabase
      .from("assets")
      .update({ status: "ready", storage_path: path, url: signed?.signedUrl ?? null })
      .eq("id", assetRow.id);
    console.log("[generateBeatImages] ok", { beat: beat.idx, path });

    try {
      await chargeCredits({ userId, delta: COST.imagePerBeat, reason: `image:${beat.idx}`, projectId });
    } catch (e) {
      console.warn("[generateBeatImages] credit charge failed", { beat: beat.idx, err: e });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("assets")
      .update({ status: "failed", error: msg })
      .eq("id", assetRow.id);
    console.error("[generateBeatImages] failed", { beat: beat.idx, error: msg });
    throw e;
  }
}
