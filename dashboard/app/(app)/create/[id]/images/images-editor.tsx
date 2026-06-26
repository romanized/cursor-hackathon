"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, ImageAdd01Icon, RefreshIcon, SparklesIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { generateBeatImages, generateMascot, recordImageAsset } from "@/lib/actions/images";
import { advanceTo } from "@/lib/actions/projects";
import { useAssetsRealtime, type RealtimeAsset } from "@/lib/hooks/use-assets-realtime";

type Beat = { id: string; idx: number; label: string | null; text: string; visual_prompt: string | null };
type Asset = RealtimeAsset;

export function ImagesEditor({
  projectId,
  userId,
  beats,
  assets: initialAssets,
  mascotUrl: initialMascotUrl,
}: {
  projectId: string;
  userId: string;
  beats: Beat[];
  assets: Asset[];
  mascotUrl: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const assets = useAssetsRealtime<Asset>(projectId, "image", initialAssets);
  const [mascotUrl, setMascotUrl] = useState(initialMascotUrl);
  const [busyBeat, setBusyBeat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancing, startAdvance] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [mascotPending, startMascot] = useTransition();

  // Keep only the latest asset row per beat (the server lists them all so we
  // can show processing/failed states; pick by priority: ready > processing > failed).
  const byBeat = new Map<string, Asset>();
  for (const a of assets) {
    if (!a.beat_id) continue;
    const cur = byBeat.get(a.beat_id);
    if (!cur || rank(a.status) > rank(cur.status)) byBeat.set(a.beat_id, a);
  }
  function rank(s: Asset["status"]) {
    return s === "ready" ? 3 : s === "processing" ? 2 : s === "failed" ? 1 : 0;
  }

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

  function runMascot() {
    setError(null);
    startMascot(async () => {
      try {
        const result = await generateMascot(projectId);
        if (result.url) setMascotUrl(result.url);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function generateAll() {
    setError(null);
    startGenerate(async () => {
      try {
        const result = await generateBeatImages(projectId);
        router.refresh();
        if (result.errors?.length) {
          setError(`Generated ${result.generated}/${result.generated + result.errors.length}. ${result.errors[0].error}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const readyCount = beats.filter((b) => byBeat.get(b.id)?.status === "ready").length;
  const allReady = beats.length > 0 && readyCount === beats.length;
  const pendingCount = beats.length - readyCount;

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center gap-5 p-5">
        <div className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elev)]">
          {mascotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mascotUrl} alt="Project mascot" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-faint">No mascot</div>
          )}
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <span className="overline-muted">Mascot</span>
          <p className="text-sm text-muted">
            One canonical character for the whole video. Beat images reuse this portrait so the mascot stays consistent across every scene.
          </p>
          {mascotUrl && (
            <p className="text-xs text-faint">Re-roll the mascot if you change template — then regenerate beat images.</p>
          )}
        </div>
        <Button intent={mascotUrl ? "secondary" : "primary"} onClick={runMascot} disabled={mascotPending}>
          <HugeiconsIcon icon={mascotUrl ? RefreshIcon : SparklesIcon} size={16} strokeWidth={1.6} />
          {mascotPending ? "Generating…" : mascotUrl ? "Re-roll mascot" : "Generate mascot"}
        </Button>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="overline-muted">Beat images</span>
          <p className="text-sm text-muted">
            Nano-banana generates one scene per beat using the mascot + scraped product as references. Upload your own to override any beat.
          </p>
        </div>
        <Button
          intent="primary"
          onClick={generateAll}
          disabled={generating || !beats.length || allReady || !mascotUrl}
        >
          <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={1.6} />
          {generating
            ? `Generating ${pendingCount}…`
            : !mascotUrl
              ? "Generate mascot first"
            : allReady
              ? "All beats covered"
              : `Generate ${pendingCount} image${pendingCount === 1 ? "" : "s"}`}
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {beats.map((b) => {
          const existing = byBeat.get(b.id);
          const busy = busyBeat === b.id || existing?.status === "processing" || (generating && existing?.status !== "ready");
          return (
            <Card key={b.id} className="overflow-hidden">
              <label className="relative block aspect-[9/16] cursor-pointer">
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
                {existing?.status === "ready" && existing.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={existing.url} alt={b.label ?? "beat"} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 bg-[var(--color-surface-elev)] text-muted hover:text-text">
                    {existing?.status === "processing" || busy ? (
                      <>
                        <HugeiconsIcon icon={SparklesIcon} size={28} strokeWidth={1.5} className="animate-pulse text-[var(--color-accent)]" />
                        <span className="text-xs">Generating…</span>
                      </>
                    ) : existing?.status === "failed" ? (
                      <>
                        <span className="overline">Failed</span>
                        <span className="px-3 text-[10px] text-faint text-center line-clamp-3">{existing.error}</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={ImageAdd01Icon} size={28} strokeWidth={1.5} />
                        <span className="text-xs">Drop / click</span>
                      </>
                    )}
                  </div>
                )}
                {existing?.status === "ready" && (
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
