"use client";

import { gsap, EASE_EXPO } from "@/lib/gsap/register";

/**
 * Footer reveal — a SELF-HEALING fade-up cascade (same fail-safe stance as the Why
 * section: content is visible by default; the hidden pose is armed only at runtime
 * via `data-reveal-armed`, and reduced motion overrides it back to visible — so the
 * footer can never strand itself invisible the way the old `.gsap-hidden` could).
 *
 * The footer anchors the page, so its motion is deliberately calm: one quiet
 * fade-up cascade as it enters, never scrubbed. `useScrollScene` owns the
 * ScrollTrigger + reduced-motion guard; this only fills the timeline.
 */
export function buildFooterScene(tl: GSAPTimeline, root: HTMLElement): void {
  const items = gsap.utils.toArray<HTMLElement>(
    root.querySelectorAll("[data-reveal]"),
  );
  if (items.length === 0) return;

  root.setAttribute("data-reveal-armed", "");

  tl.fromTo(
    items,
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      ease: EASE_EXPO,
      duration: 0.9,
      stagger: 0.08,
      onComplete: () => root.removeAttribute("data-reveal-armed"),
    },
  );
}
