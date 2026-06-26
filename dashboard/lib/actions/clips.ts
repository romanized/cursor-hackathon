"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createService } from "@/lib/supabase/service";
import { generateVideoFromImage } from "@/lib/providers/video";
import { chargeCredits, costForClip } from "@/lib/credits";
import { env } from "@/lib/env";
import type { TablesInsert } from "@/lib/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Step 6 — turn each beat's image into a real motion clip using Veo
 * (image-to-video). Sequential per beat so the user sees progress; each clip
 * is a separate `assets(kind='clip')` row that's processing then ready/failed.
 * Re-running only retries beats without a ready clip.
 */
export async function generateMotionClips(projectId: string) {
  const { supabase, user } = await requireUser();
  const svc = createService();

  // Drop any leftover non-ready clip rows (failed/processing) before kicking
  // off a fresh pass, so the UI only shows current attempts.
  await supabase
    .from("assets")
    .delete()
    .eq("project_id", projectId)
    .eq("kind", "clip")
    .neq("status", "ready");

  const [{ data: images }, { data: existing }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, beat_id, url, storage_path")
      .eq("project_id", projectId)
      .eq("kind", "image")
      .eq("status", "ready"),
    supabase
      .from("assets")
      .select("beat_id, status")
      .eq("project_id", projectId)
      .eq("kind", "clip"),
  ]);

  if (!images?.length) throw new Error("no images ready — generate or upload images first");

  const beatIds = new Set(images.map((i) => i.beat_id));
  const { data: beats } = await supabase
    .from("beats")
    .select("id, idx, label, text, visual_prompt")
    .eq("project_id", projectId)
    .in("id", [...beatIds].filter((id): id is string => Boolean(id)))
    .order("idx");

  const readyClipBeats = new Set(
    (existing ?? []).filter((a) => a.status === "ready").map((a) => a.beat_id),
  );
  const todo = images.filter((img) => img.beat_id && !readyClipBeats.has(img.beat_id));

  console.log("[generateMotionClips] start", {
    projectId,
    todo: todo.length,
    total: images.length,
  });

  // Veo runs are independent → fire them all in parallel. Each beat's row
  // flips processing → ready/failed on its own, and the client subscribes via
  // Supabase Realtime to render the change immediately.
  const runnableTodo = todo.filter((img) => img.beat_id && img.storage_path);
  const results = await Promise.allSettled(
    runnableTodo.map((img) => generateOneClip({
      svc,
      supabase,
      userId: user.id,
      projectId,
      img: { id: img.id, beat_id: img.beat_id!, storage_path: img.storage_path!, url: img.url },
      beat: beats?.find((b) => b.id === img.beat_id) ?? null,
    })),
  );

  let generated = 0;
  const errors: Array<{ beat: string; error: string }> = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") generated += 1;
    else errors.push({ beat: runnableTodo[i].beat_id!, error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
  });

  // Advance furthest reachable step if at least one clip is ready overall.
  const { data: anyReady } = await supabase
    .from("assets")
    .select("id")
    .eq("project_id", projectId)
    .eq("kind", "clip")
    .eq("status", "ready")
    .limit(1);
  if (anyReady?.length) {
    await supabase.from("projects").update({ current_step: 7 }).eq("id", projectId).lt("current_step", 7);
  }

  revalidatePath(`/create/${projectId}`, "layout");
  return { generated, errors };
}

async function generateOneClip(args: {
  svc: ReturnType<typeof createService>;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  projectId: string;
  img: { id: string; beat_id: string; storage_path: string; url: string | null };
  beat: { visual_prompt: string | null; text: string } | null;
}) {
  const { svc, supabase, userId, projectId, img, beat } = args;

  const { data: assetRow, error: insErr } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      beat_id: img.beat_id,
      kind: "clip",
      status: "processing",
      provider: `video:${process.env.VIDEO_PROVIDER ?? "replicate-ltx"}`,
      meta: { source_image: img.id } as never,
    } satisfies TablesInsert<"assets">)
    .select("id")
    .single();
  if (insErr || !assetRow) throw insErr ?? new Error("insert failed");

  try {
    // We pull bytes (needed for Veo) AND keep the signed URL (used by LTX).
    // Always-fresh signed URL so a stale row doesn't trip the remote fetch.
    const { data: imgBlob, error: dlErr } = await svc.storage.from("media").download(img.storage_path);
    if (dlErr || !imgBlob) throw dlErr ?? new Error("could not download source image");
    const imageBytes = Buffer.from(await imgBlob.arrayBuffer());
    const { data: signedSrc } = await svc.storage.from("media").createSignedUrl(img.storage_path, 60 * 60);
    const imageUrl = signedSrc?.signedUrl ?? img.url ?? "";

    const motionPrompt = [
      beat?.visual_prompt || beat?.text || "Subtle product motion",
      "Smooth camera push-in, subtle product rotation, soft parallax. Cinematic, no abrupt cuts.",
    ].join(" ");

    const { bytes, mimeType } = await generateVideoFromImage({
      imageUrl,
      imageBytes,
      imageMimeType: imgBlob.type || "image/png",
      prompt: motionPrompt,
    });

    const path = `${userId}/${projectId}/clips/${img.beat_id}.mp4`;
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
    console.log("[generateMotionClips] ok", { beat: img.beat_id, path });

    try {
      await chargeCredits({
        userId,
        delta: costForClip(env.VIDEO_PROVIDER),
        reason: `clip:${env.VIDEO_PROVIDER}`,
        projectId,
      });
    } catch (e) {
      console.warn("[generateMotionClips] credit charge failed", { beat: img.beat_id, err: e });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("assets")
      .update({ status: "failed", error: msg })
      .eq("id", assetRow.id);
    console.error("[generateMotionClips] failed", { beat: img.beat_id, error: msg });
    throw e;
  }
}

/**
 * ponytail: fallback for when Veo is not configured / over budget. Promotes
 * every image asset to a "still" clip so Assemble + Film steps still work.
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
