"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap, useGSAP, EASE_EXPO } from "@/lib/gsap/register";
import { useScrollScene } from "@/hooks/useScrollScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SCROLL_MARKERS } from "@/lib/gsap/scrollTrigger";
import { Button, VideoCard } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { SITE } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import { REEL_CARDS, TRACK_VW, WIDTH_VW, videoSrc, posterSrc } from "./Hero.reel";
import { buildReelScene, applyReelStaticState, REEL } from "./Hero.animation";

/**
 * HERO — the "Reel" showcase, restored to its signature HORIZONTAL PAN.
 *
 * A pinned, full-viewport black canvas. While pinned, the scroll LOCKS the page
 * and PANS A WIDE TRACK to the right: the five example-ad video cards are laid out
 * along that track in a zig-zag ribbon, so they FLOW ACROSS the viewport (sweeping
 * right-to-left through the frame) as you scroll. That sideways, scroll-controlled
 * motion is the site's signature.
 *
 * THREE layers inside the pinned stage:
 *  1) TRACK (panning) — the wide [data-reel="track"] holding the five cards. It is
 *     the only thing that translates with scroll (xPercent). Each card auto-plays a
 *     muted loop while on-screen via an IntersectionObserver in VideoCard (NO
 *     scroll scrubbing of currentTime).
 *  2) TEXT LAYER (fixed) — the centered hero block (eyebrow + the EVOLVING
 *     word-swap headline + subline + CTA). It is NOT inside the track, so it stays
 *     put while the cards pan past. Its entry is a calm play-ONCE mount timeline
 *     (decoupled from scroll), so the beginning reads immediately and never janks;
 *     the scrubbed timeline only swaps the headline word and lifts the block at the
 *     very end for a seamless handoff into SneakPeek.
 *  3) PROGRESS HAIRLINE — the lone lime on the canvas (scaleX 0->1).
 *
 * REDUCED MOTION / MOBILE: a hard fork — no pin, no pan. The hero block is shown
 * fully resolved at its initial wording and the five cards relax into a calm flow
 * grid (posters under reduced motion; in-view autoplay loops on touch). Gated so
 * heavy motion never flashes pre-hydration (null reduced-motion treated as reduced).
 *
 * ACCENT LOCK: lime appears EXACTLY in the hero block's primary CTA ("Generate my
 * first ad") + the single progress hairline. The CTA is now a REFINED lime
 * treatment — a dark button with a lime outline, lime label, and a subtle lime glow
 * rather than a glaring neon fill — so it reads premium while staying the one bold
 * lime moment. The nav carries ZERO lime (its "Start rendering" button is the muted
 * ghost variant). The five video cards carry zero lime, zero cobalt.
 */
export function Hero({ id, className }: SectionProps) {
  const scopeRef = useRef<HTMLElement>(null);
  // Holds the teardown for whichever reel path is active. Set by the scene
  // builder, run on scene revert.
  const reelCleanupRef = useRef<(() => void) | null>(null);

  // `null` (unresolved) is treated as reduced so we never flash heavy motion.
  const reducedMotion = useReducedMotion() !== false;
  // Long pins fight touch scroll on phones — gate the full pan to md+ and fall
  // back to the static flow grid below that breakpoint.
  const isDesktop = useIsDesktop();
  // Until the viewport is measured (`null`), assume static so SSR/first paint is
  // the calm layout, then upgrade to the pan once desktop is confirmed.
  const staticLayout = reducedMotion || isDesktop !== true;

  // --- MOUNT REVEAL (decoupled from scroll) ------------------------------
  // The hero block reveals on load via a play-once timeline with NO scrollTrigger,
  // so scroll speed can never accelerate or jank it. Under reduced motion the
  // block is shown instantly (progress(1)). Runs once on mount.
  useGSAP(
    () => {
      const root = scopeRef.current;
      if (!root) return;
      const items = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-hero-reveal]"),
      );
      if (items.length === 0) return;

      const tl = gsap.timeline({ defaults: { ease: EASE_EXPO } });
      tl.fromTo(
        items,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.08 },
      );
      // Gentle de-blur on the small supporting bits ONLY (eyebrow + subline) —
      // never on the big headline (it must arrive crisp). Selector-scoped.
      const soft = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-hero-soft]"),
      );
      if (soft.length > 0) {
        tl.fromTo(
          soft,
          { filter: "blur(6px)" },
          { filter: "blur(0px)", duration: 0.8, stagger: 0.08 },
          0,
        );
      }

      if (reducedMotion) tl.progress(1).pause();
    },
    { scope: scopeRef, dependencies: [reducedMotion] },
  );

  // --- SCRUBBED REEL (the horizontal pan) ---------------------------------
  useScrollScene(
    scopeRef,
    (tl) => {
      const root = scopeRef.current;
      if (!root) return;
      if (staticLayout) {
        reelCleanupRef.current = applyReelStaticState(root);
        return;
      }
      const { build, cleanup } = buildReelScene(root);
      build(tl);
      reelCleanupRef.current = cleanup;
    },
    {
      scrollTrigger: staticLayout
        ? false
        : {
            trigger: REEL.pin,
            pin: REEL.pin,
            start: "top top",
            // Tightened from +=300% so the horizontal sweep feels snappier — the
            // cards clear in less scroll while staying readable.
            end: "+=200%",
            scrub: 1,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            id: "hero-reel",
            markers: SCROLL_MARKERS,
          },
      dependencies: [staticLayout, reducedMotion],
    },
  );

  // Run + clear the reel teardown when the fork flips or the section unmounts.
  useEffect(() => {
    return () => {
      reelCleanupRef.current?.();
      reelCleanupRef.current = null;
    };
  }, [staticLayout, reducedMotion]);

  return (
    <section
      id={id}
      ref={scopeRef}
      aria-label="Where your shop goes viral"
      className={cn("relative bg-bg", className)}
    >
      <HeroNav />

      {/*
        PIN WRAPPER — the pin target on the pan path. Locked to 100dvh so the
        canvas is exactly one viewport while pinned. On the static path it relaxes
        into normal flow (motion-reduce + max-md) as a tall hero that scrolls.
      */}
      <div
        data-reel="pin"
        className={cn(
          "relative h-[100dvh] overflow-hidden bg-bg",
          "max-md:h-auto max-md:min-h-[100dvh] motion-reduce:h-auto motion-reduce:min-h-[100dvh]",
        )}
      >
        {/* STAGE — clips the panning track + holds the centered text + hairline. */}
        <div
          data-reel="stage"
          className="absolute inset-0 overflow-hidden max-md:static max-md:overflow-visible motion-reduce:static motion-reduce:overflow-visible"
        >
          {/* TRACK — the WIDE band that pans right. Holds the five cards spread
              along its width so they sweep across the viewport. On the static path
              it collapses to a calm flow grid (max-md / motion-reduce). */}
          <div
            data-reel="track"
            className={cn(
              "absolute inset-y-0 left-0 z-10 h-full",
              // Static gallery: a quiet padded grid of all five cards.
              "max-md:static max-md:z-0 max-md:mx-auto max-md:grid max-md:h-auto max-md:max-w-5xl max-md:grid-cols-2 max-md:gap-5 max-md:px-6 max-md:pb-24 max-md:pt-[46vh] sm:max-md:grid-cols-3",
              "motion-reduce:static motion-reduce:z-0 motion-reduce:mx-auto motion-reduce:grid motion-reduce:h-auto motion-reduce:max-w-5xl motion-reduce:grid-cols-2 motion-reduce:gap-5 motion-reduce:px-6 motion-reduce:pb-24 motion-reduce:pt-[46vh] sm:motion-reduce:grid-cols-3",
            )}
            style={{ width: `${TRACK_VW}vw` }}
          >
            {REEL_CARDS.map((card) => (
              <div
                key={card.id}
                data-reel="card"
                data-card-id={card.id}
                className={cn(
                  // Pan path: absolutely placed at its CENTER (left/top in vw/vh)
                  // ALONG THE TRACK, with -translate-x/y-1/2 so left/top ARE the
                  // card center.
                  "absolute -translate-x-1/2 -translate-y-1/2",
                  // Static path: normal grid item, no translate.
                  "max-md:static max-md:translate-x-0 max-md:translate-y-0 motion-reduce:static motion-reduce:translate-x-0 motion-reduce:translate-y-0",
                )}
                style={{
                  left: `${card.leftVw}vw`,
                  top: `${card.topVh}vh`,
                  width: `${WIDTH_VW}vw`,
                }}
              >
                <VideoCard
                  src={videoSrc(card.video)}
                  poster={posterSrc(card.video)}
                  tick={card.tick}
                  preload="metadata"
                  // In-view autoplay loop on the pan/touch paths; poster-only under
                  // reduced motion (no observer, no loop).
                  autoPlayInView={!reducedMotion}
                  className="w-[13vw] max-md:w-full motion-reduce:w-full"
                />
              </div>
            ))}
          </div>

          {/* TEXT LAYER — centered, above the cards (z-20). Stays FIXED in the
              stage while the track pans past it. pointer-events-none so the reel
              reads through it; the CTA row re-enables clicks. */}
          <div
            data-reel="text"
            className={cn(
              "pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6",
              // Static path: pin the block to the top of the section above the grid.
              "max-md:absolute max-md:inset-x-0 max-md:bottom-auto max-md:top-0 max-md:h-[46vh] max-md:items-end max-md:pb-8",
              "motion-reduce:absolute motion-reduce:inset-x-0 motion-reduce:bottom-auto motion-reduce:top-0 motion-reduce:h-[46vh] motion-reduce:items-end motion-reduce:pb-8",
            )}
          >
            <HeroBlock />
          </div>

          {/* LIME PROGRESS HAIRLINE — the only lime on the canvas (locked use #2).
              Hidden on the static path (no pan to track). */}
          <div
            data-reel="progress"
            aria-hidden
            className="absolute inset-x-0 bottom-0 z-30 h-px origin-left scale-x-0 bg-accent max-md:hidden motion-reduce:hidden"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * The composed, centered hero BLOCK: the EVOLVING word-swap headline, a real
 * supporting subline, and the primary/secondary CTA row. Each piece carries
 * `data-hero-reveal` so the mount timeline staggers it in (the eyebrow + subline
 * also carry `data-hero-soft` for the gentle de-blur). The block is the single
 * child of the centered, pointer-events-none text layer; only the CTA row
 * re-enables clicks.
 *
 * On first paint the headline reads its INITIAL state — "Turn any product into a
 * viral ad." — cleanly. As the page scrolls, the scrubbed timeline rolls the
 * middle word through THREE distinct words and LANDS on the last (no revert; see
 * `Hero.animation.ts`): "any product" -> "any link" -> "any idea". The swap word
 * lives in a min-content slot whose width follows the active word so the centered
 * line never shifts horizontally.
 */
function HeroBlock() {
  const scrollToAnchor = useScrollToAnchor();
  return (
    <div className="flex max-w-[52rem] flex-col items-center text-center">
      {/* EYEBROW — mono, uppercase, tracked (de-blurs on mount). */}
      <span
        data-hero-reveal
        data-hero-soft
        className="gsap-hidden font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted"
      >
        AI UGC ad generator
      </span>

      {/* HEADLINE — forced two-line break so the fixed-width swap slot keeps the
          line stable. Line 1: "Turn [swap-word]"; line 2: "into a viral ad."
          Arrives crisp (no blur, ever). */}
      <h1
        data-hero-reveal
        className="gsap-hidden mt-5 font-sans text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[1.06] tracking-[-0.03em] text-fg"
      >
        <span className="block whitespace-nowrap">
          Turn <HeadlineSwap />
        </span>
        <span className="block">into a viral ad.</span>
      </h1>

      {/* SUPPORTING SUBLINE — one line of real copy, muted (de-blurs on mount). */}
      <p
        data-hero-reveal
        data-hero-soft
        className="gsap-hidden mt-6 max-w-[50ch] text-balance font-sans text-base leading-relaxed text-muted sm:text-lg"
      >
        Drop in a product link. Hookm scripts, casts, and renders a post-ready
        TikTok &amp; Reels ad in minutes.
      </p>

      {/* CTA ROW — the only interactive part of the text layer. pointer-events-auto
          re-enables clicks; the primary CTA is the page's one bold lime moment, now
          a REFINED lime-outline + glow treatment (see the className override) rather
          than a neon fill. */}
      <div
        data-hero-reveal
        className="gsap-hidden pointer-events-auto mt-9 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Button
          size="lg"
          variant="primary"
          // REFINED LIME CTA — toned down from the full neon-lime fill to fit Studio
          // Black: a dark button with a lime outline + lime label + a subtle lime
          // glow. Still unmistakably the primary action and the page's one bold lime
          // moment (alongside the progress hairline), just premium instead of glaring.
          // These overrides win over the variant's `bg-accent text-on-accent` via
          // tailwind-merge. Lime (#c6f24e) text on surface-2 (#16161a) keeps strong
          // contrast.
          className="border border-accent/40 bg-surface-2/60 text-accent shadow-[0_0_28px_-10px_rgba(198,242,78,0.45)] transition-all hover:border-accent/60 hover:bg-surface-2 hover:shadow-[0_0_32px_-8px_rgba(198,242,78,0.55)]"
          onClick={() => scrollToAnchor("#cta")}
        >
          Generate my first ad
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={() => scrollToAnchor("#pipeline")}
        >
          See how it works
        </Button>
      </div>
    </div>
  );
}

/**
 * The evolving middle word of the headline — THREE distinct words that PROGRESS
 * and LAND (no revert).
 *
 * A MIN-CONTENT, overflow-clip slot holding three stacked slabs in the SAME grid
 * cell (col-start-1 row-start-1):
 *   - slab A ("any product") visible at rest START (the initial wording),
 *   - slab B ("any link")     parked below (rises in on swap 1),
 *   - slab C ("any idea")     parked below (rises in on swap 2 — the FINAL word).
 * The scrubbed hero timeline rolls the slabs UPWARD (yPercent) inside the clip to
 * swap the word once each, never back: A -> B -> C. So the line reads
 * "Turn any product into a viral ad." then "...any link..." then settles on
 * "...any idea into a viral ad." Only vertical transform moves the slabs, so the
 * line never letter-spacing / weight scrubs (transform only).
 *
 * NO dead gap: there is NO fixed widest-word sizer. The slot itself is `w-max`
 * (fit/min-content) so "Turn" hugs the CURRENT word with no empty space. Slab A is
 * the lone IN-FLOW slab — it drives the slot's intrinsic START width — while slabs
 * B + C are absolutely positioned so a parked word never inflates the slot. As the
 * word swaps, the scrubbed timeline tweens the slot's EXPLICIT width to each active
 * word's measured width (all three measured live, recomputed on refresh — see
 * `Hero.animation.ts`) so the centered line gently re-tightens with no horizontal
 * jump; the `transition-[width]` keeps the static/reduced path (which rests on the
 * FINAL word) and any width reset buttery. The whole h1 is centered, so resizing
 * the slot just keeps "Turn" hugging the word and the line stays centered.
 */
function HeadlineSwap() {
  return (
    <span
      data-reel="swap-slot"
      className="relative inline-grid w-max overflow-hidden align-bottom text-fg transition-[width] duration-500 ease-[var(--ease-expo)]"
    >
      {/* Slab A — "any product" (visible at rest start). The ONLY in-flow slab, so
          it sizes the min-content slot; "Turn" hugs it with no dead gap. */}
      <span
        data-reel="swap"
        data-swap="a"
        className="col-start-1 row-start-1 whitespace-nowrap"
      >
        any product
      </span>
      {/* Slab B — "any link" (parked below; rises in on swap 1). Absolutely
          positioned so the parked word never inflates the slot. */}
      <span
        data-reel="swap"
        data-swap="b"
        aria-hidden
        className="absolute left-0 top-0 col-start-1 row-start-1 whitespace-nowrap"
      >
        any link
      </span>
      {/* Slab C — "any idea" (parked below; rises in on swap 2 — the FINAL,
          resting word). Absolutely positioned so it never inflates the slot. */}
      <span
        data-reel="swap"
        data-swap="c"
        aria-hidden
        className="absolute left-0 top-0 col-start-1 row-start-1 whitespace-nowrap"
      >
        any idea
      </span>
    </span>
  );
}

/**
 * The fixed nav pill — the ONLY surface allowed `backdrop-blur` (perf rule).
 *
 * A polished product navbar: the "Hookm" wordmark on the left (the mono tagline was
 * removed for a cleaner nav), a row of quiet center/right nav links (text-muted ->
 * hover:text-fg), and a MUTED ghost "Start rendering" button on the far right.
 *
 * ACCENT LOCK: the nav carries ZERO lime now. The button is the hairline `ghost`
 * variant (not the lime fill), so the one bold lime moment lives only on the hero
 * block's primary CTA ("Generate my first ad") + the progress hairline. Sits above
 * the pinned canvas (z-50) so the pin never clips it. Anchor links go through Lenis.
 */
const NAV_LINKS = [
  { label: "How it works", href: "#pipeline" },
  { label: "Features", href: "#features" },
  { label: "Render", href: "#render-pin" },
] as const;

function HeroNav() {
  const scrollToAnchor = useScrollToAnchor();
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        aria-label="Primary"
        className="flex w-full max-w-4xl items-center justify-between gap-4 rounded-pill border border-hairline bg-surface/60 py-2 pl-5 pr-2 backdrop-blur-xl"
      >
        {/* Wordmark only — the mono tagline was removed for a cleaner nav. */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            scrollToAnchor("#hero");
          }}
          className="shrink-0 font-sans text-sm font-semibold tracking-tight text-fg"
        >
          {SITE.name}
        </a>

        {/* Center/right nav links — quiet text, hover lifts to fg. Hidden on
            narrow screens where the pill would crowd; the CTA stays. */}
        <ul className="hidden items-center gap-7 font-sans text-sm text-muted md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAnchor(link.href);
                }}
                className="transition-colors duration-200 ease-[var(--ease-expo)] hover:text-fg"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Muted ghost CTA — no lime; the bold lime lives only on the hero CTA. */}
        <Button
          size="md"
          variant="ghost"
          className="shrink-0"
          onClick={() => scrollToAnchor("#cta")}
        >
          Start rendering
        </Button>
      </nav>
    </header>
  );
}

/**
 * `true` once a md+ (>=768px) viewport is confirmed, `false` below it, `null`
 * until measured. Drives the pan-vs-static fork alongside reduced motion.
 */
function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);
  return isDesktop;
}

/**
 * Returns a stable `scrollToAnchor(hash)` callback that smooth-scrolls to an
 * in-page anchor by driving the root Lenis instance imperatively. Falls back to
 * native `scrollIntoView` when Lenis is unavailable (reduced motion / pre-hydration).
 */
function useScrollToAnchor() {
  const lenis = useLenis();
  return useCallback(
    (hash: string) => {
      if (typeof document === "undefined") return;
      const el = document.querySelector(hash);
      if (!el) return;
      if (lenis) {
        lenis.scrollTo(el as HTMLElement);
      } else {
        el.scrollIntoView({ behavior: "smooth" });
      }
    },
    [lenis],
  );
}
