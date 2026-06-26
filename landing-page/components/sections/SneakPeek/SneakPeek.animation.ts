"use client";

import { gsap } from "@/lib/gsap/register";
import type { SceneBuilder } from "@/hooks/useScrollScene";

/**
 * SneakPeek scene — the product-panel rise + the fixed-sliver handoff.
 *
 * Two cooperating pieces, ONE scrubbed timeline (owned by `useScrollScene`):
 *
 *  1) PANEL RISE — as the user scrolls out of the pinned hero into this section,
 *     the dashboard panel lifts from a parked, slightly-shrunk, slightly-dropped
 *     pose (yPercent + scale) into its resting frame while its inner content
 *     (toolbar, storyboard frames, script bars, status chip, feature pills) fans
 *     in on a stagger. Transform/opacity ONLY — no layout props, GPU-cheap.
 *
 *  2) FIXED-SLIVER HANDOFF — a `position:fixed`, viewport-bottom-anchored lip
 *     (the SAME rounded-top treatment the real panel carries — elevated
 *     bg-surface-2, strong hairline + top glow so it ALWAYS reads against the
 *     #050505 canvas) is present from FIRST PAINT, so a clearly-visible peek
 *     pokes above the fold at the bottom of the (pinned) hero with zero
 *     dependency on scroll position. It starts at full autoAlpha (visible on
 *     load); as the real panel rises to meet it, the fixed sliver fades out (and
 *     goes pointer-events-none) so the real panel's identical lip takes its
 *     place — an invisible swap, no double top-lip, no gap, no jump.
 *
 * The scrub trigger is NON-pinned (start 'top bottom', end 'top 30%'), so it adds
 * no pinned length and cannot create a double-scroll against the single hero pin.
 *
 * REDUCED MOTION: `useScrollScene` builds this same timeline then completes it, so
 * the panel lands resting + fully visible and the sliver lands faded — a calm,
 * static panel with no travel. The component additionally renders the sliver as a
 * non-fixed, in-flow lip under reduce so no fixed trickery is needed.
 */

/** Stable DOM hooks the markup exposes (data-sneak="..."). Markup + motion sync. */
export const SNEAK = {
  /** The rising dashboard panel (the transform target for the lift). */
  panel: '[data-sneak="panel"]',
  /** The fixed, viewport-bottom peek lip present from first paint. */
  sliver: '[data-sneak="sliver"]',
  /** Inner content groups that fan in on the rise (storyboard, pills, etc.). */
  reveal: '[data-sneak="reveal"]',
} as const;

/**
 * Build the SneakPeek scene onto `tl`.
 *
 * Selectors are auto-scoped to the section root by `useScrollScene`, EXCEPT the
 * fixed sliver — it is `position:fixed`, so it is portalled visually to the
 * viewport but still lives in this section's DOM subtree, so the scoped selector
 * still resolves it. We tween its `autoAlpha` so it fades exactly as the panel
 * arrives.
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
  // fade+rise so the storyboard frames, script bars, status chip and feature
  // pills resolve like a render finishing. Discrete (eased) so each snaps in.
  tl.from(
    SNEAK.reveal,
    {
      autoAlpha: 0,
      y: 18,
      duration: 0.34,
      stagger: { each: 0.05, from: "start" },
    },
    0.18,
  );

  // --- Fixed-sliver handoff. The fixed lip is visible from first paint; as the
  // real panel's identical lip rises to meet it, the fixed one fades out and
  // becomes non-interactive so only ONE lip is ever visible (invisible swap).
  // Under reduced motion the hook completes the timeline, so this lands at 0 too.
  tl.to(
    SNEAK.sliver,
    {
      autoAlpha: 0,
      ease: "none",
      duration: 0.18,
      onStart: () => setSliverInteractive(false),
      onReverseComplete: () => setSliverInteractive(true),
    },
    0.5,
  );

  // Belt-and-braces for the reduce path: when the hook jumps to progress(1) the
  // tween callbacks still fire, but guard the sliver's interactivity explicitly
  // so a completed timeline never leaves a transparent lip catching clicks.
  if (reducedMotion) setSliverInteractive(false);
};

/**
 * Toggle the fixed sliver's pointer capture in lockstep with its opacity, so a
 * faded (autoAlpha 0) lip never intercepts clicks meant for the panel below.
 * Scoped to the single sliver on the page; no-op if it is absent.
 */
function setSliverInteractive(interactive: boolean): void {
  const sliver = document.querySelector<HTMLElement>(SNEAK.sliver);
  if (!sliver) return;
  sliver.style.pointerEvents = interactive ? "" : "none";
}

/**
 * Static fallback applied under reduced motion / when the scene is built without
 * scroll binding: park the panel resting + visible and retire the fixed sliver.
 * Kept transform/opacity-only and scoped to the section root.
 */
export function applySneakPeekStaticState(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>(SNEAK.panel);
  if (panel) gsap.set(panel, { yPercent: 0, scale: 1, autoAlpha: 1 });
  root
    .querySelectorAll<HTMLElement>(SNEAK.reveal)
    .forEach((el) => gsap.set(el, { autoAlpha: 1, y: 0 }));
  const sliver = root.querySelector<HTMLElement>(SNEAK.sliver);
  if (sliver) {
    gsap.set(sliver, { autoAlpha: 0 });
    sliver.style.pointerEvents = "none";
  }
}
