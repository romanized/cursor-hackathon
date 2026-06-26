"use client";

import { gsap } from "@/lib/gsap/register";

/** A timeline-only builder: fills the scrubbed timeline `useScrollScene` owns. */
type TimelineBuilder = (tl: GSAPTimeline) => void;

/**
 * RenderPin scene factory — the signature transformation, scrubbed to scroll.
 *
 * Pure timeline factory: returns a `SceneBuilder` that composes raw tweens onto
 * the timeline `useScrollScene` provides. It attaches NO ScrollTrigger itself
 * (the section wires PIN_DEFAULTS) and starts NO RAF loop. All selectors are
 * scoped by `useScrollScene` to the section root, so we address children with
 * the data-attribute hooks below.
 *
 * The scroll IS the render bar. Across one pinned scroll range the still product
 * photo cross-dissolves IN STAGES into a finished vertical ad while a lime
 * scrub-line sweeps the frame, captions pop in on beat, the REC timecode counts
 * up, and a "Generated in 38s" chip settles. Under reduced motion the hook
 * builds this same timeline then jumps it to the end, so the finished state is
 * shown statically with zero travel.
 *
 * Every tween uses `ease: "none"` for a true 1:1 scroll mapping (the heavy
 * "catch-up" feel comes from the ScrollTrigger `scrub: 1`, not per-tween easing)
 * EXCEPT the discrete caption pops, which keep the signature ease so they snap
 * "on beat" as the playhead crosses them.
 */

/** The clip length the REC HUD counts to (seconds). 0:00 -> 0:15. */
const CLIP_SECONDS = 15;

/** Stable DOM hooks the section markup must expose (data-render-pin="..."). */
export const RP = {
  scrubLine: '[data-render-pin="scrub-line"]',
  still: '[data-render-pin="still"]',
  ad: '[data-render-pin="ad"]',
  caption: '[data-render-pin="caption"]',
  hud: '[data-render-pin="hud"]',
  timecode: '[data-render-pin="timecode"]',
  progressFill: '[data-render-pin="progress-fill"]',
  generatedChip: '[data-render-pin="generated-chip"]',
  grade: '[data-render-pin="grade"]',
} as const;

/** Format whole seconds as `M:SS` (e.g. 9 -> "0:09", 15 -> "0:15"). */
function formatTimecode(totalSeconds: number): string {
  const safe = Math.max(0, Math.min(CLIP_SECONDS, Math.round(totalSeconds)));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Build the RenderPin scene onto `tl`.
 *
 * @param root the section element (selector queries are scoped to it)
 */
export function buildRenderPinScene(root: HTMLElement): TimelineBuilder {
  return (tl) => {
    const scoped = (sel: string) => gsap.utils.toArray<HTMLElement>(
      root.querySelectorAll(sel),
    );

    const timecodeEl = scoped(RP.timecode)[0];
    const scrubLineEl = scoped(RP.scrubLine)[0];
    const captions = scoped(RP.caption);

    // The line sweeps the full width of its screen. `x` is a transform (GPU-safe)
    // and is read as a FUNCTION so it re-resolves on every ScrollTrigger.refresh
    // (resize / soft-nav) rather than baking in a stale pixel value.
    const sweepDistance = () => {
      const screen = scrubLineEl?.offsetParent as HTMLElement | null;
      return screen ? screen.clientWidth : 0;
    };

    // Drive the REC HUD counter via a proxy object the timeline tweens; on each
    // update we write the formatted value into the mono node. No setState, no
    // extra RAF — the scrub owns the clock.
    const clock = { t: 0 };

    // --- Stage 0: cold start. Set initial states so the still is the only thing
    // visible before the scrub begins (and so reduced-motion's progress(1) lands
    // on the fully-rendered ad). `immediateRender` keeps these pre-paint.
    tl.set(RP.ad, { autoAlpha: 0 }, 0)
      .set(RP.grade, { autoAlpha: 0 }, 0)
      .set(RP.hud, { autoAlpha: 0 }, 0)
      .set(RP.generatedChip, { autoAlpha: 0, y: 16 }, 0)
      .set(RP.scrubLine, { autoAlpha: 0, x: 0 }, 0)
      .set(RP.progressFill, { scaleX: 0, transformOrigin: "left center" }, 0)
      .set(captions, { autoAlpha: 0, y: 24, scale: 0.92 }, 0);

    // --- Stage 1 (0 -> 0.18): the scrub-line wakes and the REC HUD fades up.
    // The lime line is one of the THREE locked lime uses (the active scrub line).
    tl.to(RP.scrubLine, { autoAlpha: 1, duration: 0.05, ease: "none" }, 0.02)
      .to(RP.hud, { autoAlpha: 1, duration: 0.08, ease: "none" }, 0.04);

    // --- Stage 2 (0 -> 1): the scrub-line sweeps left -> right across the frame.
    // This single full-range sweep IS the render bar the user drags.
    tl.to(
      RP.scrubLine,
      { x: sweepDistance, duration: 1, ease: "none" },
      0.05,
    );

    // Progress fill in the HUD tracks the same playhead.
    tl.to(
      RP.progressFill,
      { scaleX: 1, duration: 0.95, ease: "none" },
      0.05,
    );

    // --- Stage 3 (0.18 -> 0.55): the still cross-dissolves into the finished ad
    // as the line passes over it — the raw frame resolving into the cut.
    tl.to(RP.ad, { autoAlpha: 1, duration: 0.34, ease: "none" }, 0.18)
      .to(RP.still, { autoAlpha: 0, duration: 0.34, ease: "none" }, 0.18)
      // The color grade washes in just behind the dissolve to sell "finished".
      .to(RP.grade, { autoAlpha: 1, duration: 0.3, ease: "none" }, 0.24);

    // --- Stage 4 (0.3 -> 0.85): captions pop in ON BEAT as the playhead crosses
    // them. These keep the signature ease (not "none") so each snaps in crisply.
    if (captions.length > 0) {
      const firstBeat = 0.32;
      const beatGap = 0.12;
      captions.forEach((caption, i) => {
        tl.to(
          caption,
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.18 },
          firstBeat + i * beatGap,
        );
      });
    }

    // --- The clock: count 0:00 -> 0:15 across the bulk of the render (the HUD
    // timecode in Geist Mono). Tied to the same scrubbed timeline.
    if (timecodeEl) {
      tl.to(
        clock,
        {
          t: CLIP_SECONDS,
          duration: 0.9,
          ease: "none",
          onUpdate: () => {
            timecodeEl.textContent = formatTimecode(clock.t);
          },
        },
        0.06,
      );
    }

    // --- Stage 5 (0.86 -> 1): the render settles. Scrub-line fades as it leaves,
    // and the "Generated in 38s" chip rises into place — the finished beat.
    tl.to(RP.scrubLine, { autoAlpha: 0, duration: 0.08, ease: "none" }, 0.9)
      .to(
        RP.generatedChip,
        { autoAlpha: 1, y: 0, duration: 0.16 },
        0.88,
      );
  };
}
