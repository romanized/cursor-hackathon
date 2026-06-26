"use client";

import { gsap, EASE_EXPO } from "@/lib/gsap/register";
import {
  fadeUp,
  splitTextReveal,
  stagger,
} from "@/lib/gsap/presets";
import type { SceneBuilder } from "@/hooks/useScrollScene";

/**
 * Pure timeline factory for the CTA section.
 *
 * Returns a `SceneBuilder` to hand to `useScrollScene`. The whole closing beat
 * resolves on scroll-in: the kicker rises, the bold display line reveals
 * per-line through a mask (the signature "render just finished" move), then the
 * hero-mirrored product input + the credits/trust row settle in. No accent
 * motion, no autoplay loop — motivated, scrubbable, mass-driven.
 *
 * SplitText cleanup: the split is created INSIDE the gsap.Context (via
 * `ctx.gsapContext.add`) and an explicit revert is registered as the context's
 * cleanup return, so the DOM rewrite is fully undone on unmount / re-run — no
 * orphaned line wrappers (honors the preset's "caller owns split.revert()" rule).
 */

/** Selectors the section markup must expose; kept here so markup + motion agree. */
export const CTA_SELECTORS = {
  kicker: "[data-cta-kicker]",
  headline: "[data-cta-headline]",
  input: "[data-cta-input]",
  meta: "[data-cta-meta]",
} as const;

/**
 * Resolve the headline element from the scene's scoped selector. `gsap.Context`
 * exposes `selector` as a loosely typed `Function`; we narrow its result to the
 * first `Element` so no `any` leaks and SplitText gets a real node (or `null`).
 */
function resolveHeadline(context: gsap.Context): HTMLElement | null {
  const select = context.selector;
  if (typeof select !== "function") return null;
  const found: unknown = select(CTA_SELECTORS.headline);
  const first =
    Array.isArray(found) || found instanceof NodeList ? found[0] : found;
  return first instanceof HTMLElement ? first : null;
}

export function buildCtaScene(): SceneBuilder {
  return (tl, ctx) => {
    const { reducedMotion, gsapContext } = ctx;
    const headline = resolveHeadline(gsapContext);

    // Kicker (eyebrow + REC badge) lifts in first.
    tl.add(fadeUp(CTA_SELECTORS.kicker, { duration: 0.7 }));

    // Bold display headline: masked per-line reveal. Under reduced motion the
    // hook forces the timeline to progress(1), so the split still lands at rest
    // (final state correct) with no perceptible travel.
    if (headline) {
      gsapContext.add(() => {
        const { timeline: headlineTl, split } = splitTextReveal(headline, {
          stagger: reducedMotion ? 0 : 0.1,
          duration: reducedMotion ? 0.01 : 1,
        });
        tl.add(headlineTl, "-=0.35");
        // Returned cleanup runs on context revert — undoes the DOM rewrite.
        return () => split.revert();
      });
    }

    // The product input field — plain fade-up (translate + opacity only).
    tl.add(fadeUp(CTA_SELECTORS.input, { duration: 1 }), "-=0.55");

    // Credits / free-trial + trust row stagger in last.
    tl.add(
      stagger(`${CTA_SELECTORS.meta} > *`, { duration: 0.6 }, { each: 0.07 }),
      "-=0.5",
    );
  };
}

/** A magnetic pointer setter pair — nudges a target toward the cursor. */
export interface Magnet {
  readonly xTo: gsap.QuickToFunc;
  readonly yTo: gsap.QuickToFunc;
}

/**
 * Magnetic pointer transform for the primary CTA button.
 *
 * Returns `quickTo` setters so the section's pointer handlers (wrapped in
 * `contextSafe`) can nudge the button toward the cursor with the locked ease,
 * then snap back to center on leave. Transform/opacity only — GPU-cheap.
 */
export function createMagnet(target: Element): Magnet {
  const xTo = gsap.quickTo(target, "x", { duration: 0.5, ease: EASE_EXPO });
  const yTo = gsap.quickTo(target, "y", { duration: 0.5, ease: EASE_EXPO });
  return { xTo, yTo };
}
