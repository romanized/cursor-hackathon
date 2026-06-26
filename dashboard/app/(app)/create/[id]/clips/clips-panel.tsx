"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateStillClips } from "@/lib/actions/clips";

export function ClipsPanel({
  projectId,
  imageCount,
  clips,
}: {
  projectId: string;
  imageCount: number;
  clips: Array<{ id: string; url: string | null }>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <p className="text-sm text-muted">
          {imageCount} image{imageCount === 1 ? "" : "s"} ready · {clips.length} clip{clips.length === 1 ? "" : "s"} rendered
        </p>
        <Button
          size="lg"
          className="mt-4"
          disabled={pending || !imageCount}
          onClick={() =>
            start(async () => {
              try {
                await generateStillClips(projectId);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            })
          }
        >
          <HugeiconsIcon icon={SparklesIcon} size={18} strokeWidth={1.5} />
          {pending ? "Rendering clips…" : clips.length ? "Re-render clips & continue" : "Render still clips"}
          <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
        </Button>
        {error && <p className="mt-3 text-sm text-[var(--color-accent-soft)]">{error}</p>}
      </Card>

      {clips.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {clips.map((c) => (
            <div key={c.id} className="relative aspect-[9/16] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-black">
              {c.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.url} alt="" className="size-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
