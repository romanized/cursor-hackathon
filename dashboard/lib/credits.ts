import "server-only";
import { createService } from "@/lib/supabase/service";

// Per-action credit costs. Roughly anchored to 1 credit ≈ $0.01 of vendor
// spend so the in-app ledger tracks real burn. Tweak here and nowhere else.
//
// Update one line, the whole app re-prices.
export const COST = {
  scrape:          5,    // Apify run (~$0.005–$0.05 depending on actor)
  briefInference:  2,    // Gemini 2.5 Flash, ~200-tok JSON output
  script:          8,    // Gemini 2.5 Flash, ~600-tok structured script
  imagePerBeat:   15,    // Gemini 2.5 Flash Image (Nano-banana), ~$0.04/img
  voiceover:      10,    // ElevenLabs Turbo v2.5, charged PER BEAT (~$0.06 each)
  clipKling:      40,    // Replicate kwaivgi/kling-v2.1 standard, $0.25/clip
  clipLTX:        10,    // Replicate lightricks/ltx-video, $0.05/clip
  clipVeo:       200,    // Google AI Studio Veo 3 Fast, ~$1.60/clip
  clipFal:        20,    // fal.ai Veo 3.1 Lite, 4s muted, ~$0.20/clip
} as const;

export type VideoProvider = "fal" | "replicate-kling" | "replicate-ltx" | "google-veo";

export function costForClip(provider: VideoProvider): number {
  switch (provider) {
    case "fal":             return COST.clipFal;
    case "replicate-kling": return COST.clipKling;
    case "replicate-ltx":   return COST.clipLTX;
    case "google-veo":      return COST.clipVeo;
    default: {
      const _exhaustive: never = provider;
      throw new Error(`unknown VIDEO_PROVIDER: ${_exhaustive}`);
    }
  }
}

/**
 * Atomic credit charge backed by the `charge_credits` Postgres function.
 * Throws `Error("insufficient_credits")` if the balance would go negative;
 * callers should catch and surface a friendly "top up" message.
 *
 * ponytail: pay-as-you-go, no pre-authorization. A failed AI call after a
 * successful charge would leave the user out their credits — we mitigate by
 * charging *after* the external call succeeds in every server action. The
 * ceiling: a user could spam start-and-cancel to consume vendor spend
 * without paying. Upgrade path = move to pre-charge + refund-on-failure.
 */
export async function chargeCredits(opts: {
  userId: string;
  delta: number; // pass a positive number; we send -delta to the function
  reason: string;
  projectId: string | null;
}): Promise<number> {
  const supabase = createService();
  const { data, error } = await supabase.rpc("charge_credits", {
    p_user: opts.userId,
    p_delta: -Math.abs(opts.delta),
    p_reason: opts.reason,
    // ponytail: generated types mark p_project as non-null but the SQL
    // function + ledger column accept nullable uuid. Cast around it.
    p_project: opts.projectId as string,
  });
  if (error) {
    if (error.message.includes("insufficient_credits")) {
      throw new Error("insufficient_credits");
    }
    throw error;
  }
  return data as number;
}

export async function refundCredits(opts: {
  userId: string;
  amount: number;
  reason: string;
  projectId: string | null;
}): Promise<number> {
  const supabase = createService();
  const { data, error } = await supabase.rpc("charge_credits", {
    p_user: opts.userId,
    p_delta: Math.abs(opts.amount),
    p_reason: opts.reason,
    p_project: opts.projectId as string,
  });
  if (error) throw error;
  return data as number;
}
