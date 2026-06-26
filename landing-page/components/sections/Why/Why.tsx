"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils/cn";
import { APP_LOGIN_URL } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import { useScrollScene } from "@/hooks/useScrollScene";
import { Container } from "@/components/ui";

import { buildWhyScene } from "./Why.animation";

/* -------------------------------------------------------------------------- */
/*  Content — the old-way → Hookline contrast (the "why")                     */
/* -------------------------------------------------------------------------- */

interface ContrastRow {
  /** The old, painful way. */
  readonly before: string;
  /** The Hookline way. */
  readonly after: string;
  /** A tiny mono proof tag on the Hookline side. */
  readonly tag: string;
}

const ROWS: readonly ContrastRow[] = [
  {
    before: "Hire a creator, brief them, wait days",
    after: "Paste a product link",
    tag: "one link",
  },
  {
    before: "Shoot, cut, caption, re-export",
    after: "A finished, captioned 9:16 ad",
    tag: "~60 sec",
  },
  {
    before: "$500+ per ad, before you know it works",
    after: "Your first three renders are free",
    tag: "$0 to start",
  },
  {
    before: "Re-shoot the whole thing to test an angle",
    after: "Re-render a new variation instantly",
    tag: "∞ variations",
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Section                                                                    */
/* -------------------------------------------------------------------------- */

export function Why({ id, className }: SectionProps) {
  const scopeRef = useRef<HTMLElement>(null);

  useScrollScene(scopeRef, (tl) => {
    const root = scopeRef.current;
    if (root) buildWhyScene(tl, root);
  });

  return (
    <section
      ref={scopeRef}
      id={id}
      aria-label="Why Hookline"
      className={cn(
        "relative overflow-hidden border-t border-hairline bg-bg py-section",
        className,
      )}
    >
      {/* Soft lime floor glow — keeps the page's single accent alive without a
          second hue, anchored low so it reads as a horizon, not a fill. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(60%_80%_at_50%_120%,rgba(198,242,78,0.07),transparent_70%)]"
      />

      <Container className="relative">
        {/* Header ----------------------------------------------------------- */}
        <div className="mx-auto max-w-3xl text-center">
          <span
            data-reveal
            className="inline-block font-mono text-xs uppercase leading-none tracking-[0.22em] text-muted"
          >
            Why Hookline
          </span>
          <h2
            data-reveal
            className="mt-6 text-balance font-sans text-[clamp(2rem,5vw,4rem)] font-medium leading-[0.98] tracking-tighter text-fg"
          >
            The whole ad shoot,{" "}
            <span className="text-muted">collapsed into one link.</span>
          </h2>
          <p
            data-reveal
            className="mx-auto mt-6 max-w-[54ch] text-pretty font-sans text-base text-muted md:text-lg"
          >
            Everything an agency does over a week, Hookline does in a single pass
            — so you can test ten hooks before they&apos;d finish one.
          </p>
        </div>

        {/* Contrast list ---------------------------------------------------- */}
        <div className="mx-auto mt-14 max-w-4xl md:mt-20">
          {/* Column captions (md+) */}
          <div
            data-reveal
            className="mb-5 hidden grid-cols-[1fr_auto_1fr] items-center gap-6 md:grid"
          >
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted/70">
              The old way
            </span>
            <span aria-hidden className="w-6" />
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-accent/80">
              With Hookline
            </span>
          </div>

          <ul className="flex flex-col gap-3">
            {ROWS.map((row) => (
              <li
                key={row.after}
                data-reveal
                className={cn(
                  "grid items-stretch gap-3 rounded-frame border border-hairline bg-surface/40 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6 md:p-5",
                )}
              >
                {/* Before */}
                <p className="font-sans text-sm leading-snug text-muted line-through decoration-fg/20 md:text-base">
                  {row.before}
                </p>

                {/* Arrow divider */}
                <span
                  aria-hidden
                  className="flex items-center justify-center text-fg/30"
                >
                  {/* down arrow on mobile, right arrow on md+ */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 rotate-90 md:rotate-0"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>

                {/* After */}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-sans text-sm font-medium leading-snug text-fg md:text-base">
                    {row.after}
                  </p>
                  <span className="shrink-0 rounded-pill border border-accent/30 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-accent">
                    {row.tag}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA -------------------------------------------------------------- */}
        <div data-reveal className="mt-14 flex flex-col items-center md:mt-20">
          <a
            href={APP_LOGIN_URL}
            className={cn(
              "inline-flex h-14 select-none items-center justify-center gap-2 rounded-pill px-8",
              "border border-accent/40 bg-surface-2/60 font-sans text-base font-medium text-accent",
              "shadow-[0_0_28px_-10px_rgba(198,242,78,0.45)] transition-all duration-200 ease-[var(--ease-expo)]",
              "hover:border-accent/60 hover:bg-surface-2 hover:shadow-[0_0_32px_-8px_rgba(198,242,78,0.55)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            )}
          >
            Generate my first ad
          </a>
          <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted">
            3 free renders · no card · export 1080×1920
          </p>
        </div>
      </Container>
    </section>
  );
}
