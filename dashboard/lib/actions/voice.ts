"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createService } from "@/lib/supabase/service";
import { synthesizeVoiceover, listVoices, type VoiceOption } from "@/lib/providers/elevenlabs";
import { chargeCredits, COST } from "@/lib/credits";
import type { Json, TablesInsert } from "@/lib/db";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Render one ElevenLabs MP3 per beat (keyed by `beat_id`) so the assemble step
 * can time-stretch each clip to match its own narration line. Also produces a
 * combined MP3 (byte-concat of the per-beat outputs) as the project-level
 * `voiceover` asset for the Step 5 preview player.
 *
 * ponytail: MP3 byte-concat between same-params files works in every
 * mainstream player, even if technically not a single bitstream. The combined
 * asset is preview-only — the final render reads the per-beat files
 * individually, so any join-boundary glitches don't reach the user's MP4.
 */
export async function generateVoiceover(projectId: string, voiceId?: string) {
  const { supabase, user } = await requireUser();
  const svc = createService();

  // Resolve + persist the chosen voice so a reload (and the assemble step)
  // remembers which voice rendered this project. Falls back to the env default.
  const { data: project } = await supabase
    .from("projects")
    .select("meta")
    .eq("id", projectId)
    .single();
  const meta = (project?.meta ?? {}) as Record<string, Json>;
  const chosenVoice = voiceId || (typeof meta.voice_id === "string" ? meta.voice_id : undefined);
  if (voiceId && voiceId !== meta.voice_id) {
    await supabase
      .from("projects")
      .update({ meta: { ...meta, voice_id: voiceId } as Json })
      .eq("id", projectId);
  }

  const { data: beats, error: bErr } = await supabase
    .from("beats")
    .select("id, idx, text")
    .eq("project_id", projectId)
    .order("idx");
  if (bErr) throw bErr;
  const narratable = (beats ?? []).filter((b) => b.text?.trim());
  if (!narratable.length) throw new Error("no beats with text — write the script first");

  // Wipe prior voiceover assets (both per-beat and project-level).
  await supabase
    .from("assets")
    .delete()
    .eq("project_id", projectId)
    .eq("kind", "voiceover");

  // Insert all rows in `processing` upfront so the UI sees progress + the
  // Realtime hook updates each beat independently.
  const processingRows: TablesInsert<"assets">[] = narratable.map((b) => ({
    project_id: projectId,
    beat_id: b.id,
    kind: "voiceover",
    status: "processing",
    provider: "elevenlabs",
  }));
  const { data: assetRows, error: insErr } = await supabase
    .from("assets")
    .insert(processingRows)
    .select("id, beat_id");
  if (insErr || !assetRows) throw insErr ?? new Error("could not create voice assets");
  const assetByBeat = new Map(assetRows.map((r) => [r.beat_id!, r.id] as const));

  revalidatePath(`/create/${projectId}/voice`);

  // Render in parallel — ElevenLabs handles its own concurrency budget.
  // Each beat's row flips to ready/failed independently.
  const segs = await Promise.all(
    narratable.map(async (beat) => {
      const assetId = assetByBeat.get(beat.id)!;
      try {
        const { mp3, alignment } = await synthesizeVoiceover(beat.text!, chosenVoice);
        const path = `${user.id}/${projectId}/voice/${beat.id}.mp3`;
        const { error: upErr } = await svc.storage
          .from("media")
          .upload(path, mp3, { contentType: "audio/mpeg", upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await svc.storage
          .from("media")
          .createSignedUrl(path, 60 * 60 * 24);
        await supabase
          .from("assets")
          .update({
            status: "ready",
            storage_path: path,
            url: signed?.signedUrl ?? null,
            meta: alignment ? ({ alignment } as never) : null,
          })
          .eq("id", assetId);

        try {
          await chargeCredits({
            userId: user.id,
            delta: COST.voiceover,
            reason: `voiceover:${beat.idx}`,
            projectId,
          });
        } catch (e) {
          console.warn("[generateVoiceover] credit charge failed", { beat: beat.idx, err: e });
        }

        return { idx: beat.idx, mp3 };
      } catch (e) {
        await supabase
          .from("assets")
          .update({ status: "failed", error: e instanceof Error ? e.message : String(e) })
          .eq("id", assetId);
        throw e;
      }
    }),
  );

  // Combined preview MP3 — byte concat in beat order.
  segs.sort((a, b) => a.idx - b.idx);
  const combined = Buffer.concat(segs.map((s) => s.mp3));
  const combinedPath = `${user.id}/${projectId}/voice/combined.mp3`;
  const { error: upCombErr } = await svc.storage
    .from("media")
    .upload(combinedPath, combined, { contentType: "audio/mpeg", upsert: true });
  if (upCombErr) throw upCombErr;
  const { data: signedComb } = await svc.storage
    .from("media")
    .createSignedUrl(combinedPath, 60 * 60 * 24);

  const combinedRow: TablesInsert<"assets"> = {
    project_id: projectId,
    kind: "voiceover",
    status: "ready",
    provider: "elevenlabs",
    storage_path: combinedPath,
    url: signedComb?.signedUrl ?? null,
    meta: { kind: "combined", segments: segs.length } as never,
  };
  const { error: combInsErr } = await supabase.from("assets").insert(combinedRow);
  if (combInsErr) throw combInsErr;

  await supabase
    .from("projects")
    .update({ current_step: 6 })
    .eq("id", projectId)
    .lt("current_step", 6);

  revalidatePath(`/create/${projectId}/voice`);
}

/** Voices the user can choose from on the Step 5 picker. */
export async function listAvailableVoices(): Promise<VoiceOption[]> {
  await requireUser();
  return listVoices();
}
