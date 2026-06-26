"use client";

import { useRef } from "react";
import { useScrollScene } from "@/hooks/useScrollScene";
import { PIN_DEFAULTS } from "@/lib/gsap/scrollTrigger";
import { Container, Timecode, WindowChrome } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { SectionProps } from "@/types";
import { buildPipelineScene, PIPELINE_CLASS } from "./Pipeline.animation";

/**
 * PIPELINE / "How it works" — the calm, legible mid-page moment.
 *
 * A single thin COBALT spine runs down the section (cobalt is allowed ONLY in
 * this section). As the section pins, a glowing cobalt node travels down the
 * spine and docks into three faux-OS window cards in sequence:
 *   1. a product link pasted into a Geist-Mono input,
 *   2. a storyboard whose frames populate one-by-one as the node passes,
 *   3. a clean vertical-video card "playing" the finished ad.
 * Each card's content resolves exactly as the node arrives (scrub-synced).
 *
 * NO lime here — the locked lime three-use rule lives elsewhere. Only the cobalt
 * spine/node carries colour; everything else is surface + hairline + text.
 */

/** The three pipeline stages — data-driven so markup stays a single map. */
const STEPS = [
  {
    index: "01",
    label: "Paste",
    title: "Drop the product in",
    blurb:
      "A link, a screenshot, or a few notes. Hookm reads the page, pulls the angle, and locks the brief.",
    window: "input — source.url",
  },
  {
    index: "02",
    label: "Storyboard",
    title: "Frames write themselves",
    blurb:
      "Hook, beats, and on-screen captions get cast into a shot list you can read at a glance.",
    window: "storyboard — shots.timeline",
  },
  {
    index: "03",
    label: "Render",
    title: "A ready-to-post ad",
    blurb:
      "Voice, pacing, and captions render to a vertical cut — sized for TikTok and Reels, ready to publish.",
    window: "render — ad_final.mp4",
  },
] as const;

/** Six faux storyboard frames for step 02. Static placeholders, no media. */
const STORYBOARD = [
  { code: "SB-01", note: "Hook" },
  { code: "SB-02", note: "Problem" },
  { code: "SB-03", note: "Reveal" },
  { code: "SB-04", note: "Proof" },
  { code: "SB-05", note: "Use" },
  { code: "SB-06", note: "CTA" },
] as const;

export function Pipeline({ id, className }: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useScrollScene(sectionRef, buildPipelineScene, {
    scrollTrigger: {
      ...PIN_DEFAULTS,
      start: "top top",
      end: "+=260%",
    },
    timeline: { defaults: { ease: "none" } },
  });

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label="How it works"
      className={cn(
        "relative flex min-h-[100dvh] flex-col justify-center overflow-hidden bg-bg py-section",
        className,
      )}
    >
      <Container>
        {/* Section header */}
        <header className="mb-16 flex flex-col gap-4 md:mb-24">
          <Timecode>The pipeline</Timecode>
          <h2 className="max-w-[18ch] font-sans text-4xl font-medium leading-none tracking-tighter text-fg sm:text-5xl md:text-6xl">
            Link in. Ad out.
          </h2>
          <p className="max-w-[60ch] text-balance font-sans text-base leading-relaxed text-muted md:text-lg">
            One straight line from a raw product to a finished hook video. Watch
            it travel — paste, storyboard, render — no studio in between.
          </p>
        </header>

        {/* The spine + the three docked stages */}
        <div className="relative">
          {/* COBALT SPINE — the single continuous rule the node rides down. */}
          <div
            className={cn(
              PIPELINE_CLASS.track,
              "pointer-events-none absolute bottom-0 left-[15px] top-0 w-px md:left-[19px]",
            )}
            aria-hidden="true"
          >
            {/* Unlit base rail (hairline). */}
            <div className="absolute inset-0 bg-hairline-strong" />
            {/* Lit cobalt fill — draws down 1:1 with the node via scaleY. */}
            <div
              className={cn(
                PIPELINE_CLASS.spineFill,
                "absolute inset-0 origin-top scale-y-0 bg-accent-cobalt",
              )}
            />
            {/* Travelling glowing node — descends from top to track bottom. */}
            <div
              className={cn(
                PIPELINE_CLASS.node,
                "absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-pill bg-accent-cobalt",
                "shadow-[0_0_0_4px_rgba(31,108,240,0.18),0_0_20px_4px_rgba(31,108,240,0.5)]",
              )}
            />
          </div>

          {/* Stages */}
          <ol className="flex flex-col gap-16 md:gap-24">
            {STEPS.map((step, i) => (
              <li
                key={step.index}
                className={cn(
                  PIPELINE_CLASS.step,
                  "relative grid grid-cols-[32px_1fr] gap-x-6 gap-y-4 md:grid-cols-[40px_1fr] md:gap-x-10",
                )}
              >
                {/* Dock marker — a static cobalt ring the node docks into. */}
                <div className="relative flex justify-center">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 rounded-pill border border-accent-cobalt bg-bg ring-4 ring-bg"
                    aria-hidden="true"
                  />
                </div>

                {/* Step meta + the faux-OS window for this stage */}
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <Timecode chip>{step.index}</Timecode>
                    <span className="font-mono text-[0.6875rem] uppercase leading-none tracking-[0.18em] text-accent-cobalt">
                      {step.label}
                    </span>
                  </div>
                  <h3 className="mb-2 font-sans text-2xl font-medium leading-tight tracking-tight text-fg md:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mb-7 max-w-[48ch] font-sans text-sm leading-relaxed text-muted md:text-base">
                    {step.blurb}
                  </p>

                  {/* --- Window content per stage --- */}
                  {i === 0 ? <PasteWindow window={step.window} /> : null}
                  {i === 1 ? <StoryboardWindow window={step.window} /> : null}
                  {i === 2 ? <RenderWindow window={step.window} /> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage windows — self-contained, token-styled faux-OS panels.               */
/* -------------------------------------------------------------------------- */

/** Stage 01 — the product link pasted into a mono input. */
function PasteWindow({ window }: { window: string }) {
  return (
    <WindowChrome
      title={window}
      trailing={<Timecode>paste</Timecode>}
      className="max-w-xl"
    >
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
          Product link
        </label>
        <div
          className={cn(
            PIPELINE_CLASS.card1Reveal,
            "gsap-hidden flex items-center gap-3 rounded-pill border border-hairline-strong bg-surface-2 px-4 py-3",
          )}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-accent-cobalt" />
          <span className="truncate font-mono text-sm text-fg">
            https://store.example.com/p/aurora-bottle
          </span>
          <span className="ml-auto h-4 w-px shrink-0 animate-pulse bg-accent-cobalt motion-reduce:animate-none" />
        </div>
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
          Source detected · 1 product · ready
        </span>
      </div>
    </WindowChrome>
  );
}

/** Stage 02 — storyboard frames populating one-by-one as the node passes. */
function StoryboardWindow({ window }: { window: string }) {
  return (
    <WindowChrome
      title={window}
      trailing={<Timecode>6 shots</Timecode>}
      className="max-w-2xl"
    >
      <div className="grid grid-cols-3 gap-3">
        {STORYBOARD.map((frame) => (
          <div
            key={frame.code}
            className={cn(
              PIPELINE_CLASS.storyboardFrame,
              "gsap-hidden relative flex aspect-[9/12] flex-col justify-between overflow-hidden rounded-lg border border-hairline bg-surface-2 p-2",
            )}
          >
            <div className="render-grain pointer-events-none absolute inset-0 opacity-60" />
            <span className="relative font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted">
              {frame.code}
            </span>
            {/* Faux framing guides */}
            <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-hairline-strong" />
            <span className="relative font-mono text-[0.625rem] text-fg">
              {frame.note}
            </span>
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}

/** Stage 03 — the clean vertical-video card "playing" the finished ad. */
function RenderWindow({ window }: { window: string }) {
  return (
    <WindowChrome
      title={window}
      trailing={<Timecode>1080×1920</Timecode>}
      className="max-w-md"
    >
      <div
        className={cn(
          PIPELINE_CLASS.card3Reveal,
          "gsap-hidden flex flex-col gap-3",
        )}
      >
        {/* Vertical ad frame */}
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[15rem] overflow-hidden rounded-2xl border border-hairline-strong bg-surface-2">
          <div className="render-grain pointer-events-none absolute inset-0 opacity-70" />
          {/* Soft gradient "footage" */}
          <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface-2 to-bg" />
          {/* Center subject placeholder */}
          <div className="absolute left-1/2 top-[42%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-hairline-strong bg-surface/60" />
          {/* On-screen caption (UGC hook) */}
          <div className="absolute inset-x-3 bottom-12 rounded-md bg-bg/70 px-3 py-2 text-center backdrop-blur-none">
            <span className="font-sans text-xs font-medium leading-snug text-fg">
              I stopped buying these — here&apos;s why
            </span>
          </div>
          {/* Play affordance */}
          <span className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 border-y-[7px] border-l-[12px] border-y-transparent border-l-fg/80" />
        </div>

        {/* Scrubber row — mono labels + a cobalt progress sweep. */}
        <div className="flex items-center gap-3">
          <Timecode>00:00</Timecode>
          <div className="relative h-px flex-1 bg-hairline-strong">
            <div
              className={cn(
                PIPELINE_CLASS.videoScrub,
                "absolute inset-y-0 left-0 origin-left scale-x-0 bg-accent-cobalt",
              )}
            />
          </div>
          <Timecode>00:21</Timecode>
        </div>
      </div>
    </WindowChrome>
  );
}
