"use client";

import { useRef } from "react";
import { useScrollScene } from "@/hooks/useScrollScene";
import { PIN_DEFAULTS } from "@/lib/gsap/scrollTrigger";
import { Container, Eyebrow, PhoneFrame, RecBadge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { SECTIONS } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import { buildRenderPinScene, RP } from "./RenderPin.animation";

/**
 * RenderPin — the signature scroll moment.
 *
 * A full-height PINNED section: as the user scrolls, a lime scrub-line sweeps
 * the phone frame and the raw product still cross-dissolves IN STAGES into a
 * finished vertical ad (captions popping on beat, a live REC timecode counting
 * 0:00 -> 0:15, a settle and a "Generated in 38s" chip). Scroll IS the render
 * bar. The motion is motivated: it literally shows raw product -> finished ad.
 *
 * ACCENT LOCK audit — this section uses exactly TWO of the three sanctioned lime
 * uses: (1) the live REC dot (inside <RecBadge>), (2) the active scrub line.
 * Nothing else is lime — the finished-ad placeholder, captions, and the
 * "Generated in 38s" chip all stay on fg/muted/surface tokens. No cobalt here
 * (that is Pipeline-only). No backdrop-blur on the pinned frame (GPU-safe).
 *
 * The animation is owned by `buildRenderPinScene`; `useScrollScene` wires the
 * pin + scrub and, under reduced motion, builds the same timeline then jumps it
 * to the end so the finished ad is shown statically.
 */
export type RenderPinProps = SectionProps;

/** Registry meta for this section (eyebrow / a11y name) — single source. */
const META = SECTIONS.find((s) => s.id === "render-pin");

/** The on-beat captions that pop into the finished ad. */
const CAPTIONS = [
  { text: "POV: you found the", className: "left-5 top-[18%]" },
  { text: "one that actually works", className: "left-5 top-[26%]" },
  { text: "wait for it...", className: "right-5 bottom-[30%] text-right" },
] as const;

export function RenderPin({ id, className }: RenderPinProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useScrollScene(
    rootRef,
    (tl) => {
      const root = rootRef.current;
      if (!root) return;
      // The factory is bound to the section root so its selectors resolve to
      // this instance's layers. `useScrollScene` owns the pin/scrub wiring and,
      // under reduced motion, completes this same timeline to the finished state.
      buildRenderPinScene(root)(tl);
    },
    { scrollTrigger: { ...PIN_DEFAULTS, end: "+=220%" } },
  );

  return (
    <section
      ref={rootRef}
      id={id}
      aria-label={META?.name ?? "Raw to ad"}
      className={cn(
        "relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-bg py-20",
        className,
      )}
    >
      {/* Section header rides above the pinned stage. */}
      <Container className="pointer-events-none mb-10 flex flex-col items-center text-center md:mb-14">
        <Eyebrow index="01">{META?.eyebrow ?? "The transformation"}</Eyebrow>
        <h2 className="mt-5 max-w-[18ch] text-balance font-sans text-[clamp(2.25rem,5vw,4.5rem)] font-medium leading-[0.95] tracking-tighter text-fg">
          Raw product in. Scroll-stopping ad out.
        </h2>
        <p className="mt-5 max-w-[52ch] text-pretty font-sans text-base text-muted md:text-lg">
          Drag the render bar. Watch a flat product still resolve into a finished
          vertical hook — captions, pacing, and grade baked in.
        </p>
      </Container>

      {/* The pinned stage. */}
      <Container className="flex items-center justify-center">
        <div className="relative w-full max-w-[clamp(17rem,30vw,21rem)]">
          {/* Scrubber rail label flanking the frame (mono detailing). */}
          <div className="absolute -left-3 top-0 hidden h-full flex-col justify-between py-6 lg:flex">
            {["00", "05", "10", "15"].map((tick) => (
              <span
                key={tick}
                className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted/60"
              >
                {tick}
              </span>
            ))}
          </div>

          <PhoneFrame
            aria-label="Finished vertical hook ad rendered from a product still"
            screenClassName="render-grain"
          >
            {/* --- LAYER: raw product still (visible at scroll start) --- */}
            <div
              data-render-pin={dataValue(RP.still)}
              className="absolute inset-0 z-10 flex items-center justify-center bg-surface"
            >
              <ProductStill />
              {/* "RAW" stamp so the starting state reads as un-edited source. */}
              <span className="absolute left-4 top-4 font-mono text-[0.625rem] uppercase tracking-[0.25em] text-muted">
                RAW · IMG_4821.HEIC
              </span>
            </div>

            {/* --- LAYER: finished vertical ad (cross-dissolves in) --- */}
            <div
              data-render-pin={dataValue(RP.ad)}
              className="gsap-hidden absolute inset-0 z-20 overflow-hidden bg-bg"
            >
              <FinishedAd />

              {/* Color-grade wash — sells the "finished" look (no accent). */}
              <div
                data-render-pin={dataValue(RP.grade)}
                aria-hidden
                className="gsap-hidden pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35 mix-blend-multiply"
              />

              {/* On-beat captions. */}
              {CAPTIONS.map((caption) => (
                <span
                  key={caption.text}
                  data-render-pin={dataValue(RP.caption)}
                  className={cn(
                    "gsap-hidden absolute z-30 max-w-[70%] font-sans text-lg font-semibold leading-tight tracking-tight text-fg",
                    "[text-shadow:0_2px_18px_rgba(0,0,0,0.7)]",
                    caption.className,
                  )}
                >
                  {caption.text}
                </span>
              ))}

              {/* "Generated in 38s" chip — settles at the end. NOT lime. */}
              <div
                data-render-pin={dataValue(RP.generatedChip)}
                className="gsap-hidden absolute bottom-4 left-1/2 z-40 -translate-x-1/2"
              >
                <span className="inline-flex items-center gap-2 rounded-pill border border-hairline-strong bg-surface-2/90 px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-fg">
                  <CheckGlyph />
                  Generated in 38s
                </span>
              </div>
            </div>

            {/* --- LAYER: REC HUD (lime dot = locked use #1) --- */}
            <div
              data-render-pin={dataValue(RP.hud)}
              className="gsap-hidden pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-4 pt-4"
            >
              <RecBadge label="REC" />
              {/* Live timecode counter, written imperatively by the scene. */}
              <span className="font-mono text-sm uppercase tracking-[0.18em] tabular-nums text-fg">
                <span data-render-pin={dataValue(RP.timecode)}>0:00</span>
                <span className="text-muted"> / 0:15</span>
              </span>
            </div>

            {/* --- LAYER: the lime scrub-line (locked use #2) --- */}
            <div
              data-render-pin={dataValue(RP.scrubLine)}
              aria-hidden
              className="gsap-hidden pointer-events-none absolute inset-y-0 left-0 z-50 w-px bg-accent shadow-[0_0_24px_2px] shadow-accent/50"
            >
              {/* A small playhead nub at the top of the line. */}
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-pill bg-accent" />
            </div>
          </PhoneFrame>

          {/* Render-progress bar beneath the frame (the scroll = this bar). */}
          <div className="mt-5 flex items-center gap-3">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
              Render
            </span>
            <div className="relative h-1 flex-1 overflow-hidden rounded-pill bg-surface-2">
              <div
                data-render-pin={dataValue(RP.progressFill)}
                className="absolute inset-y-0 left-0 w-full origin-left rounded-pill bg-hairline-strong"
              />
            </div>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
              1080×1920
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Strip the `[data-render-pin="..."]` selector down to its raw attribute value
 * so markup and the animation factory share ONE source of truth for the hooks.
 */
function dataValue(selector: string): string {
  const match = selector.match(/="([^"]+)"/);
  return match ? match[1] : selector;
}

/** A clean CSS/SVG "product photo" placeholder — a bottle on a soft pedestal. */
function ProductStill() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Soft studio backdrop gradient. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_30%,#1b1b20_0%,#0e0e10_55%,#070708_100%)]" />
      {/* Pedestal. */}
      <div className="absolute bottom-[26%] h-10 w-32 rounded-[50%] bg-white/[0.04] blur-[2px]" />
      {/* The product silhouette (SVG, no external media). */}
      <svg
        viewBox="0 0 120 220"
        role="img"
        aria-label="Product bottle"
        className="relative h-[58%] w-auto drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <linearGradient id="rp-bottle" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a2a30" />
            <stop offset="45%" stopColor="#3a3a42" />
            <stop offset="100%" stopColor="#16161a" />
          </linearGradient>
        </defs>
        <rect x="46" y="6" width="28" height="22" rx="5" fill="url(#rp-bottle)" />
        <path
          d="M40 30 h40 a14 14 0 0 1 14 14 v150 a14 14 0 0 1 -14 14 h-40 a14 14 0 0 1 -14 -14 v-150 a14 14 0 0 1 14 -14 z"
          fill="url(#rp-bottle)"
        />
        {/* Label band. */}
        <rect x="32" y="96" width="56" height="58" rx="6" fill="#0e0e10" />
        <rect x="40" y="110" width="40" height="5" rx="2.5" fill="#3a3a42" />
        <rect x="40" y="122" width="28" height="4" rx="2" fill="#2a2a30" />
        {/* Specular highlight. */}
        <rect
          x="34"
          y="40"
          width="6"
          height="140"
          rx="3"
          fill="#ffffff"
          opacity="0.06"
        />
      </svg>
    </div>
  );
}

/** The finished vertical ad backdrop — a cinematic CSS scene (no media, no accent). */
function FinishedAd() {
  return (
    <div className="absolute inset-0">
      {/* Graded environment: warmer, contrastier than the flat still. */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_30%_20%,#242227_0%,#121215_55%,#08080a_100%)]" />
      {/* Subject re-staged off-center for a dynamic composition. */}
      <svg
        viewBox="0 0 120 220"
        aria-hidden
        className="absolute bottom-[20%] left-1/2 h-[52%] w-auto -translate-x-[58%] rotate-[-6deg] drop-shadow-[0_24px_50px_rgba(0,0,0,0.7)]"
      >
        <defs>
          <linearGradient id="rp-bottle-ad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3e3e46" />
            <stop offset="50%" stopColor="#4a4a54" />
            <stop offset="100%" stopColor="#1c1c22" />
          </linearGradient>
        </defs>
        <rect x="46" y="6" width="28" height="22" rx="5" fill="url(#rp-bottle-ad)" />
        <path
          d="M40 30 h40 a14 14 0 0 1 14 14 v150 a14 14 0 0 1 -14 14 h-40 a14 14 0 0 1 -14 -14 v-150 a14 14 0 0 1 14 -14 z"
          fill="url(#rp-bottle-ad)"
        />
        <rect x="32" y="96" width="56" height="58" rx="6" fill="#0a0a0c" />
        <rect x="40" y="110" width="40" height="5" rx="2.5" fill="#56565f" />
        <rect x="40" y="122" width="28" height="4" rx="2" fill="#3a3a42" />
      </svg>
      {/* A few bokeh accents (neutral whites — never lime) for production polish. */}
      <span className="absolute right-6 top-[30%] h-16 w-16 rounded-pill bg-white/[0.05] blur-2xl" />
      <span className="absolute left-8 bottom-[22%] h-10 w-10 rounded-pill bg-white/[0.04] blur-xl" />

      {/* Fake right-rail social UI to read as TikTok/Reels (mono/icons, no accent). */}
      <div className="absolute bottom-[28%] right-3 flex flex-col items-center gap-4 text-fg/80">
        <SocialGlyph kind="heart" />
        <SocialGlyph kind="comment" />
        <SocialGlyph kind="share" />
      </div>
    </div>
  );
}

/** Tiny check glyph for the "Generated" chip (currentColor — fg, not lime). */
function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

/** Minimal social-rail glyphs to dress the finished ad (no accent). */
function SocialGlyph({ kind }: { kind: "heart" | "comment" | "share" }) {
  const paths: Record<typeof kind, string> = {
    heart: "M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z",
    comment: "M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z",
    share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
