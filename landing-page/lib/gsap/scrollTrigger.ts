"use client";

// `ScrollTrigger.Vars` is a global ambient namespace type provided by gsap's
// bundled type defs (no import needed); aliasing it keeps the configs typed.
type ScrollTriggerVars = ScrollTrigger.Vars;

/**
 * Shared ScrollTrigger configuration.
 *
 * Centralizes the defaults every scene should inherit so triggers behave
 * consistently and markers can be toggled in one place. Importing from here (vs.
 * hand-writing `start`/`end` per scene) keeps the scroll choreography coherent.
 */

/** Dev-only marker toggle. Tree-shaken to `false` in production builds. */
export const SCROLL_MARKERS = process.env.NODE_ENV === "development";

/**
 * Reveal scenes: discrete entry, played once, slightly inside the viewport.
 * Spread into a `scrollTrigger` config; override `trigger`/`start` per scene.
 */
export const REVEAL_DEFAULTS = {
  start: "top 82%",
  toggleActions: "play none none reverse",
  markers: SCROLL_MARKERS,
} as const satisfies Partial<ScrollTriggerVars>;

/**
 * Scrubbed scenes: animation progress bound to scroll position. `scrub: 1`
 * gives a 1s "catch-up" lag for the heavy, mass-driven feel. Pair with a
 * timeline whose tweens use `ease: "none"` for a true 1:1 scroll mapping.
 */
export const SCRUB_DEFAULTS = {
  start: "top top",
  end: "+=120%",
  scrub: 1,
  markers: SCROLL_MARKERS,
} as const satisfies Partial<ScrollTriggerVars>;

/**
 * Pinned scrub scenes (e.g. the render-pin transformation). Pins the trigger
 * through a long scroll range while a scrubbed timeline plays. Animate CHILDREN,
 * never the pinned element itself.
 */
export const PIN_DEFAULTS = {
  start: "top top",
  end: "+=180%",
  scrub: 1,
  pin: true,
  pinSpacing: true,
  anticipatePin: 1,
  markers: SCROLL_MARKERS,
} as const satisfies Partial<ScrollTriggerVars>;
