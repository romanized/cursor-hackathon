"use client";

import { useRef } from "react";
import { useScrollScene } from "@/hooks/useScrollScene";
import { Container, Eyebrow, Timecode } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { SECTIONS } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import { buildHowItWorksScene, HOW_IT_WORKS_CLASS } from "./HowItWorks.animation";

/**
 * HOW IT WORKS — the short, neutral "link in -> ad out" explainer.
 *
 * A normal flow band (NOT pinned, NOT a scrub): three scannable step cards that
 * reveal once as the section scrolls into view. This EXPLAINS the flow simply,
 * where SneakPeek's dashboard demo SHOWS the real app — so it deliberately drops
 * the faux-OS window panels and keeps each step to a glyph + a line of copy.
 *
 * ACCENT LOCK: spends ZERO accent. The palette is pure Studio Black — bg / surface
 * / hairline / fg / muted with mono detailing. The connector rail is neutral
 * `bg-hairline-strong`, so the locked lime budget is kept entirely for the hero +
 * the Result section, and there is no red here (red is SneakPeek's `.hookm-demo`
 * scope).
 *
 * The reveal is owned by `buildHowItWorksScene`; `useScrollScene` plays it once
 * and, under reduced motion, completes it so every card lands visible.
 */

/** Registry meta for this section (eyebrow / a11y name) — single source. */
const META = SECTIONS.find((s) => s.id === "how-it-works");

/**
 * The three steps. Each renders a small neutral glyph instead of a faux-OS
 * window panel — that level of detail is the dashboard demo's job now.
 */
const STEPS = [
  {
    index: "01",
    label: "Paste",
    title: "Drop the product in",
    blurb:
      "A link, a screenshot, or a few notes. Hookm reads the page, pulls the angle, and locks the brief.",
    glyph: "paste",
  },
  {
    index: "02",
    label: "Storyboard",
    title: "Frames write themselves",
    blurb:
      "Hook, beats, and on-screen captions get cast into a shot list you can read at a glance.",
    glyph: "storyboard",
  },
  {
    index: "03",
    label: "Render",
    title: "A ready-to-post ad",
    blurb:
      "Voice, pacing, and captions render to a vertical cut — sized for TikTok and Reels, ready to publish.",
    glyph: "render",
  },
] as const;

type StepGlyph = (typeof STEPS)[number]["glyph"];

export function HowItWorks({ id, className }: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useScrollScene(sectionRef, buildHowItWorksScene);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={META?.name ?? "How it works"}
      className={cn("relative overflow-hidden bg-bg py-section", className)}
    >
      <Container>
        {/* Section header — Eyebrow idiom (index reflects the new scroll order). */}
        <header
          className={cn(
            HOW_IT_WORKS_CLASS.header,
            "gsap-hidden mb-16 flex flex-col gap-4 md:mb-24",
          )}
        >
          <Eyebrow index="02">{META?.eyebrow ?? "The flow"}</Eyebrow>
          <h2 className="max-w-[18ch] font-sans text-4xl font-medium leading-none tracking-tighter text-fg md:text-6xl">
            Link in. Ad out.
          </h2>
          <p className="max-w-[60ch] text-balance font-sans text-base leading-relaxed text-muted md:text-lg">
            Three steps from a raw product to a finished hook video. No studio, no
            editor, no shoot.
          </p>
        </header>

        {/* Steps — a 3-up grid on md+, stacked on mobile. */}
        <div className="relative">
          {/* Decorative connector rail — a single neutral hairline across the
              three cards on md+. NO node travels it; it draws once on reveal.
              Hidden on mobile where the cards stack. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[16.6%] top-[34px] hidden h-px md:block"
          >
            <div className="absolute inset-0 bg-hairline" />
            <div
              className={cn(
                HOW_IT_WORKS_CLASS.connector,
                "absolute inset-0 origin-left scale-x-0 bg-hairline-strong",
              )}
            />
            {/* Three dock dots seated under each card's number row. */}
            <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-pill border border-hairline-strong bg-bg" />
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-pill border border-hairline-strong bg-bg" />
            <span className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-pill border border-hairline-strong bg-bg" />
          </div>

          <ol className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((step) => (
              <li
                key={step.index}
                className={cn(
                  HOW_IT_WORKS_CLASS.step,
                  "gsap-hidden relative flex flex-col gap-4 rounded-frame border border-hairline bg-surface p-6 md:p-7",
                )}
              >
                {/* Number row — chip index + mono label (label stays muted). */}
                <div className="flex items-baseline gap-3">
                  <Timecode chip>{step.index}</Timecode>
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted">
                    {step.label}
                  </span>
                </div>

                {/* A small neutral glyph for the step (fg/muted + hairline only). */}
                <StepGlyphIcon glyph={step.glyph} />

                <h3 className="font-sans text-2xl font-medium leading-tight tracking-tight text-fg md:text-3xl">
                  {step.title}
                </h3>
                <p className="max-w-[48ch] font-sans text-sm leading-relaxed text-muted md:text-base">
                  {step.blurb}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Step glyphs — neutral line diagrams (currentColor strokes, no accent fill). */
/* -------------------------------------------------------------------------- */

/** Routes a step's glyph key to its small neutral diagram. */
function StepGlyphIcon({ glyph }: { glyph: StepGlyph }) {
  return (
    <div className="flex h-12 items-center text-fg/80" aria-hidden="true">
      {glyph === "paste" ? <PasteGlyph /> : null}
      {glyph === "storyboard" ? <StoryboardGlyph /> : null}
      {glyph === "render" ? <RenderGlyph /> : null}
    </div>
  );
}

/** Step 01 — a link chip with a caret, drawn in hairline/fg (no accent fill). */
function PasteGlyph() {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-pill border border-hairline-strong bg-surface-2 px-3 py-2">
      {/* A small neutral status dot (fg-alpha, never an accent). */}
      <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-fg/40" />
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
        <path d="M15 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
      </svg>
      <span className="font-mono text-[0.6875rem] tracking-tight text-muted">
        source.url
      </span>
      {/* A static caret — neutral hairline. */}
      <span className="h-3.5 w-px shrink-0 bg-hairline-strong" />
    </span>
  );
}

/** Step 02 — a 2x2 mini storyboard grid (hairline frames, fg corner ticks). */
function StoryboardGlyph() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="relative h-5 w-7 rounded-[0.25rem] border border-hairline-strong bg-surface-2"
        >
          <span className="absolute left-1 top-1 h-px w-3 bg-fg/30" />
        </span>
      ))}
    </div>
  );
}

/** Step 03 — a phone outline with a play affordance (currentColor strokes). */
function RenderGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-11 w-11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 5.5h2" />
      {/* Play triangle — filled with currentColor (fg, never accent). */}
      <path d="M10.5 9.5 14.5 12l-4 2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
