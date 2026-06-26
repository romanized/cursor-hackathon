"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { useScrollScene } from "@/hooks/useScrollScene";
import { Container, Eyebrow, Timecode } from "@/components/ui";
import type { SectionProps } from "@/types";
import { FEATURES, type Feature } from "./data";
import { buildFeaturesScene, FX } from "./Features.animation";

/**
 * FEATURES — "Inside the suite".
 *
 * A bento grid of the generator's capabilities. Exactly one cell per capability
 * (no empty tiles); a 6-column desktop grid where wide anchors span 3 and the
 * rest span 2, resolving to two gapless rows. The heading blur-reveals and the
 * cells fade-up in a staggered cascade on scroll-in (see `Features.animation`).
 *
 * Accent discipline: this section uses NO lime — the locked three-use accent
 * lives only in the REC dot, the active scrub line, and the primary CTA fill.
 * Icons inherit `currentColor` (muted -> fg), never the accent.
 */
export function Features({ id, className }: SectionProps) {
  const scope = useRef<HTMLElement>(null);

  useScrollScene(scope, buildFeaturesScene);

  return (
    <section
      ref={scope}
      id={id}
      aria-label="Features"
      className={cn(
        "relative border-t border-hairline bg-bg py-section",
        className,
      )}
    >
      <Container>
        {/* Heading block — the one element that blur-reveals. */}
        <div
          {...{ [FX.head]: "" }}
          className="gsap-hidden flex max-w-3xl flex-col gap-6"
        >
          <Eyebrow index="04">Inside the suite</Eyebrow>
          <h2 className="text-balance font-sans text-4xl font-medium leading-[1.05] tracking-tighter text-fg sm:text-5xl md:text-6xl">
            Every part of the shoot,
            <span className="text-muted"> handled.</span>
          </h2>
          <p className="max-w-[60ch] text-base leading-relaxed text-muted">
            One brief in, a finished hook ad out. The render room writes the
            script, casts the voice, cuts the captions, and puts your product in
            motion — the whole production stack, collapsed into a single pass.
          </p>
        </div>

        {/* Bento grid — one cell per capability, no empty tiles. */}
        <div className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map((feature, index) => (
            <FeatureCell key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Column-span utility per bento footprint (desktop 6-col grid). */
const SPAN_CLASS: Record<Feature["span"], string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
};

interface FeatureCellProps {
  readonly feature: Feature;
  readonly index: number;
}

function FeatureCell({ feature, index }: FeatureCellProps) {
  const Icon = feature.icon;

  return (
    <article
      {...{ [FX.cells]: "" }}
      className={cn(
        "gsap-hidden group relative flex flex-col gap-5 overflow-hidden",
        "rounded-frame border border-hairline bg-surface p-7",
        "transition-colors duration-300 motion-safe:hover:border-hairline-strong",
        SPAN_CLASS[feature.span],
      )}
    >
      {/* Decorative render grain — CSS only, no media. */}
      <span
        aria-hidden
        className="render-grain pointer-events-none absolute inset-0 opacity-60"
      />

      {/* Top row: icon plate + zero-padded index marker. */}
      <div className="relative flex items-start justify-between">
        <span
          aria-hidden
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl",
            "border border-hairline bg-surface-2 text-muted",
            "transition-colors duration-300 group-hover:text-fg",
          )}
        >
          <Icon className="size-5" />
        </span>
        <Timecode>{String(index + 1).padStart(2, "0")}</Timecode>
      </div>

      {/* Copy block. */}
      <div className="relative flex flex-1 flex-col gap-2.5">
        <h3 className="font-sans text-lg font-medium leading-snug tracking-tight text-fg">
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          {feature.description}
        </p>
      </div>

      {/* Footer: mono spec micro-label. */}
      <div className="relative flex items-center gap-3 border-t border-hairline pt-4">
        <span aria-hidden className="size-1 rounded-pill bg-muted/60" />
        <Timecode>{feature.meta}</Timecode>
      </div>
    </article>
  );
}
