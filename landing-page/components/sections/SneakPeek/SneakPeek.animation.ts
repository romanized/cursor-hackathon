"use client";

import { gsap } from "@/lib/gsap/register";
import type { SceneBuilder } from "@/hooks/useScrollScene";

/**
 * SneakPeek scene — the dashboard-panel rise + the seamless fixed-teaser handoff.
 *
 * Two cooperating pieces, ONE scrubbed timeline (owned by `useScrollScene`):
 *
 *  1) PANEL RISE — as the user scrolls out of the pinned hero into this section,
 *     the Hookline-dashboard panel lifts from a parked, slightly-shrunk, slightly-
 *     dropped pose (yPercent + scale) into its resting frame while its inner
 *     content (sidebar, step strip, format cards) fans in on a stagger.
 *     Transform/opacity ONLY — no layout props, GPU-cheap.
 *
 *  2) FIXED-TEASER HANDOFF — a `position:fixed`, viewport-bottom-anchored teaser
 *     (the SAME seamless rounded panel-top the real panel carries — warm-dark
 *     #15100f surface, a soft top-edge light hairline, and an ambient glow so it
 *     lifts off the #050505 landing canvas) is present from FIRST PAINT, so a
 *     clearly-visible teaser peeks above the fold at the bottom of the (pinned)
 *     hero with zero dependency on scroll position. It starts at full autoAlpha
 *     (visible on load); as the real panel rises to meet it, the fixed teaser
 *     fades out (and goes pointer-events-none) so the real panel's identical
 *     rounded top takes its place — a seamless swap, no double top-edge, no gap.
 *
 * The scrub trigger is NON-pinned (start 'top bottom', end 'top 30%'), so it adds
 * no pinned length and cannot create a double-scroll against the single hero pin.
 *
 * REDUCED MOTION: `useScrollScene` builds this same timeline then completes it, so
 * the panel lands resting + fully visible and the teaser lands faded — a calm,
 * static panel with no travel. The component additionally retires the teaser
 * under reduce so no fixed trickery is needed.
 */

/** Stable DOM hooks the markup exposes (data-sneak="..."). Markup + motion sync. */
export const SNEAK = {
  /** The rising dashboard panel (the transform target for the lift). */
  panel: '[data-sneak="panel"]',
  /** The fixed, viewport-bottom seamless teaser present from first paint. */
  teaser: '[data-sneak="teaser"]',
  /** Inner content groups that fan in on the rise (sidebar, strip, cards). */
  reveal: '[data-sneak="reveal"]',
} as const;

/**
 * Build the SneakPeek scene onto `tl`.
 *
 * Selectors are auto-scoped to the section root by `useScrollScene`. The fixed
 * teaser is `position:fixed`, so it is visually pinned to the viewport but still
 * lives in this section's DOM subtree, so the scoped selector still resolves it.
 * We tween its `autoAlpha` so it fades exactly as the panel arrives.
 */
export const buildSneakPeekScene: SceneBuilder = (tl, ctx) => {
  const { reducedMotion } = ctx;

  // --- The panel rise (0 -> ~0.7). Parked low + slightly shrunk, settles to its
  // resting frame. ease:"none" keeps it 1:1 with the scrub for a controlled lift.
  tl.fromTo(
    SNEAK.panel,
    { yPercent: 12, scale: 0.975, transformOrigin: "center top" },
    { yPercent: 0, scale: 1, ease: "none", duration: 0.7 },
    0,
  );

  // --- Inner content fans in as the panel arrives (0.18 -> ~0.7). A staggered
  // fade+rise so the sidebar, step strip and format cards resolve like a screen
  // painting in. Discrete (eased) so each snaps in.
  tl.from(
    SNEAK.reveal,
    {
      autoAlpha: 0,
      y: 18,
      duration: 0.34,
      stagger: { each: 0.045, from: "start" },
    },
    0.18,
  );

  // --- Fixed-teaser handoff. The fixed teaser is visible from first paint; as the
  // real panel's identical rounded top rises to meet it, the fixed one fades out
  // and becomes non-interactive so only ONE top edge is ever visible (seamless
  // swap). Under reduced motion the hook completes the timeline, so this lands at
  // 0 too.
  tl.to(
    SNEAK.teaser,
    {
      autoAlpha: 0,
      ease: "none",
      duration: 0.2,
      onStart: () => setTeaserInteractive(false),
      onReverseComplete: () => setTeaserInteractive(true),
    },
    0.46,
  );

  // Belt-and-braces for the reduce path: when the hook jumps to progress(1) the
  // tween callbacks still fire, but guard the teaser's interactivity explicitly so
  // a completed timeline never leaves a transparent teaser catching clicks.
  if (reducedMotion) setTeaserInteractive(false);
};

/**
 * Toggle the fixed teaser's pointer capture in lockstep with its opacity, so a
 * faded (autoAlpha 0) teaser never intercepts clicks meant for the panel below.
 * Scoped to the single teaser on the page; no-op if it is absent.
 */
function setTeaserInteractive(interactive: boolean): void {
  const teaser = document.querySelector<HTMLElement>(SNEAK.teaser);
  if (!teaser) return;
  teaser.style.pointerEvents = interactive ? "" : "none";
}

/**
 * Static fallback applied under reduced motion / when the scene is built without
 * scroll binding: park the panel resting + visible and retire the fixed teaser.
 * Kept transform/opacity-only and scoped to the section root.
 */
export function applySneakPeekStaticState(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>(SNEAK.panel);
  if (panel) gsap.set(panel, { yPercent: 0, scale: 1, autoAlpha: 1 });
  root
    .querySelectorAll<HTMLElement>(SNEAK.reveal)
    .forEach((el) => gsap.set(el, { autoAlpha: 1, y: 0 }));
  const teaser = root.querySelector<HTMLElement>(SNEAK.teaser);
  if (teaser) {
    gsap.set(teaser, { autoAlpha: 0 });
    teaser.style.pointerEvents = "none";
  }
}
