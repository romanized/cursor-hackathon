import { blurReveal, stagger } from "@/lib/gsap/presets";
import type { SceneBuilder } from "@/hooks/useScrollScene";

/**
 * Features scene factory.
 *
 * Pure timeline builder consumed by `useScrollScene` — it wires NO ScrollTrigger
 * itself (the hook applies `REVEAL_DEFAULTS` with the section as trigger). The
 * heading resolves into focus with the signature blur-reveal (a small, settling
 * element — safe for blur), then the bento cells fade-up in a staggered cascade.
 *
 * Selectors are scoped to the section ref by the hook. Under reduced motion the
 * hook rebuilds this same timeline and jumps it to its end state, so the final
 * layout is identical with no travel — nothing to branch on here.
 */

/** Class hooks the component applies; kept here so markup + motion stay in sync. */
export const FX = {
  head: "data-fx-head",
  cells: "data-fx-cell",
} as const;

export const buildFeaturesScene: SceneBuilder = (tl) => {
  // Heading block: fade + rise + de-blur as if a render just resolved.
  tl.add(blurReveal(`[${FX.head}]`, { duration: 1 }));

  // Bento cells: staggered fade-up, reading left-to-right / top-to-bottom.
  tl.add(
    stagger(
      `[${FX.cells}]`,
      { duration: 0.85, y: 32 },
      { each: 0.09, from: "start" },
    ),
    "-=0.55",
  );
};
