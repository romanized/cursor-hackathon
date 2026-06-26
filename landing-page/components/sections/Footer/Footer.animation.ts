import { gsap, EASE_EXPO } from "@/lib/gsap/register";
import { fadeUp, stagger } from "@/lib/gsap/presets";

/**
 * Footer reveal — a pure timeline factory.
 *
 * The footer anchors the page, so its motion is deliberately calm: a single
 * quiet fade-up cascade as it enters, never scrubbed. The factory only composes
 * presets onto the provided timeline — it attaches NO ScrollTrigger and starts
 * NO RAF loop; `useScrollScene` owns the scroll wiring + reduced-motion guard.
 *
 * Selector contract (scoped to the Footer root by `useScrollScene`):
 *  - `[data-footer-brand]`   the wordmark + tagline block
 *  - `[data-footer-col]`     each nav column (staggered)
 *  - `[data-footer-baseline]` the bottom build line + social row
 */
export function buildFooterScene(tl: GSAPTimeline): void {
  tl.add(fadeUp("[data-footer-brand]", { duration: 1, y: 24 }))
    .add(
      stagger("[data-footer-col]", { duration: 0.8, y: 20 }, { each: 0.07 }),
      "-=0.7",
    )
    .add(
      gsap.from("[data-footer-baseline]", {
        autoAlpha: 0,
        y: 16,
        duration: 0.8,
        ease: EASE_EXPO,
      }),
      "-=0.5",
    );
}
