"use client";

import Image from "next/image";
import { useRef } from "react";
import { useScrollScene } from "@/hooks/useScrollScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SCROLL_MARKERS } from "@/lib/gsap/scrollTrigger";
import { Container, Eyebrow, Timecode } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { SECTIONS } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import {
  applySneakPeekStaticState,
  buildSneakPeekScene,
} from "./SneakPeek.animation";

/**
 * SNEAK-PEEK — "Inside the studio".
 *
 * The section that immediately follows the pinned hero. Its signature is a small
 * but clearly-VISIBLE rounded-top LIP that peeks above the fold at the BOTTOM of
 * the hero viewport FROM PAGE LOAD — before any scroll — hinting at the Hookm
 * studio panel below. As the user scrolls out of the hero, a premium, compact
 * mock of the Hookm DASHBOARD rises and resolves into full view, and the fixed
 * lip hands off to the real panel's identical lip — an invisible swap.
 *
 * THE DASHBOARD (representative, not 1:1) models the product's real 8-step
 * workflow (see context/PROJECT.md): 1 Template, 2 Product/Brief, 3 Script,
 * 4 Images, 5 Voice, 6 Clips, 7 Assemble, 8 Film. It is rendered as a real app
 * frame: a top toolbar (project name + ghost controls), a left STEPPER of the 8
 * steps with one active, a main work area showing the active step in progress
 * (Script + beat-breakdown with real storyboard frame renders), and a right live
 * preview. The active step here is "03 Script" — the most legible single screen
 * — with the downstream steps (Images / Clips / Film) shown queued/rendering so
 * the whole pipeline reads at a glance.
 *
 * PEEK-ON-LOAD mechanism: a `position:fixed`, viewport-bottom-anchored sliver
 * (z-30, below the z-50 nav, above the hero canvas) is rendered as the first
 * child. Because it is fixed to the viewport, it sits at the bottom of whatever
 * is on screen — the pinned hero on load — with NO dependency on scroll position.
 * It carries the EXACT rounded-top lip treatment the real panel carries, so when
 * the panel rises to meet it the swap is seamless. CONTRAST FIX: the lip uses the
 * elevated `bg-surface-2` (#16161A, clearly lighter than the #050505 canvas), a
 * strong top hairline, and a soft top glow so the rounded edge always reads.
 *
 * HANDOFF: the hero is the only pin (`pinSpacing:true`); after it releases, normal
 * scroll resumes exactly at the bottom of the pinned viewport and this section
 * scrolls up into view — no gap, no jump, no double-scroll. This section's reveal
 * is a NON-pinned scrub (start 'top bottom', end 'top 30%'), so it adds no pinned
 * length of its own.
 *
 * ACCENT LOCK: ZERO lime, ZERO cobalt anywhere in this section. Every control,
 * stepper node, status chip and pill is mono on fg/muted/hairline; the ghost
 * "Generate" control is a surface chip (NOT a primary CTA). Cobalt stays
 * Pipeline-only; the lime budget is untouched.
 *
 * REDUCED MOTION / MOBILE: a calm static fork — the panel is fully visible at
 * rest and the fixed sliver is retired (faded + non-interactive), so the demo
 * reads without any fixed/scroll trickery.
 */
export type SneakPeekProps = SectionProps;

/** Registry meta (eyebrow / a11y name) — single source of truth. */
const META = SECTIONS.find((s) => s.id === "sneak-peek");

/**
 * The product's real 8-step workflow (context/PROJECT.md). The dashboard stepper
 * renders all eight; `status` drives the mono node glyph (done · active · queued)
 * so the whole pipeline reads at a glance with one step open in the work area.
 */
const WORKFLOW = [
  { step: "01", label: "Template", status: "done" },
  { step: "02", label: "Product / Brief", status: "done" },
  { step: "03", label: "Script", status: "active" },
  { step: "04", label: "Images", status: "render" },
  { step: "05", label: "Voice", status: "queued" },
  { step: "06", label: "Clips", status: "queued" },
  { step: "07", label: "Assemble", status: "queued" },
  { step: "08", label: "Film", status: "queued" },
] as const;

/**
 * The Script step's beat-breakdown — voiceover line + per-beat visual prompt,
 * each mapped to a real storyboard frame render (poster thumb). This is the
 * heart of the "Script + Images" view the dashboard shows in progress.
 */
const BEATS = [
  {
    beat: "01",
    role: "Hook",
    line: "POV: you found the bottle that does the work for you.",
    poster: "skeleton_1",
    state: "done",
  },
  {
    beat: "02",
    role: "Demo",
    line: "One twist, self-cleans, keeps cold for 24 hours.",
    poster: "simpson_1",
    state: "done",
  },
  {
    beat: "03",
    role: "Proof",
    line: "12,000 people swapped their old bottle this month.",
    poster: "skeleton_2",
    state: "render",
  },
  {
    beat: "04",
    role: "CTA",
    line: "Tap the link before the restock sells out again.",
    poster: "simpson_2",
    state: "queued",
  },
] as const;

/** Brief chips (Step 2 settings) surfaced as context above the script. No accent. */
const BRIEF = [
  "Hook · 20s",
  "Captions on",
  "Gen Z",
  "9:16",
] as const;

export function SneakPeek({ id, className }: SneakPeekProps) {
  const scopeRef = useRef<HTMLElement>(null);
  // `null` (unresolved) is treated as reduced so the fixed-sliver trickery never
  // flashes before the client confirms the user's motion preference.
  const reducedMotion = useReducedMotion() !== false;

  useScrollScene(
    scopeRef,
    (tl, ctx) => {
      const root = scopeRef.current;
      if (!root) return;
      if (ctx.reducedMotion) {
        applySneakPeekStaticState(root);
        return;
      }
      buildSneakPeekScene(tl, ctx);
    },
    {
      // NON-pinned scrub: the reveal is bound to this section entering the
      // viewport. start 'top bottom' = the moment its top edge appears at the
      // bottom of the screen (as the hero pin releases); end 'top 30%' lands the
      // panel resting once its top reaches ~30% down. Adds no pinned length, so
      // the single hero pin stays the only pin (no double-scroll).
      scrollTrigger: reducedMotion
        ? false
        : {
            start: "top bottom",
            end: "top 30%",
            scrub: 1,
            invalidateOnRefresh: true,
            id: "sneak-peek",
            markers: SCROLL_MARKERS,
          },
      dependencies: [reducedMotion],
    },
  );

  return (
    <section
      id={id}
      ref={scopeRef}
      aria-label={META?.name ?? "Inside the studio"}
      className={cn(
        "relative bg-bg pb-[clamp(6rem,12vh,10rem)] pt-[clamp(4rem,9vh,7rem)]",
        className,
      )}
    >
      {/*
        FIXED PEEK SLIVER — the signature. position:fixed, viewport-bottom, z-30
        (below the z-50 nav, above the hero canvas). Present from FIRST PAINT, so a
        clearly-visible rounded-top lip peeks above the fold at the bottom of the
        pinned hero with no scroll dependency. CONTRAST FIX: bg-surface-2 (clearly
        lighter than #050505), a strong top hairline + a soft top glow so the
        rounded edge always reads against the black canvas. Carries the SAME lip
        treatment as the real panel so the rise-to-meet swap is invisible.
        aria-hidden + decorative. On the reduced-motion fork it is hidden (the
        panel shows in flow), and the animation retires it as the panel arrives.
      */}
      <div
        data-sneak="sliver"
        aria-hidden
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-6xl flex-col items-center px-4 sm:px-6",
        )}
      >
        <PanelLip label="HOOKM STUDIO · preview" floating />
      </div>

      <Container>
        {/* Section header rides above the rising panel. */}
        <div className="mb-8 flex flex-col items-center text-center md:mb-12">
          <Eyebrow index="01">{META?.eyebrow ?? "Inside the studio"}</Eyebrow>
          <h2 className="mt-5 max-w-[18ch] text-balance font-sans text-[clamp(2rem,4.5vw,4rem)] font-medium leading-[0.98] tracking-tighter text-fg">
            The render room, before you press go.
          </h2>
          <p className="mt-5 max-w-[52ch] text-pretty font-sans text-base text-muted md:text-lg">
            Paste a product link and Hookm walks the eight-step studio — template,
            brief, script, frames, voice, clips, cut — into one finished hook ad.
          </p>
        </div>

        {/* THE RISING DASHBOARD PANEL — the deliverable demo. */}
        <div
          data-sneak="panel"
          className="relative mx-auto w-full max-w-6xl will-change-transform"
        >
          {/* The panel's OWN top lip — identical to the fixed sliver, so the swap
              is invisible when the panel rises to meet it. */}
          <div className="rounded-t-frame border-x border-t border-hairline-strong bg-surface-2 px-6 pt-3">
            <PanelLip label="HOOKM STUDIO · generate" />
          </div>

          {/* TOP TOOLBAR — traffic-light dots + project name + faux step counter +
              a GHOST Generate control (NOT a primary CTA → no lime). */}
          <div
            data-sneak="reveal"
            className="flex items-center gap-3 border-x border-hairline-strong bg-surface-2 px-5 py-3"
          >
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-pill border border-hairline-strong bg-surface" />
              <span className="h-2.5 w-2.5 rounded-pill border border-hairline-strong bg-surface" />
              <span className="h-2.5 w-2.5 rounded-pill border border-hairline-strong bg-surface" />
            </span>
            <span className="ml-1 hidden h-4 w-px bg-hairline-strong sm:block" />
            <span className="truncate font-sans text-sm font-medium text-fg">
              Aurora Bottle
            </span>
            <span className="truncate font-mono text-[0.625rem] uppercase leading-none tracking-[0.18em] text-muted">
              · Skeleton AI
            </span>
            <span className="ml-auto hidden items-center gap-2 sm:inline-flex">
              <Timecode chip>Step 3 / 8</Timecode>
              <Timecode chip>Autosaved</Timecode>
            </span>
            {/* Ghost/surface chip — explicitly NOT a lime primary CTA. */}
            <span className="ml-auto inline-flex items-center gap-2 rounded-pill border border-hairline-strong bg-surface px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-fg sm:ml-2">
              <PlayGlyph />
              Generate
            </span>
          </div>

          {/* PANEL BODY — sidebar stepper · main work area · live preview. */}
          <div className="grid grid-cols-1 gap-5 rounded-b-frame border border-hairline-strong bg-surface p-5 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.95)] lg:grid-cols-[208px_minmax(0,1fr)_184px] lg:gap-6 lg:p-7">
            {/* LEFT — the 8-step workflow stepper. The product's real pipeline. */}
            <nav
              aria-label="Studio steps"
              className="flex flex-col gap-3"
            >
              <RailLabel>Workflow</RailLabel>
              <ol className="flex flex-col gap-1">
                {WORKFLOW.map((s, i) => (
                  <li key={s.step} data-sneak="reveal">
                    <StepRow
                      index={s.step}
                      label={s.label}
                      status={s.status}
                      last={i === WORKFLOW.length - 1}
                    />
                  </li>
                ))}
              </ol>
            </nav>

            {/* CENTER — the active step (Script) in progress: voiceover script,
                brief context, and the per-beat breakdown with frame renders. */}
            <div className="flex min-w-0 flex-col gap-5">
              {/* Active-step header + brief chips (Step 2 settings). */}
              <div data-sneak="reveal" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
                      Step 03
                    </span>
                    <span className="h-3 w-px bg-hairline-strong" />
                    <h3 className="font-sans text-base font-medium text-fg">
                      Script &amp; beats
                    </h3>
                  </div>
                  <Timecode>Draft v3</Timecode>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {BRIEF.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-2 px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted"
                    >
                      <span className="h-1 w-1 rounded-pill bg-fg/40" />
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Voiceover script card — the spoken line, then mock caption bars. */}
              <div
                data-sneak="reveal"
                className="flex flex-col gap-3 rounded-[0.9rem] border border-hairline bg-surface-2 p-4"
              >
                <div className="flex items-center justify-between">
                  <RailLabel>Voiceover</RailLabel>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted">
                    <WaveGlyph />
                    0:18 runtime
                  </span>
                </div>
                <p className="font-sans text-sm leading-relaxed text-fg/85">
                  &ldquo;Stop overpaying for water bottles that quit by noon — this
                  one keeps ice for a full day, cleans itself, and never leaks in
                  your bag.&rdquo;
                </p>
                <div className="mt-1 flex flex-col gap-2">
                  <ScriptLine width="94%" />
                  <ScriptLine width="78%" />
                  <ScriptLine width="61%" muted />
                </div>
              </div>

              {/* Beat-breakdown — per-beat visual prompt + frame render thumb. The
                  link between Script (3) and Images (4) in the real flow. */}
              <div
                data-sneak="reveal"
                className="flex flex-col gap-3 rounded-[0.9rem] border border-hairline bg-surface-2 p-4"
              >
                <div className="flex items-center justify-between">
                  <RailLabel>Beat breakdown</RailLabel>
                  <span className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted">
                    4 beats
                  </span>
                </div>
                <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {BEATS.map((b) => (
                    <li key={b.beat}>
                      <BeatCard
                        beat={b.beat}
                        role={b.role}
                        line={b.line}
                        poster={b.poster}
                        state={b.state}
                      />
                    </li>
                  ))}
                </ol>
              </div>

              {/* Render-queue status — downstream steps in flight (NO accent). */}
              <div
                data-sneak="reveal"
                className="flex flex-wrap items-center gap-2.5"
              >
                <span className="inline-flex items-center gap-2 rounded-pill border border-hairline-strong bg-surface-2 px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg">
                  <PulseDot />
                  Rendering frames · 3 / 4
                </span>
                <Timecode chip>Voice queued</Timecode>
                <Timecode chip>Est. 38s</Timecode>
              </div>
            </div>

            {/* RIGHT — vertical phone live preview of the assembling film. */}
            <div data-sneak="reveal" className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <RailLabel>Preview</RailLabel>
                <span className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted">
                  08 · Film
                </span>
              </div>
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[1rem] border border-hairline-strong bg-surface-2 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.9)]">
                <Image
                  src="/videos/posters/skeleton_3.jpg"
                  alt="Preview of the generated vertical hook ad"
                  fill
                  sizes="(min-width: 1024px) 184px, 60vw"
                  className="object-cover"
                />
                {/* Rendered-texture grain + a quiet grade so it reads as a render. */}
                <span className="render-grain pointer-events-none absolute inset-0 opacity-60" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
                {/* On-beat caption mock pinned low, like the real export. */}
                <span className="absolute inset-x-3 bottom-7 z-10 text-center font-sans text-[0.6875rem] font-semibold leading-tight text-fg drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                  keeps ice for 24 hours
                </span>
                {/* A neutral scrub hairline (NOT the page's lime scrubber). */}
                <div className="absolute inset-x-3 bottom-3 z-10 h-px bg-hairline">
                  <span className="absolute inset-y-0 left-0 w-[42%] bg-hairline-strong" />
                </div>
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 font-mono text-[0.5rem] uppercase tracking-[0.2em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-pill bg-fg/60" />
                  9:16 · live
                </span>
              </div>
              <span className="font-mono text-[0.5625rem] uppercase leading-relaxed tracking-[0.14em] text-muted">
                Assembling beats 1–4 into the final cut
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * The shared rounded-top lip content: a grab-handle pill + a mono label. Rendered
 * identically inside the fixed sliver AND atop the real panel so the rise-to-meet
 * handoff is an invisible swap.
 *
 * CONTRAST FIX: `floating` (the fixed sliver) wraps the lip in its OWN elevated
 * surface + strong hairline + soft top glow so it always reads against #050505.
 * The in-panel lip omits the wrapper (the panel already supplies the surface).
 * No accent.
 */
function PanelLip({ label, floating = false }: { label: string; floating?: boolean }) {
  const content = (
    <div className="flex w-full flex-col items-center gap-2">
      <span aria-hidden className="h-1 w-10 rounded-pill bg-fg/40" />
      <span className="font-mono text-[0.625rem] uppercase leading-none tracking-[0.2em] text-fg/70">
        {label}
      </span>
    </div>
  );
  if (!floating) return content;
  return (
    <div className="flex w-full flex-col items-center rounded-t-frame border-x border-t border-hairline-strong bg-surface-2 px-6 pb-3 pt-3 shadow-[0_-24px_60px_-30px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      {content}
    </div>
  );
}

/**
 * A single workflow step in the left stepper: a connected node (done · active ·
 * queued · rendering), the zero-padded index, and the label. Active reads as an
 * elevated, bordered surface row; others stay quiet. No accent — status is
 * carried by mono glyphs + fg-alpha, never lime/cobalt.
 */
function StepRow({
  index,
  label,
  status,
  last,
}: {
  index: string;
  label: string;
  status: string;
  last: boolean;
}) {
  const active = status === "active";
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-[0.7rem] px-2.5 py-2 transition-none",
        active
          ? "border border-hairline-strong bg-surface-2"
          : "border border-transparent",
      )}
    >
      {/* Node + connector spine. */}
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        {!last && (
          <span
            aria-hidden
            className="absolute left-1/2 top-[calc(50%+0.6rem)] h-[calc(100%+0.2rem)] w-px -translate-x-1/2 bg-hairline"
          />
        )}
        <StepNode status={status} />
      </span>
      <span className="flex min-w-0 items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-[0.5625rem] uppercase tracking-[0.16em]",
            active ? "text-fg/70" : "text-muted",
          )}
        >
          {index}
        </span>
        <span
          className={cn(
            "truncate font-sans text-[0.8125rem]",
            active ? "font-medium text-fg" : "text-muted",
          )}
        >
          {label}
        </span>
      </span>
      {status === "render" && (
        <span className="ml-auto shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted">
          •••
        </span>
      )}
    </div>
  );
}

/** The stepper's status node glyph — done (check) · active (ring) · queued (dot). */
function StepNode({ status }: { status: string }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-pill border border-hairline-strong bg-surface-2 text-fg/70">
        <svg viewBox="0 0 12 12" aria-hidden className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.2 5 8.5 9.5 3.5" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-pill border border-fg/50 bg-surface">
        <span className="h-1.5 w-1.5 rounded-pill bg-fg/80" />
      </span>
    );
  }
  if (status === "render") {
    return (
      <span className="relative flex h-5 w-5 items-center justify-center rounded-pill border border-hairline-strong bg-surface">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-pill bg-fg/30" />
        <span className="relative h-1.5 w-1.5 rounded-pill bg-fg/60" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-pill border border-hairline bg-surface">
      <span className="h-1 w-1 rounded-pill bg-muted" />
    </span>
  );
}

/**
 * A single beat card in the breakdown: a real frame-render thumb (poster), the
 * beat role + visual-prompt line, and a tiny render-state badge. Maps the Script
 * step's beats to the Images step's frames. No accent.
 */
function BeatCard({
  beat,
  role,
  line,
  poster,
  state,
}: {
  beat: string;
  role: string;
  line: string;
  poster: string;
  state: string;
}) {
  return (
    <div className="flex gap-3 rounded-[0.7rem] border border-hairline bg-surface p-2.5">
      <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-[0.5rem] border border-hairline bg-surface-2">
        <Image
          src={`/videos/posters/${poster}.jpg`}
          alt=""
          aria-hidden
          fill
          sizes="48px"
          className={cn("object-cover", state === "queued" ? "opacity-40" : "opacity-90")}
        />
        <span className="render-grain pointer-events-none absolute inset-0 opacity-50" />
        {state === "render" && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-1.5 w-1.5 animate-ping rounded-pill bg-fg/70" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted">
            {beat}
          </span>
          <span className="font-sans text-[0.6875rem] font-medium text-fg">
            {role}
          </span>
          <BeatState state={state} />
        </div>
        <p className="line-clamp-2 font-sans text-[0.6875rem] leading-snug text-muted">
          {line}
        </p>
      </div>
    </div>
  );
}

/** A tiny mono render-state tag for a beat — done · rendering · queued. No accent. */
function BeatState({ state }: { state: string }) {
  const label = state === "done" ? "ready" : state === "render" ? "rendering" : "queued";
  return (
    <span className="ml-auto font-mono text-[0.5rem] uppercase tracking-[0.14em] text-muted">
      {label}
    </span>
  );
}

/** A small mono rail label used above each panel column / card. No accent. */
function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.5625rem] uppercase leading-none tracking-[0.22em] text-muted">
      {children}
    </span>
  );
}

/** A mock script "text" bar — fg-alpha, matches the AdCard caption-bar treatment. */
function ScriptLine({ width, muted = false }: { width: string; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("h-2 rounded-pill", muted ? "bg-fg/8" : "bg-fg/15")}
      style={{ width }}
    />
  );
}

/** A quiet pulsing status dot for the render chip — fg-alpha, NEVER lime. */
function PulseDot() {
  return (
    <span className="relative flex h-1.5 w-1.5 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-fg/40" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-pill bg-fg/70" />
    </span>
  );
}

/** Minimal "play" glyph for the ghost Generate chip (currentColor = fg). */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="h-2.5 w-2.5" fill="currentColor">
      <path d="M3 2.2v7.6L9.5 6 3 2.2z" />
    </svg>
  );
}

/** Minimal "waveform" glyph for the voiceover label (currentColor = muted). */
function WaveGlyph() {
  return (
    <svg viewBox="0 0 16 12" aria-hidden className="h-2.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M2 6h0M5 3.5v5M8 1.5v9M11 4v4M14 6h0" />
    </svg>
  );
}
