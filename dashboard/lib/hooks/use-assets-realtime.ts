"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RealtimeAsset = {
  id: string;
  beat_id: string | null;
  kind: "image" | "voiceover" | "clip" | "final" | "cover";
  status: "pending" | "processing" | "ready" | "failed";
  url: string | null;
  storage_path: string | null;
  error: string | null;
};

/**
 * Subscribe to `public.assets` rows for one project + kind via Supabase
 * Realtime. Seeded from the server-rendered snapshot; merges INSERT / UPDATE
 * / DELETE events as they land so the UI updates in lock-step with the
 * parallel server actions writing those rows. RLS gates the stream — users
 * only see events for projects they own.
 */
export function useAssetsRealtime<T extends RealtimeAsset>(
  projectId: string,
  kind: T["kind"],
  initial: T[],
): T[] {
  const [assets, setAssets] = useState<T[]>(initial);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`assets:${projectId}:${kind}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assets",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newRow = payload.new as T | undefined;
          const oldRow = payload.old as { id?: string } | undefined;

          setAssets((prev) => {
            if (payload.eventType === "DELETE") {
              return oldRow?.id ? prev.filter((a) => a.id !== oldRow.id) : prev;
            }
            if (!newRow || newRow.kind !== kind) return prev;
            const without = prev.filter((a) => a.id !== newRow.id);
            return [...without, newRow];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, kind, supabase]);

  return assets;
}
