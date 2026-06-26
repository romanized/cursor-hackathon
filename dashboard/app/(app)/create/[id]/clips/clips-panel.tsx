"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Film01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateMotionClips, generateStillClips } from "@/lib/actions/clips";
import { advanceTo } from "@/lib/actions/projects";

type Clip = { id: string; beat_id: string | null; url: string | null; status: "pending" | "processing" | "ready" | "failed"; error: string | null };

export function ClipsPanel({
  projectId,
  imageCount,
  clips,
}: {
  projectId: string;
  imageCount: number;
  clips: Clip[];
}) {
  const router = useRouter();
  const [veoPending, startVeo] = useTransition();
  const [stillPending, startStill] = useTransition();
  const [advancing, startAdvance] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = clips.filter((c) => c.status === "ready");
  const processing = clips.filter((c) => c.status === "processing").length;
  const failed = clips.filter((c) => c.status === "failed").length;

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="overline-muted">Render</span>
          <p className="text-sm text-muted">
            {imageCount} image{imageCount === 1 ? "" : "s"} ready ·{" "}
            <span className="text-text">{ready.length}</span> clip{ready.length === 1 ? "" : "s"} done
            {processing > 0 && <> · {processing} rendering</>}
            {failed > 0 && <> · <span className="text-[var(--color-accent-soft)]">{failed} failed</span></>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            intent="primary"
            disabled={veoPending || !imageCount}
            onClick={() =>
              startVeo(async () => {
                setError(null);
                try {
                  const result = await generateMotionClips(projectId);
                  router.refresh();
                  if (result.errors.length) {
                    setError(`Generated ${result.generated}, ${result.errors.length} failed: ${result.errors[0].error}`);
                  }
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              })
            }
          >
            <HugeiconsIcon icon={SparklesIcon} size={18} strokeWidth={1.5} />
            {veoPending ? `Rendering with Veo… (~1min / clip)` : `Generate motion clips with Veo`}
          </Button>

          <Button
            type="button"
            intent="ghost"
            size="md"
            disabled={stillPending || !imageCount}
            onClick={() =>
              startStill(async () => {
                setError(null);
                try {
                  await generateStillClips(projectId);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              })
            }
          >
            {stillPending ? "Saving…" : "Skip — use still images"}
          </Button>

          {ready.length > 0 && (
            <Button
              type="button"
              intent="secondary"
              className="ml-auto"
              disabled={advancing}
              onClick={() => startAdvance(() => advanceTo(projectId, 7, "assemble"))}
            >
              {advancing ? "Saving…" : "Continue to assemble"}
              <HugeiconsIcon icon={ArrowRight02Icon} size={16} strokeWidth={1.5} />
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-[var(--color-accent-soft)]">{error}</p>}
        <p className="text-xs text-faint">
          Veo 3 Fast image-to-video, vertical 9:16, ~4s per clip, no audio (your voiceover plays over the top). Each clip costs ~$0.50–$1; first render can take 30–90s per beat.
        </p>
      </Card>

      {clips.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {clips.map((c) => (
            <div
              key={c.id}
              className={`relative aspect-[9/16] overflow-hidden rounded-[var(--radius-lg)] border bg-black ${
                c.status === "ready"
                  ? "border-[var(--color-border)]"
                  : c.status === "failed"
                    ? "border-[var(--color-accent-soft)]"
                    : "border-[var(--color-accent-dim)]"
              }`}
            >
              {c.status === "ready" && c.url ? (
                <video
                  src={c.url}
                  className="size-full object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : c.status === "failed" ? (
                <div className="grid size-full place-items-center px-3 text-center text-xs text-[var(--color-accent-soft)]">
                  {c.error || "Failed"}
                </div>
              ) : (
                <div className="grid size-full place-items-center text-muted">
                  <HugeiconsIcon icon={Film01Icon} size={28} strokeWidth={1.5} className="animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
