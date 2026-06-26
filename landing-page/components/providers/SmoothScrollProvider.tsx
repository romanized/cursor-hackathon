"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, type LenisRef } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap/register";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Tuned Lenis options. `autoRaf: false` is REQUIRED — we drive Lenis from GSAP's
 * single ticker instead of a second RAF loop. The heavy `lerp`/`duration` and
 * the expo `easing` match the Studio Black "mass-driven" feel.
 */
const LENIS_OPTIONS = {
  autoRaf: false,
  lerp: 0.1,
  duration: 1.1,
  smoothWheel: true,
  // expo-out: fast departure, long settle — mirrors the locked tween ease.
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
} as const;

/**
 * Bridges Lenis smooth scrolling with GSAP ScrollTrigger.
 *
 * Why this shape:
 * - `<ReactLenis root>` makes the window the scroller, so ScrollTrigger needs no
 *   scrollerProxy — it reads native scroll, and we just keep it `update()`d.
 * - ONE RAF loop: `gsap.ticker.add` advances Lenis; `lagSmoothing(0)` stops GSAP
 *   from clamping deltas after a stall (which would desync scrub).
 * - `lenis.on("scroll", ScrollTrigger.update)` keeps triggers in sync every
 *   frame the smoothed position changes.
 * - On App Router soft nav, ScrollTrigger goes stale, so we `refresh()` keyed to
 *   `usePathname()`.
 * - Under reduced motion we DON'T smooth-scroll: Lenis is stopped (native scroll
 *   takes over) and no ticker loop is attached.
 *
 * Must be mounted INSIDE `ReducedMotionProvider`.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  // Drive Lenis from GSAP's ticker + wire ScrollTrigger.update. Re-runs when the
  // reduced-motion decision resolves so we can tear down smoothing under reduce.
  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    // Reduced motion (or still-unknown `null`): keep native scroll, no loop.
    if (reducedMotion !== false) {
      lenis.stop();
      return;
    }

    lenis.start();

    const update = (time: number) => {
      // GSAP ticker time is seconds; Lenis.raf expects milliseconds.
      lenis.raf(time * 1000);
    };

    const onScroll = () => ScrollTrigger.update();

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", onScroll);

    // Layout may have shifted while smoothing was off; recompute trigger bounds.
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(update);
      lenis.off("scroll", onScroll);
    };
  }, [reducedMotion]);

  // App Router soft navigation leaves ScrollTrigger measuring the old DOM.
  // Refresh after the route's content settles.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
