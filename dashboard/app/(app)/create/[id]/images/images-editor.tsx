"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, ImageAdd01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { recordImageAsset } from "@/lib/actions/images";
import { advanceTo } from "@/lib/actions/projects";

type Beat = { id: string; idx: number; label: string | null; text: string; visual_prompt: string | null };
type Asset = { beat_id: string | null; url: string | null; storage_path: string | null };

export function ImagesEditor({
  projectId,
  userId,
  beats,
  assets,
}: {
  projectId: string;
  userId: string;
  beats: Beat[];
  assets: Asset[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busyBeat, setBusyBeat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancing, startAdvance] = useTransition();

  const byBeat = new Map<string, Asset>();
  for (const a of assets) if (a.beat_id) byBeat.set(a.beat_id, a);

  async function uploadFor(beatId: string, file: File) {
    setError(null);
    setBusyBeat(beatId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/${projectId}/images/${beatId}.${ext}`;
      const { error: upErr } = await supabase
        .storage
        .from("media")
        .upload(path, file, { upsert: true, contentType: file.type || "image/png" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24);
      await recordImageAsset({ projectId, beatId, storagePath: path, url: signed?.signedUrl ?? "" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyBeat(null);
    }
  }

  const allReady = beats.length > 0 && beats.every((b) => byBeat.has(b.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {beats.map((b) => {
          const existing = byBeat.get(b.id);
          const busy = busyBeat === b.id;
          return (
            <Card key={b.id} className="overflow-hidden">
              <label className="relative block aspect-square cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFor(b.id, f);
                  }}
                  disabled={busy}
                />
                {existing?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={existing.url} alt={b.label ?? "beat"} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 bg-[var(--color-surface-elev)] text-muted hover:text-text">
                    <HugeiconsIcon icon={ImageAdd01Icon} size={28} strokeWidth={1.5} />
                    <span className="text-xs">{busy ? "Uploading…" : "Drop / click"}</span>
                  </div>
                )}
                {existing && (
                  <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-[var(--color-accent)] text-white">
                    <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} />
                  </span>
                )}
              </label>
              <div className="flex flex-col gap-1 p-4">
                <span className="overline">
                  {b.idx + 1 < 10 ? `0${b.idx + 1}` : b.idx + 1} · {b.label || "Beat"}
                </span>
                <p className="text-sm text-text line-clamp-2">{b.text}</p>
                {b.visual_prompt && (
                  <p className="mt-1 text-xs text-faint line-clamp-2">{b.visual_prompt}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && <p className="mr-auto text-sm text-[var(--color-accent-soft)]">{error}</p>}
        <Button
          size="lg"
          disabled={!allReady || advancing}
          onClick={() => startAdvance(() => advanceTo(projectId, 5, "voice"))}
        >
          {advancing ? "Saving…" : "Continue to voiceover"}
          <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
