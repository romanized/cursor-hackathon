"use client";

import { useRef } from "react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils/cn";
import { SITE, APP_LOGIN_URL } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import { useScrollScene } from "@/hooks/useScrollScene";
import { Container } from "@/components/ui";

import { buildFooterScene } from "./Footer.animation";

/* -------------------------------------------------------------------------- */
/*  Footer-local content                                                      */
/* -------------------------------------------------------------------------- */

interface SocialLink {
  readonly label: string;
  readonly href: string;
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/* ---- Inline SVG icons (no external media; currentColor inherits text) ----- */

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1-2.59-2.59 2.59 2.59 0 0 1 3.39-2.46V9.7a5.7 5.7 0 0 0-.8-.06A5.68 5.68 0 0 0 4.2 15.3a5.68 5.68 0 0 0 9.74 3.99 5.7 5.7 0 0 0 1.6-3.96V9.01a7.34 7.34 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48Z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x={3} y={3} width={18} height={18} rx={5} />
      <circle cx={12} cy={12} r={4} />
      <circle cx={17.4} cy={6.6} r={1} fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M23.5 6.51a3.02 3.02 0 0 0-2.12-2.14C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.51 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.49 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.49ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z" />
    </svg>
  );
}

const SOCIAL_LINKS: readonly SocialLink[] = [
  { label: "Follow Hookline on X", href: "https://x.com/hookline", Icon: XIcon },
  {
    label: "Follow Hookline on TikTok",
    href: "https://tiktok.com/@hookline",
    Icon: TikTokIcon,
  },
  {
    label: "Follow Hookline on Instagram",
    href: "https://instagram.com/hookline",
    Icon: InstagramIcon,
  },
  {
    label: "Follow Hookline on YouTube",
    href: "https://youtube.com/@hookline",
    Icon: YouTubeIcon,
  },
] as const;

/** Static build stamp — Geist-Mono "render-suite" detailing for authenticity. */
const BUILD_VERSION = "v1.0.0";
const BUILD_REGION = "iad1";

/* -------------------------------------------------------------------------- */
/*  Footer — a render-suite "sign-off", not a corporate link farm.            */
/* -------------------------------------------------------------------------- */

export function Footer({ id, className }: SectionProps) {
  const scopeRef = useRef<HTMLElement>(null);
  const year = 2026;

  useScrollScene(scopeRef, (tl) => {
    const root = scopeRef.current;
    if (root) buildFooterScene(tl, root);
  });

  return (
    <footer
      ref={scopeRef}
      id={id}
      aria-label="Site footer"
      className={cn(
        "relative overflow-hidden border-t border-hairline bg-bg pt-section pb-12",
        className,
      )}
    >
      {/* Oversized wordmark watermark bleeding off the bottom — the "sign-off". */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-[0.18em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-sans text-[22vw] font-semibold leading-none tracking-tighter text-fg/[0.035]"
      >
        {SITE.name}
      </span>

      <Container className="relative">
        {/* Big closing line + CTA ------------------------------------------ */}
        <div className="flex flex-col items-start gap-10 border-b border-hairline pb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p
              data-reveal
              className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-accent/80"
            >
              Render engine online
            </p>
            <h2
              data-reveal
              className="mt-5 text-balance font-sans text-[clamp(2rem,5vw,3.75rem)] font-medium leading-[0.98] tracking-tighter text-fg"
            >
              Your next viral ad is{" "}
              <span className="text-muted">one link away.</span>
            </h2>
          </div>

          <a
            data-reveal
            href={APP_LOGIN_URL}
            className={cn(
              "inline-flex h-14 shrink-0 select-none items-center justify-center gap-2 rounded-pill px-8",
              "border border-accent/40 bg-surface-2/60 font-sans text-base font-medium text-accent",
              "shadow-[0_0_28px_-10px_rgba(198,242,78,0.45)] transition-all duration-200 ease-[var(--ease-expo)]",
              "hover:border-accent/60 hover:bg-surface-2 hover:shadow-[0_0_32px_-8px_rgba(198,242,78,0.55)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            )}
          >
            Start rendering
          </a>
        </div>

        {/* Baseline: wordmark + status + socials + build ------------------- */}
        <div
          data-reveal
          className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href="#hero"
              className="inline-flex items-baseline gap-1.5 font-sans text-lg font-semibold tracking-tight text-fg"
              aria-label={`${SITE.name} — back to top`}
            >
              {SITE.name}
              <span aria-hidden className="text-accent">
                .
              </span>
            </a>
            <span aria-hidden className="h-3 w-px bg-hairline-strong" />
            <span className="inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(198,242,78,0.5)]"
              />
              All systems operational
            </span>
          </div>

          <ul className="flex items-center gap-2.5">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-pill border border-hairline text-muted",
                    "transition-colors duration-200 ease-[var(--ease-expo)]",
                    "hover:border-hairline-strong hover:text-fg",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-hairline-strong",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Fine print ------------------------------------------------------ */}
        <div
          data-reveal
          className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted/70"
        >
          <span>
            © {year} {SITE.name} Labs
          </span>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <span>
            Build {BUILD_VERSION} · {BUILD_REGION}
          </span>
          <span aria-hidden className="h-3 w-px bg-hairline-strong" />
          <span>{SITE.twitter}</span>
        </div>
      </Container>
    </footer>
  );
}
