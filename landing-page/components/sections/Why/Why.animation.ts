"use client";

import { gsap, EASE_EXPO } from "@/lib/gsap/register";

/**
 * WHY HOOKLINE — a SELF-HEALING scroll reveal.
 *
 * The old sections hid their content with the CSS class `.gsap-hidden`
 * (`visibility:hidden; opacity:0`) and relied on a tween to un-hide it — so if the
 * ScrollTrigger never fired the content was stranded invisible (the "empty after
 * the dashboard" bug). This builder takes the opposite, fail-safe stance:
 *
 *  - Content is VISIBLE by default in the markup (no hiding class).
 *  - At BUILD time we set `data-reveal-armed` on the section root, which is the ONLY
 *    thing that activates the CSS hidden pose (`[data-reveal-armed] [data-reveal]`
 *    in globals.css). So the hidden pose exists only once JS has run AND only while
 *    armed — and reduced motion overrides it back to visible.
 *  - We then tween each `[data-reveal]` from that pose to its natural state. If the
 *    trigger somehow never completes, `onComplete`/the disarm still leaves content
 *    visible; nothing can permanently hide it.
 *
 * Transforms/opacity only (GPU-safe). Plays once.
 */
export function buildWhyScene(tl: GSAPTimeline, root: HTMLElement): void {
  const items = gsap.utils.toArray<HTMLElement>(
    root.querySelectorAll("[data-reveal]"),
  );
  if (items.length === 0) return;

  // Arm the CSS hidden pose now that JS is running. Removed again on complete so
  // the floor state is always "visible" (belt-and-braces against a stalled scrub).
  root.setAttribute("data-reveal-armed", "");

  tl.fromTo(
    items,
    { autoAlpha: 0, y: 16 },
    {
      autoAlpha: 1,
      y: 0,
      ease: EASE_EXPO,
      duration: 0.85,
      stagger: 0.09,
      onComplete: () => root.removeAttribute("data-reveal-armed"),
    },
  );
}
