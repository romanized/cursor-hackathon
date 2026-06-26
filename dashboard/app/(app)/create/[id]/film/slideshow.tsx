"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

export function Slideshow({
  clips,
  voiceUrl,
}: {
  clips: Array<{ id: string; url: string | null }>;
  voiceUrl: string | null;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [active, setActive] = useState(0);

  // Cycle through clips while audio plays. Even distribution across duration —
  // ponytail: no per-beat timing yet, falls back to 3s/clip if duration unknown.
  useEffect(() => {
    const el = audio.current;
    if (!el || !clips.length) return;
    let raf = 0;
    function tick() {
      const total = el!.duration || clips.length * 3;
      const t = el!.currentTime;
      const idx = Math.min(clips.length - 1, Math.floor((t / total) * clips.length));
      setActive(idx);
      raf = requestAnimationFrame(tick);
    }
    el.addEventListener("play", () => { raf = requestAnimationFrame(tick); });
    el.addEventListener("pause", () => cancelAnimationFrame(raf));
    el.addEventListener("ended", () => setActive(0));
    return () => cancelAnimationFrame(raf);
  }, [clips.length]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <div className="relative aspect-[9/16] max-h-[640px] bg-black">
          {clips.map((c, i) => (
            c.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={c.id}
                src={c.url}
                alt=""
                className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-0"}`}
              />
            ) : null
          ))}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] uppercase tracking-widest text-white/80">
            <span>Beat {String(active + 1).padStart(2, "0")} / {String(clips.length).padStart(2, "0")}</span>
            <span>hookm</span>
          </div>
        </div>
        {voiceUrl && (
          <div className="border-t border-[var(--color-border)] p-4">
            <audio ref={audio} controls src={voiceUrl} className="w-full" />
          </div>
        )}
      </Card>

      <aside className="flex flex-col gap-3">
        <div className="overline-muted">Beats</div>
        <ol className="grid grid-cols-3 gap-2">
          {clips.map((c, i) => (
            <li key={c.id} className={`relative aspect-square overflow-hidden rounded-md border ${i === active ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"}`}>
              {c.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.url} alt="" className="size-full object-cover" />
              )}
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
