"use client";

import { useEffect, useState, type RefObject } from "react";
import { gsap, useGSAP, EASE_EXPO } from "@/lib/gsap/register";
import { REVEAL_DEFAULTS } from "@/lib/gsap/scrollTrigger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Context object passed to a scene builder so it can branch on motion state. */
export interface SceneContext {
  /** GSAP's auto-cleanup context (selectors scoped to the scene ref). */
  readonly gsapContext: gsap.Context;
  /** Wrap event-handler-fired animations so they're tracked + reverted. */
  readonly contextSafe: <T extends (...args: never[]) => unknown>(fn: T) => T;
  /** `true` when reduced motion is requested (or unknown) — keep it minimal. */
  readonly reducedMotion: boolean;
}

/**
 * A scene builder: receives the scrubbable timeline + scene context and wires up
 * the animation. Compose presets here (e.g. `tl.add(blurReveal(".x"))`).
 */
export type SceneBuilder = (tl: GSAPTimeline, ctx: SceneContext) => void;

export interface UseScrollSceneOptions {
  /**
   * ScrollTrigger config for the scene's timeline. Merged over `REVEAL_DEFAULTS`.
   * If `trigger` is omitted, the scope element is used. Set to `false` to build
   * a timeline with no scroll binding (e.g. a hero load-in).
   */
  scrollTrigger?: ScrollTrigger.Vars | false;
  /** Extra timeline vars (e.g. `paused`, `defaults`). Merged last. */
  timeline?: Omit<gsap.TimelineVars, "scrollTrigger">;
  /** Re-run dependencies forwarded to `useGSAP`. */
  dependencies?: unknown[];
  /**
   * Rebuild the WHOLE scene on every `ScrollTrigger.refresh()` (which fires on
   * window resize by default). Opt-in for scenes whose builder measures the live
   * viewport / element sizes at build time — e.g. the hero reel reads
   * `window.innerWidth/innerHeight` for its per-card vertical clamp and measures
   * headline word widths in px. `invalidateOnRefresh` alone does NOT re-run the
   * builder, so those baked values would otherwise go stale after a resize. When
   * set, a refresh bumps an internal tick fed into `useGSAP`'s deps, so the
   * builder re-executes and re-reads the live viewport. Debounced by ScrollTrigger's
   * own batched refresh, so it costs one rebuild per settle, not per resize event.
   */
  rebuildOnRefresh?: boolean;
}

/**
 * Standardized scroll-scene hook — the one entry point sections use to animate.
 *
 * Wraps `useGSAP` (SSR-safe, auto-cleanup via `gsap.context`) and:
 * - scopes everything to `scopeRef` so preset selectors stay local to the
 *   section (a redesign of one section can't leak into another),
 * - applies `REVEAL_DEFAULTS` to the scene's ScrollTrigger unless overridden,
 *   defaulting `trigger` to the scope element,
 * - guards reduced motion: under reduce it builds the SAME timeline (so final
 *   state is correct) but instantly completes it — no scroll binding, no travel
 *   — by passing `reducedMotion: true` to the builder and `progress(1)`-ing the
 *   timeline. Builders should check `ctx.reducedMotion` to skip heavy work.
 *
 * @param scopeRef ref to the section root element
 * @param builder  fills the provided timeline
 * @param options  ScrollTrigger + timeline configuration
 */
export function useScrollScene(
  scopeRef: RefObject<HTMLElement | null>,
  builder: SceneBuilder,
  options: UseScrollSceneOptions = {},
): void {
  const reducedMotionResolved = useReducedMotion();
  // `null` (unknown) is treated as reduced so we never flash heavy motion before
  // the client confirms the user's preference.
  const reducedMotion = reducedMotionResolved !== false;

  const { scrollTrigger, timeline, dependencies, rebuildOnRefresh } = options;

  // For builders that measure the live viewport at build time (e.g. the hero reel's
  // per-card clamp + headline word widths): bump a tick on a DEBOUNCED window resize
  // so `useGSAP` re-runs the builder and the measurements re-read the current
  // viewport. We key off our OWN resize listener (not ScrollTrigger's refresh) to
  // stay recursion-safe — re-running the builder internally triggers a refresh, so
  // listening to refresh here would loop. The rebuild re-reads `window.*` and
  // re-measures, and `useGSAP`'s revert/recreate refreshes ScrollTrigger for us.
  // No-op unless `rebuildOnRefresh`, and skipped while reduced motion / unbound.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    if (!rebuildOnRefresh || reducedMotion || scrollTrigger === false) return;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      // Settle for 200ms after the last resize event, then rebuild once.
      timer = setTimeout(() => {
        frame = window.requestAnimationFrame(() => setRefreshTick((t) => t + 1));
      }, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [rebuildOnRefresh, reducedMotion, scrollTrigger]);

  useGSAP(
    (context, contextSafe) => {
      const scope = scopeRef.current;
      if (!scope) return;

      // Under reduce: no scroll binding; the timeline is completed immediately
      // below so the section lands in its resolved (visible) state.
      const resolvedScrollTrigger: ScrollTrigger.Vars | undefined =
        reducedMotion || scrollTrigger === false
          ? undefined
          : {
              trigger: scope,
              ...REVEAL_DEFAULTS,
              ...scrollTrigger,
            };

      const tl = gsap.timeline({
        defaults: { ease: EASE_EXPO },
        scrollTrigger: resolvedScrollTrigger,
        ...timeline,
      });

      builder(tl, {
        gsapContext: context,
        contextSafe: contextSafe as SceneContext["contextSafe"],
        reducedMotion,
      });

      if (reducedMotion) {
        // Skip the motion entirely: jump to the end state, no scrubbing.
        tl.progress(1).pause();
      }
    },
    {
      scope: scopeRef,
      // `refreshTick` only changes when `rebuildOnRefresh` is set and a debounced
      // resize fires, so it's inert for every other scene.
      dependencies: [...(dependencies ?? [reducedMotion]), refreshTick],
    },
  );
}
