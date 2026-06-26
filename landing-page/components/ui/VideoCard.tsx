"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * VideoCard — the Studio Black framed vertical `<video>` tile.
 *
 * A direct cousin of {@link AdCard}: the SAME 3:4-ish vertical render frame
 * (hairline border, surface-2 fill, render-grain overlay, deep shadow) but with a
 * real vertical clip inside instead of a CSS placeholder. The native 720x958
 * source is `aspect-[720/958]` so the frame's height follows its width exactly —
 * the Hero's size math (`Hero.reel.ts`) depends on that ratio holding.
 *
 * PLAYBACK — two modes, selected by `autoPlayInView`:
 *
 *  - `autoPlayInView` (the Hero default): the clip is a muted, looping, inline
 *    video that AUTO-PLAYS when the card is sufficiently on-screen and PAUSES when
 *    it leaves — driven by an IntersectionObserver on the wrapper. This is fully
 *    independent of scroll position (NO `currentTime`-from-scroll scrub). The
 *    `play()` promise rejection (autoplay policies) is swallowed. The poster paints
 *    first so the frame is never empty.
 *
 *  - default (`autoPlayInView` omitted/false): a passive, paused video showing its
 *    poster — for static / reduced-motion layouts where the caller wants a quiet
 *    still. No observer is attached.
 *
 * The element is decorative (`aria-hidden`, `tabIndex={-1}`) and found via
 * `data-reel-video`; the wrapper via `data-card-id` (set by the caller).
 *
 * ACCENT LOCK: ZERO lime, ZERO cobalt — hairline / surface / shadow + render-grain
 * only, exactly like AdCard, so a field of these never spends a locked accent use.
 */
export interface VideoCardProps {
  /** Public path to the clip, e.g. `/videos/skeleton_1.mp4`. */
  readonly src: string;
  /** Poster (first frame) for instant paint before the video decodes. */
  readonly poster: string;
  /** A tiny mono tick in the corner, e.g. `9:16`. NOT a caption. */
  readonly tick?: string;
  /**
   * `metadata` (default) loads just enough to begin; in-view cards are upgraded by
   * the browser once they start playing. Off-screen cards can pass `none`.
   */
  readonly preload?: "none" | "metadata" | "auto";
  /**
   * When `true`, the clip auto-plays a muted loop while the card is on-screen and
   * pauses when it leaves (IntersectionObserver). When falsy, the video stays
   * paused on its poster (static / reduced-motion layouts).
   */
  readonly autoPlayInView?: boolean;
  /** Class applied to the OUTER frame (sizing/positioning is the caller's job). */
  readonly className?: string;
}

/** Fraction of the card that must be visible before the loop plays. */
const PLAY_THRESHOLD = 0.35;

export function VideoCard({
  src,
  poster,
  tick,
  preload = "metadata",
  autoPlayInView = false,
  className,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // PLAY-BY-LOCATION: an IntersectionObserver toggles the muted loop on the
  // <video> as the card enters/leaves the viewport. Entirely decoupled from the
  // scroll pan — no currentTime scrubbing. Cleans up the observer on unmount or
  // when the mode flips. Under no-observer environments (very old browsers) it
  // best-effort plays once so the card is never a dead still.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlayInView) return;

    video.muted = true;
    video.loop = true;

    const play = () => {
      // Autoplay policies can reject play() (e.g. before a user gesture on some
      // browsers); the clip is muted+inline so it usually succeeds — swallow any
      // rejection rather than surfacing an unhandled promise.
      void video.play().catch(() => {});
    };
    const pause = () => {
      video.pause();
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return () => {
        pause();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) play();
          else pause();
        }
      },
      { threshold: PLAY_THRESHOLD },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      pause();
    };
  }, [autoPlayInView, src]);

  return (
    <div
      aria-hidden
      className={cn(
        "relative aspect-[720/958] w-full overflow-hidden rounded-frame border border-hairline bg-surface-2",
        "shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {/* The clip. object-cover fills the 3:4 frame; the source is already
          720x958 so there is effectively no crop. In `autoPlayInView` mode the
          IntersectionObserver above plays/pauses the muted loop by viewport
          presence — no scroll scrubbing. */}
      <video
        ref={videoRef}
        data-reel-video
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        poster={poster}
        preload={preload}
        loop={autoPlayInView}
        muted
        playsInline
        tabIndex={-1}
        aria-hidden
      />

      {/* Rendered-texture grain over the clip — a static image, never animated.
          Kept subtle so it reads as a "render", not a filter over the footage. */}
      <div aria-hidden className="render-grain pointer-events-none absolute inset-0 opacity-30" />

      {/* A whisper-thin top sheen so the framed clip seats into the Studio Black
          stage (white-alpha only — never an accent hue). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/[0.04] to-transparent"
      />

      {/* Tiny mono tick (e.g. 9:16) — bottom-left, muted, NOT a caption. */}
      {tick ? (
        <span className="absolute bottom-2.5 left-3 z-10 font-mono text-[0.5rem] uppercase tracking-[0.2em] text-muted">
          {tick}
        </span>
      ) : null}
    </div>
  );
}
