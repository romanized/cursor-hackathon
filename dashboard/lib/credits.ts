import "server-only";
import { createService } from "@/lib/supabase/service";

// Costs match the mockup: Hook variant = 1, Full ad = 3.
export const COST = { hook: 1, full: 3 } as const;

/**
 * Atomic credit charge backed by the `charge_credits` Postgres function.
 * Throws if the user has insufficient credits.
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
