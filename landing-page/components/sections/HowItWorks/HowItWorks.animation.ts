import { fadeUp, stagger } from "@/lib/gsap/presets";
import type { SceneBuilder } from "@/hooks/useScrollScene";

/**
 * HowItWorks scene — a calm, PLAY-ONCE explainer reveal.
 *
 * NOT pinned, NOT scrubbed: this section inherits `REVEAL_DEFAULTS` from
 * `useScrollScene` (start "top 82%", toggleActions "play none none reverse"), so
 * it simply fades its header, staggers its three step cards in, then draws the
 * decorative connector hairline across once the cards have landed. After the
 * dashboard demo (SneakPeek) this reads as a clean, scannable band rather than a
 * second product demo.
 *
 * Only transform + opacity are animated (the connector uses `scaleX`), so it is
 * GPU-cheap and reduced-motion safe — under reduce, `useScrollScene` builds this
 * same timeline then `progress(1)`s it, landing every card visible with no travel.
 *
 * Selectors are auto-scoped to the section ref by `useScrollScene`.
 */

/** Class hooks the component renders; kept here so markup + motion stay in sync. */
export const HOW_IT_WORKS_CLASS = {
  header: "howitworks-header",
  step: "howitworks-step",
  connector: "howitworks-connector",
} as const;

export const buildHowItWorksScene: SceneBuilder = (tl) => {
  // Header settles first.
  tl.add(fadeUp(`.${HOW_IT_WORKS_CLASS.header}`, { y: 24 }));

  // The three step cards rise in sequence (left -> right).
  tl.add(
    stagger(
      `.${HOW_IT_WORKS_CLASS.step}`,
      { y: 28 },
      { each: 0.12, from: "start" },
    ),
    "-=0.4",
  );

  // The decorative connector hairline draws across once the cards are in. It is
  // a static neutral rail (no node travels it) — a short reveal, not a scrub.
  tl.fromTo(
    `.${HOW_IT_WORKS_CLASS.connector}`,
    { scaleX: 0 },
    {
      scaleX: 1,
      transformOrigin: "left center",
      ease: "none",
      duration: 0.5,
    },
    "-=0.3",
  );
};
