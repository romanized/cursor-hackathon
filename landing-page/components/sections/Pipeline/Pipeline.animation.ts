import { fadeUp, stagger } from "@/lib/gsap/presets";
import type { SceneBuilder } from "@/hooks/useScrollScene";

/**
 * Pipeline scene — the calm, legible "link in -> ad out" diagram.
 *
 * A single scrubbed timeline. As the section pins, a glowing cobalt NODE travels
 * straight down the 1px cobalt spine; the spine's lit fill draws down 1:1 with
 * it, and each of the three faux-OS window cards resolves exactly as the node
 * arrives at (docks into) it. Nothing autoplays — every beat is bound to scroll.
 *
 * Only transform + opacity are animated. The spine fill uses `transformOrigin:
 * top` + `scaleY`, the node uses `y`, card content uses the shared fade/stagger
 * presets — all GPU-cheap. Heavy work is skipped under reduced motion (the hook
 * builds the same timeline then completes it, so the final docked state shows
 * with no travel).
 *
 * Selectors are auto-scoped to the section ref by `useScrollScene`.
 */

/** Class hooks the component renders; kept here so markup + motion stay in sync. */
export const PIPELINE_CLASS = {
  spineFill: "pipeline-spine-fill",
  node: "pipeline-node",
  track: "pipeline-track",
  step: "pipeline-step",
  card1Reveal: "pipeline-card-1-reveal",
  storyboardFrame: "pipeline-frame",
  card3Reveal: "pipeline-card-3-reveal",
  videoScrub: "pipeline-video-scrub",
} as const;

/**
 * Resolve the vertical distance (px) the node should travel: the spine track's
 * own height. Function-based so GSAP reads it at refresh time (post-layout),
 * keeping the travel correct across breakpoints without manual measurement.
 */
function trackHeight(node: Element): number {
  const track = node.closest(`.${PIPELINE_CLASS.track}`);
  return track instanceof HTMLElement ? track.offsetHeight : 0;
}

export const buildPipelineScene: SceneBuilder = (tl, ctx) => {
  const { reducedMotion } = ctx;

  // The spine fill + node descend together over the full scroll range. ease:none
  // keeps them locked 1:1 to the scrub. Total timeline length is normalized to 1
  // so the card beats below can be placed at clean fractional positions.
  tl.to(
    `.${PIPELINE_CLASS.spineFill}`,
    { scaleY: 1, ease: "none", duration: 1 },
    0,
  );

  if (!reducedMotion) {
    tl.fromTo(
      `.${PIPELINE_CLASS.node}`,
      { y: 0 },
      {
        y: (_i: number, target: Element) => trackHeight(target),
        ease: "none",
        duration: 1,
      },
      0,
    );
  }

  // --- Beat 1: product link docks (≈ node reaches card 1) ---
  tl.add(
    fadeUp(`.${PIPELINE_CLASS.card1Reveal}`, { duration: 0.18, y: 16 }),
    0.06,
  );

  // --- Beat 2: storyboard frames populate one-by-one as the node passes ---
  tl.add(
    stagger(
      `.${PIPELINE_CLASS.storyboardFrame}`,
      { duration: 0.16, y: 14, scale: 0.96, transformOrigin: "center" },
      { each: 0.08, from: "start" },
    ),
    0.4,
  );

  // --- Beat 3: the finished vertical ad resolves + its scrubber sweeps ---
  tl.add(
    fadeUp(`.${PIPELINE_CLASS.card3Reveal}`, { duration: 0.18, y: 16 }),
    0.74,
  );
  tl.fromTo(
    `.${PIPELINE_CLASS.videoScrub}`,
    { scaleX: 0 },
    { scaleX: 1, transformOrigin: "left center", ease: "none", duration: 0.22 },
    0.78,
  );
};
