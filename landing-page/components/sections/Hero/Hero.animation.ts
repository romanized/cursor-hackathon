"use client";

import { gsap } from "@/lib/gsap/register";
import {
  REEL_CARDS,
  TRACK_VW,
  WIDTH_VW,
  VIDEO_RATIO,
  type ReelCardDef,
} from "./Hero.reel";

/**
 * HERO REEL — the horizontal scroll-controlled PAN scene factory.
 *
 * The hero is a pinned, full-viewport canvas. While pinned, ONE scrubbed master
 * timeline (`buildReelScene`), keyed to the pin's 0->1 progress, PANS A WIDE TRACK
 * to the right: the track holds the five video cards spread along its width, so as
 * the scroll runs the cards SWEEP across the viewport (right-to-left through the
 * frame). This sideways, scroll-controlled motion is the site's signature.
 *
 * The same timeline also drives, on the SAME 0->1 progress:
 *  - a gentle per-card depth parallax (nearer cards drift a touch more) + a soft
 *    OPACITY fade-in as each card sweeps into frame (no vertical hop, so the scroll
 *    stays buttery) + a SUBTLE FACING FLIP (the card rests nearly upright with a
 *    seeded left/right tilt, then as it crosses center eases through zero to the
 *    OPPOSITE facing and holds — rotation-only),
 *  - the EVOLVING HEADLINE word-swap (three overflow-clip slab masks that roll the
 *    middle word UPWARD and LAND on the last: "any product" -> "any link" ->
 *    "any idea"), spaced out over GENEROUS progress windows so each reads cleanly,
 *  - the lone lime progress hairline (scaleX 0->1),
 *  - a calm lift handoff at the very end so the canvas clears into SneakPeek.
 *
 * VIDEO PLAYBACK IS NOT HERE. Each card's clip auto-plays a muted loop WHEN IT IS
 * ON-SCREEN and pauses when it leaves, via an IntersectionObserver inside the
 * VideoCard primitive — fully independent of this scroll pan. There is NO
 * currentTime-from-scroll scrubbing anywhere (it was removed by design).
 *
 * The centered TEXT LAYER (eyebrow + headline + subline + CTA) is NOT inside the
 * panning track — it stays fixed in the stage while the cards pan past it. Its
 * on-mount reveal lives in `Hero.tsx` (a play-once timeline, decoupled from
 * scroll), so the entry can never fly by or jank. This timeline only swaps the
 * headline word and, at the very end, lifts the resting block for the handoff.
 *
 * TRANSFORMS / OPACITY / FILTER ONLY (GPU-safe). `ease:"none"` on the pan + slabs
 * keeps the scroll mapping 1:1; the wave-in settles use `EASE_EXPO`.
 */

/** Stable DOM hooks the markup exposes (data-reel="..."). One source of truth. */
export const REEL = {
  pin: '[data-reel="pin"]',
  stage: '[data-reel="stage"]',
  track: '[data-reel="track"]',
  text: '[data-reel="text"]',
  card: '[data-reel="card"]',
  progress: '[data-reel="progress"]',
  /** The two stacked word slabs inside the headline's min-content swap slot. */
  swap: '[data-reel="swap"]',
  /** The min-content swap slot itself — its width tightens to the shown word. */
  swapSlot: '[data-reel="swap-slot"]',
} as const;

/** A timeline-only builder: fills the scrubbed timeline `useScrollScene` owns. */
type TimelineBuilder = (tl: GSAPTimeline) => void;

/** Progress where the end-of-reel lift handoff begins (text + cards clear). */
const LIFT_AT = 0.9;

/**
 * Half-width (in timeline progress) of the per-card FACING-FLIP window. The flip
 * runs over [cross - LEAN_HALF, cross + LEAN_HALF] around the point the card
 * crosses viewport-center, easing the rotation from its resting tilt through zero
 * to the opposite facing. Kept small so the flip is a clean, contained switch (not
 * a slow drift), and stays well inside the pan window [0, LIFT_AT].
 */
const LEAN_HALF = 0.12;

/**
 * Compute the pan distance as an xPercent of the TRACK's own width. The stage
 * clips to 100vw; the track is TRACK_VW wide, so it must travel (TRACK_VW - 100)
 * vw leftward to bring its far end into view. As a percent of its own width that
 * is -(TRACK_VW - 100) / TRACK_VW * 100. Viewport-INDEPENDENT (depends only on the
 * TRACK_VW constant), and the pan uses xPercent of the track's own vw width, so it
 * stays geometrically correct across resizes with no recompute needed.
 */
function panEndXPercent(): number {
  return -((TRACK_VW - 100) / TRACK_VW) * 100;
}

/**
 * Generic per-card vertical clamp (transform-only): keep the FULL frame on-screen
 * on ANY aspect ratio. A card of width WIDTH_VW vw renders
 * `WIDTH_VW * R * scale * AR` vh tall, where AR = innerWidth/innerHeight is read
 * LIVE from the current viewport (so the math tracks the user's real aspect — a
 * 16:9 monitor and a 16:10 MacBook resolve to the same on-screen result). This is
 * read once at BUILD time and baked into the resting yPercent, so to stay correct
 * across resizes the scene must be REBUILT — `Hero.tsx` passes `rebuildOnRefresh`
 * to `useScrollScene`, which re-runs the builder on a debounced resize so this
 * re-reads the live viewport. (`invalidateOnRefresh` alone can't do it — it only
 * re-records existing tween vars, and this is applied via `gsap.set`, not a tween.)
 *
 * If the card's top edge would sit above MIN_TOP_VH or its bottom below
 * (100 - MIN_TOP_VH), we return a yPercent of its OWN height that nudges it back
 * inside the safe band [MIN_TOP_VH, 100 - MIN_TOP_VH] = [7vh, 93vh]. With the
 * bands picked in `Hero.reel.ts` (tops ~28-29, bottoms ~76) and WIDTH_VW = 13, this
 * clamp is a no-op at common ARs (16:10 / 16:9 / 3:2, AR <= ~2.0) and only engages
 * on extreme ultrawide / very short viewports — but when it does, every frame stays
 * comfortably on-screen. Transform-only; baked into the resting yPercent.
 */
const MIN_TOP_VH = 7;
function clampYPercent(def: ReelCardDef): number {
  if (typeof window === "undefined" || window.innerHeight <= 0) return 0;
  const ar = window.innerWidth / window.innerHeight;
  const heightVh = WIDTH_VW * VIDEO_RATIO * def.scale * ar;
  const halfH = heightVh / 2;
  const topEdge = def.topVh - halfH;
  const bottomEdge = def.topVh + halfH;
  const maxBottom = 100 - MIN_TOP_VH;
  if (topEdge < MIN_TOP_VH) {
    return ((MIN_TOP_VH - topEdge) / heightVh) * 100; // shift down
  }
  if (bottomEdge > maxBottom) {
    return ((maxBottom - bottomEdge) / heightVh) * 100; // shift up
  }
  return 0;
}

/**
 * Build the reel scene onto `tl`, scoped to the section `root`.
 *
 * Pure timeline authoring — no rAF, no video listeners (playback is owned by the
 * VideoCard IntersectionObserver). Returns a no-op cleanup so the caller's
 * teardown contract stays uniform with the static path.
 *
 * @param root the Hero section element; all selectors are queried inside it.
 */
export function buildReelScene(
  root: HTMLElement,
): { build: TimelineBuilder; cleanup: () => void } {
  const build: TimelineBuilder = (tl) => {
    const scoped = <T extends HTMLElement>(sel: string): T[] =>
      gsap.utils.toArray<T>(root.querySelectorAll(sel));

    const track = scoped<HTMLElement>(REEL.track)[0];
    const progress = scoped<HTMLElement>(REEL.progress)[0];
    const textLayer = scoped<HTMLElement>(REEL.text)[0];
    const cardEls = scoped<HTMLElement>(REEL.card);
    const byId = new Map<string, ReelCardDef>(REEL_CARDS.map((c) => [c.id, c]));

    // --- THE HORIZONTAL PAN (the signature) --------------------------------
    // The track translates left across the WHOLE timeline (ease "none" = 1:1 with
    // scroll). Everything else is layered on top of this same 0->1 progress. The
    // pan owns [0, LIFT_AT]; the tail is the handoff.
    if (track) {
      const end = panEndXPercent();
      gsap.set(track, { xPercent: 0, transformOrigin: "left center" });
      tl.fromTo(
        track,
        { xPercent: 0 },
        { xPercent: end, ease: "none", duration: LIFT_AT },
        0,
      );
    }

    // --- PER-CARD RESTING STATE + WAVE-IN + DEPTH DRIFT --------------------
    // Progress span the pan covers: bringing viewport-center (50vw) onto a card
    // whose on-track center is `leftVw` happens at progress (leftVw - 50) / span.
    // Shared by the momentum lean and the wave-in below.
    const span = TRACK_VW - 100;

    cardEls.forEach((el) => {
      const def = byId.get(el.dataset.cardId ?? "");
      if (!def) return;
      const clampY = clampYPercent(def);

      // Signed resting tilt from the seeded facing, and the OPPOSITE-facing target
      // the flip lands on. `dir` is +1 for a right-leaning card, -1 for a left one.
      const dir = def.faceRight ? 1 : -1;
      const restRot = dir * def.rotateDeg;
      const flipRot = -dir * def.leanDeg;

      // Progress where this card reaches ~viewport-center (drives the flip + the
      // soft fade-in). leftVw maps to (leftVw - 50) / span, clamped to the pan.
      const enterAt = Math.min(
        Math.max((def.leftVw - 50) / span, 0),
        LIFT_AT - 0.08,
      );
      // Cards already in frame at rest (enterAt ~ 0, e.g. c1) start VISIBLE so they
      // never flash at the very top of the pin; the rest fade in as they arrive.
      const startsVisible = enterAt <= 0.001;

      el.style.willChange = "transform";

      // Resting pose: depth scale + the (straightened, signed) resting tilt, nudged
      // by the vertical clamp. autoAlpha is an opacity-only settle (NOT a yPercent
      // hop, which was the old scroll "bounce"). The facing-flip rotates ON TOP.
      gsap.set(el, {
        scale: def.scale,
        rotation: restRot,
        yPercent: clampY,
        xPercent: 0,
        autoAlpha: startsVisible ? 1 : 0,
        transformOrigin: "center center",
      });

      // FACING FLIP (rotation-only, transform-only): as the card travels leftward
      // and crosses viewport-center (50vw, at progress ~ (leftVw - 50) / span), its
      // rotation eases from the resting tilt THROUGH zero to the OPPOSITE facing
      // (restRot -> flipRot) and HOLDS there for the rest of the pan — the card
      // visibly switches which way it faces, once, cleanly. The single tween spans a
      // symmetric window around center (LEAN_HALF either side); because the master
      // timeline is scrubbed it REVERSES on scroll-up for free. Skipped under reduced
      // motion (that fork rests on the signed tilt only — see `applyReelStaticState`).
      // `immediateRender:false` keeps the resting tilt set above intact until the
      // flip window is reached.
      //
      // Cards whose center never reaches viewport-center during the pan (leftVw < 50,
      // e.g. c1) clamp `cross` to 0; the `cross > 0` guard skips them so they simply
      // hold their resting facing.
      const cross = Math.min(Math.max((def.leftVw - 50) / span, 0), LIFT_AT);
      if (cross > 0) {
        const flipStart = Math.max(cross - LEAN_HALF, 0);
        const flipEnd = Math.min(cross + LEAN_HALF, LIFT_AT);
        tl.fromTo(
          el,
          { rotation: restRot },
          {
            rotation: flipRot,
            ease: "sine.inOut",
            duration: flipEnd - flipStart,
            immediateRender: false,
          },
          flipStart,
        );
      }

      // Depth parallax: a small extra horizontal drift over the pan, signed per
      // card so nearer cards slide a touch differently — depth without breaking
      // the 1:1 feel. Expressed as xPercent of the card's own width.
      const driftPct = (def.driftVw / WIDTH_VW) * 100;
      tl.fromTo(
        el,
        { xPercent: 0 },
        { xPercent: driftPct, ease: "none", duration: LIFT_AT },
        0,
      );

      // Soft arrival: fade the card in (opacity only) as it enters its stretch of
      // the track — the gentle "wave-in" with ZERO vertical hop, so the scroll stays
      // buttery (the old yPercent fromTo snapped +6% in on scrub and read as a jolt).
      // Cards that start visible (c1) skip this; the rest fade up at `enterAt`.
      if (!startsVisible) {
        tl.to(el, { autoAlpha: 1, ease: "none", duration: 0.08 }, enterAt);
      }
    });

    // --- EVOLVING HEADLINE WORD-SWAP (3 words, PROGRESS + LAND, no revert) --
    // The swap slot stacks THREE slabs in a min-content, overflow-clip box and
    // rolls them UPWARD once each — the word advances and SETTLES, never reverting:
    //   slab A "any product"  (visible at rest start, yPercent 0)
    //   slab B "any link"     (parked below, yPercent 100)
    //   slab C "any idea"     (parked below, yPercent 100 — the FINAL word)
    // SWAP 1 (~0.30 -> 0.40): A slides up out / B slides up in -> "any link".
    // SWAP 2 (~0.60 -> 0.70): B slides up out / C slides up in -> "any idea"
    //   (the resolved line: "Turn any idea into a viral ad."). The two swaps are
    //   well separated (a calm ~0.20 progress gap between them) so each word reads
    //   at scroll speed before the next. ease "none" keeps the mapping 1:1; the
    //   slabs only translate vertically inside the clip, so the centered line never
    //   shifts horizontally — the slot's width follows the active word (below).
    const slabs = scoped<HTMLElement>(REEL.swap);
    const slabSlot = scoped<HTMLElement>(REEL.swapSlot)[0];
    const slabA = slabs.find((s) => s.dataset.swap === "a");
    const slabB = slabs.find((s) => s.dataset.swap === "b");
    const slabC = slabs.find((s) => s.dataset.swap === "c");
    if (slabA && slabB && slabC) {
      gsap.set(slabA, { yPercent: 0 });
      gsap.set(slabB, { yPercent: 100 });
      gsap.set(slabC, { yPercent: 100 });

      // Swap 1: A out (up), B in (up into place) -> "any link".
      tl.to(slabA, { yPercent: -100, ease: "none", duration: 0.1 }, 0.3);
      tl.to(slabB, { yPercent: 0, ease: "none", duration: 0.1 }, 0.3);
      // Swap 2: B out (up), C in (up into place) -> "any idea" (final, no revert).
      tl.to(slabB, { yPercent: -100, ease: "none", duration: 0.1 }, 0.6);
      tl.to(slabC, { yPercent: 0, ease: "none", duration: 0.1 }, 0.6);

      // SLOT WIDTH FOLLOW — the only non-transform tween here, and it exists to
      // KILL THE DEAD GAP: the slot is min-content of slab A ("any product"), so
      // when the word swaps the slot would otherwise hold the "any product" width
      // and leave a gap after "Turn". We measure ALL THREE slabs' real rendered
      // widths (responsive — recomputed on every refresh) and tween the slot's
      // explicit width to the ACTIVE word in lockstep with each vertical swap:
      // widthA -> widthB at swap 1, widthB -> widthC at swap 2. The CSS
      // `transition-[width]` on the slot smooths any class-driven reset; this
      // scrubbed tween is what keeps the centered line gap-free as the word changes.
      if (slabSlot) {
        const widthA = Math.ceil(slabA.getBoundingClientRect().width);
        const widthB = Math.ceil(slabB.getBoundingClientRect().width);
        const widthC = Math.ceil(slabC.getBoundingClientRect().width);
        if (widthA > 0 && widthB > 0 && widthC > 0) {
          gsap.set(slabSlot, { width: widthA });
          // Follow to "any link" alongside swap 1.
          tl.to(slabSlot, { width: widthB, ease: "none", duration: 0.1 }, 0.3);
          // Follow to "any idea" (final word) alongside swap 2.
          tl.to(slabSlot, { width: widthC, ease: "none", duration: 0.1 }, 0.6);
        }
      }
    }

    // --- LIME PROGRESS HAIRLINE (locked lime use #2) -----------------------
    if (progress) {
      gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
      tl.to(progress, { scaleX: 1, ease: "none", duration: LIFT_AT }, 0);
      tl.to(progress, { autoAlpha: 0, ease: "none", duration: 0.05 }, LIFT_AT + 0.03);
    }

    // --- LIFT HANDOFF (p LIFT_AT -> 1.0) -----------------------------------
    // Calm dispersal: the resting text block lifts + fades a touch and the cards
    // settle/fade so the canvas clears for SneakPeek. transform/opacity only.
    if (textLayer) {
      tl.to(
        textLayer,
        { yPercent: -6, autoAlpha: 0, ease: "none", duration: 1 - LIFT_AT },
        LIFT_AT,
      );
    }
    cardEls.forEach((el) => {
      const def = byId.get(el.dataset.cardId ?? "");
      if (!def) return;
      tl.to(
        el,
        { autoAlpha: 0, scale: def.scale * 0.98, ease: "none", duration: 1 - LIFT_AT },
        LIFT_AT,
      );
    });

    // Drop will-change once the scrub completes so we don't hold GPU layers idle.
    tl.eventCallback("onComplete", () => {
      cardEls.forEach((el) => {
        el.style.willChange = "auto";
      });
    });
  };

  return { build, cleanup: () => {} };
}

/**
 * REDUCED-MOTION / MOBILE STATIC STATE.
 *
 * No pin, no pan — a calm static layout. The hero text is shown fully resolved at
 * the FINAL word of the swap ("Turn any idea into a viral ad."), and the five cards
 * land in a quiet flow grid (the markup switches them to flow under the same fork).
 *
 * Video: under prefers-reduced-motion every card shows its POSTER only (the
 * VideoCard is rendered WITHOUT `autoPlayInView`, so no loop starts). When motion
 * is merely viewport-gated (touch / small screens, not reduced) the cards keep
 * their in-view autoplay loop, which the IntersectionObserver handles for free —
 * so nothing to start here.
 *
 * @param root  the Hero section element.
 * @returns a no-op cleanup (no rAF / listeners are owned here anymore).
 */
export function applyReelStaticState(root: HTMLElement): () => void {
  const text = root.querySelector<HTMLElement>(REEL.text);
  const track = root.querySelector<HTMLElement>(REEL.track);
  const cards = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(REEL.card));

  if (track) {
    gsap.set(track, { xPercent: 0, clearProps: "transform" });
  }
  if (text) {
    gsap.set(text, {
      autoAlpha: 1,
      yPercent: 0,
      clearProps: "transform",
    });
  }
  // Rest the headline on the FINAL word ("any idea"): slab C visible (yPercent 0),
  // slabs A + B rolled up out of view (yPercent -100), matching the upward swap
  // direction so a reduced-motion / mobile reader lands on the resolved line.
  const slabs = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(REEL.swap));
  slabs.forEach((s) => {
    gsap.set(s, { yPercent: s.dataset.swap === "c" ? 0 : -100 });
  });
  // Pin the slot width to the FINAL word ("any idea") so "Turn" hugs it with no
  // dead gap on this fork. Slab A drives the slot's min-content width, so without
  // an explicit width the slot would keep the wider "any product" size while the
  // visible word is "any idea". Measure slab C live and set it; if unmeasurable
  // (e.g. SSR / hidden), fall back to clearing so the slot relaxes to min-content.
  const slabSlot = root.querySelector<HTMLElement>(REEL.swapSlot);
  if (slabSlot) {
    const slabC = slabs.find((s) => s.dataset.swap === "c");
    const widthC = slabC ? Math.ceil(slabC.getBoundingClientRect().width) : 0;
    if (widthC > 0) {
      gsap.set(slabSlot, { width: widthC });
    } else {
      gsap.set(slabSlot, { clearProps: "width" });
    }
  }

  // Reduced motion / mobile: skip the scrubbed facing flip but KEEP the resting
  // signed tilt (a calm static read, not a flat upright grid). Each card holds its
  // own seeded facing: (faceRight ? +1 : -1) * rotateDeg; unmatched nodes -> 0.
  const byId = new Map<string, ReelCardDef>(REEL_CARDS.map((c) => [c.id, c]));
  cards.forEach((el) => {
    const def = byId.get(el.dataset.cardId ?? "");
    const restRot = def ? (def.faceRight ? 1 : -1) * def.rotateDeg : 0;
    gsap.set(el, {
      autoAlpha: 1,
      scale: 1,
      rotation: restRot,
      xPercent: 0,
      yPercent: 0,
      clearProps: "willChange",
    });
  });

  return () => {};
}
