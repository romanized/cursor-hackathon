"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

type Clip = { id: string; url: string | null };

const isVideoUrl = (url: string | null) => /\.(mp4|webm|mov)(\?|$)/i.test(url ?? "");

export function Slideshow({
  clips,
  voiceUrl,
}: {
  clips: Clip[];
  voiceUrl: string | null;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const videos = useRef<Array<HTMLVideoElement | null>>([]);
  const [active, setActive] = useState(0);

  const hasVideoClips = clips.some((c) => isVideoUrl(c.url));

  // Cycle through clips while audio plays. Evenly partition the audio duration
  // across N clips — works for both still images and per-beat Veo videos
  // (Veo clips are typically the same length).
  useEffect(() => {
    const el = audio.current;
    if (!el || !clips.length) return;
    let raf = 0;

    function tick() {
      if (!el) return;
      const total = el.duration || clips.length * 4;
      const t = el.currentTime;
      const idx = Math.min(clips.length - 1, Math.floor((t / total) * clips.length));
      setActive(idx);
      raf = requestAnimationFrame(tick);
    }

    const onPlay = () => { raf = requestAnimationFrame(tick); };
    const onPause = () => cancelAnimationFrame(raf);
    const onEnded = () => setActive(0);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [clips.length]);

  // Drive the active <video>: rewind+play it, pause everyone else.
  useEffect(() => {
    if (!hasVideoClips) return;
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [active, hasVideoClips]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <div className="relative aspect-[9/16] max-h-[640px] bg-black">
          {clips.map((c, i) => {
            if (!c.url) return null;
            const visible = i === active;
            const cls = `absolute inset-0 size-full object-cover transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`;
            return isVideoUrl(c.url) ? (
              <video
                key={c.id}
                ref={(el) => { videos.current[i] = el; }}
                src={c.url}
                className={cls}
                muted
                playsInline
                preload="auto"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={c.id} src={c.url} alt="" className={cls} />
            );
          })}
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
            <li
              key={c.id}
              className={`relative aspect-square overflow-hidden rounded-md border ${i === active ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
            >
              {c.url && (isVideoUrl(c.url) ? (
                <video src={c.url} className="size-full object-cover" muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.url} alt="" className="size-full object-cover" />
              ))}
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
