"use client";

import { gsap, SplitText, EASE_EXPO } from "./register";

/**
 * The shared motion vocabulary.
 *
 * Sections do not hand-roll tweens; they compose these builders so the whole
 * site shares one rhythm (the locked `EASE_EXPO` + fade-up + blur-out entry
 * language). Each builder is pure: it creates and returns a tween/timeline and
 * does NOT attach a ScrollTrigger — wiring to scroll is the caller's job (via
 * `useScrollScene` or a section animation factory). This keeps the presets
 * reusable for both scrubbed and play-once scenes.
 *
 * Every builder accepts an optional `vars` escape hatch (merged last) so a
 * section can nudge `duration`/`delay`/`stagger` without forking the preset.
 */

/** Targets accepted by GSAP tweens (selector, element, NodeList, array). */
export type Target = gsap.TweenTarget;

/** A GSAP tween or timeline — the two things presets return. */
export type Animation = GSAPTween | GSAPTimeline;

/** The signed blur (px) used by blur-out reveals. One knob, used everywhere. */
const BLUR_AMOUNT = 8;

/** Standard vertical travel (px) for entry reveals. */
const TRAVEL_Y = 28;

/**
 * Fade + rise. The base entry move: from `y` offset + invisible to resting.
 * Uses `autoAlpha` so the element is also non-interactive while hidden.
 *
 * @example useScrollScene(ref, (tl) => { tl.add(fadeUp(".card")); })
 */
export function fadeUp(
  target: Target,
  vars?: gsap.TweenVars,
): GSAPTween {
  return gsap.from(target, {
    autoAlpha: 0,
    y: TRAVEL_Y,
    duration: 0.9,
    ease: EASE_EXPO,
    ...vars,
  });
}

/**
 * Fade + rise + de-blur. The signature reveal — content resolves into focus as
 * if a render just finished. translate-y + blur(8px) -> 0. Blur is GPU-cheap on
 * a settling element (it animates to 0 and stops), but never run this on a large
 * scrolling/pinned container.
 */
export function blurReveal(
  target: Target,
  vars?: gsap.TweenVars,
): GSAPTween {
  return gsap.from(target, {
    autoAlpha: 0,
    y: TRAVEL_Y,
    filter: `blur(${BLUR_AMOUNT}px)`,
    duration: 1.1,
    ease: EASE_EXPO,
    ...vars,
  });
}

/**
 * Staggered fade-up for a set (cards, list items, badges). `each` controls the
 * per-item offset; `from` controls the propagation origin.
 */
export function stagger(
  targets: Target,
  vars?: gsap.TweenVars,
  options?: { each?: number; from?: gsap.StaggerVars["from"] },
): GSAPTween {
  const { each = 0.08, from = "start" } = options ?? {};
  return gsap.from(targets, {
    autoAlpha: 0,
    y: TRAVEL_Y,
    duration: 0.8,
    ease: EASE_EXPO,
    stagger: { each, from },
    ...vars,
  });
}

/**
 * Scroll-driven parallax. Returns a `fromTo` whose `ease: "none"` keeps it 1:1
 * with scroll — the CALLER must drive it with a scrubbed ScrollTrigger.
 * `distance` is total vertical travel in px (negative = moves up faster).
 */
export function parallax(
  target: Target,
  distance = -120,
  vars?: gsap.TweenVars,
): GSAPTween {
  return gsap.fromTo(
    target,
    { y: 0 },
    { y: distance, ease: "none", ...vars },
  );
}

/** Options for `splitTextReveal`. */
export interface SplitTextRevealOptions {
  /** Per-line stagger in seconds. */
  stagger?: number;
  /** Tween duration per line. */
  duration?: number;
  /** Extra tween vars merged last. */
  vars?: gsap.TweenVars;
}

/** What `splitTextReveal` returns so callers can clean up the SplitText. */
export interface SplitTextRevealResult {
  /** The timeline animating the masked lines up into view. */
  readonly timeline: GSAPTimeline;
  /** The SplitText instance — call `.revert()` on cleanup to restore markup. */
  readonly split: SplitText;
}

/**
 * Per-line headline reveal with pre-paint masking (no FOUC).
 *
 * Splits into lines wrapped in `overflow: clip` masks (`mask: "lines"`), then
 * slides each line up from fully below its mask. Because SplitText sets the
 * lines' start state synchronously and the timeline's `from` applies
 * `immediateRender` in the same tick, the text is masked before paint.
 *
 * IMPORTANT: the caller owns cleanup. Under `useGSAP`/`gsap.context` the context
 * reverts tweens, but the SplitText DOM rewrite must be reverted explicitly —
 * call `result.split.revert()` in the scene cleanup. For custom fonts, create
 * this after `document.fonts.ready` (or pass `autoSplit` upstream) to avoid
 * wrong line breaks.
 */
export function splitTextReveal(
  target: Element,
  options?: SplitTextRevealOptions,
): SplitTextRevealResult {
  const { stagger: each = 0.12, duration = 1, vars } = options ?? {};

  const split = SplitText.create(target, {
    type: "lines",
    mask: "lines",
    linesClass: "split-line",
    autoSplit: false,
  });

  const timeline = gsap.timeline();
  timeline.from(split.lines, {
    yPercent: 110,
    duration,
    ease: EASE_EXPO,
    stagger: each,
    ...vars,
  });

  return { timeline, split };
}
