"use client";

import { useRef } from "react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils/cn";
import { SITE } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import { useScrollScene } from "@/hooks/useScrollScene";
import { Container, Timecode } from "@/components/ui";

import { buildFooterScene } from "./Footer.animation";

/* -------------------------------------------------------------------------- */
/*  Footer-local content                                                      */
/*  Footer-only structure lives here (not in the site-wide registry) so a     */
/*  redesign of this section stays self-contained.                            */
/* -------------------------------------------------------------------------- */

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

interface FooterColumn {
  readonly heading: string;
  readonly links: readonly FooterLink[];
}

const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "The result", href: "#result" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#cta" },
      { label: "Changelog", href: "#cta" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Press kit", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Cookie policy", href: "#" },
      { label: "Content guidelines", href: "#" },
    ],
  },
] as const;

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
  { label: "Follow Hookm on X", href: "https://x.com/hookmai", Icon: XIcon },
  {
    label: "Follow Hookm on TikTok",
    href: "https://tiktok.com/@hookmai",
    Icon: TikTokIcon,
  },
  {
    label: "Follow Hookm on Instagram",
    href: "https://instagram.com/hookmai",
    Icon: InstagramIcon,
  },
  {
    label: "Follow Hookm on YouTube",
    href: "https://youtube.com/@hookmai",
    Icon: YouTubeIcon,
  },
] as const;

/** Static build stamp — Geist-Mono "render-suite" detailing for authenticity. */
const BUILD_VERSION = "v1.0.0";
const BUILD_REGION = "iad1";

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

export function Footer({ id, className }: SectionProps) {
  const scopeRef = useRef<HTMLElement>(null);
  const year = 2026;

  useScrollScene(scopeRef, (tl) => buildFooterScene(tl));

  return (
    <footer
      ref={scopeRef}
      id={id}
      aria-label="Site footer"
      className={cn(
        "relative border-t border-hairline bg-bg pt-20 pb-12 md:pt-28",
        className,
      )}
    >
      <Container>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          {/* Brand block ------------------------------------------------- */}
          <div data-footer-brand className="gsap-hidden max-w-sm">
            <a
              href="#hero"
              className="inline-flex items-baseline gap-2"
              aria-label={`${SITE.name} — back to top`}
            >
              <span className="font-sans text-2xl font-semibold tracking-tight text-fg">
                {SITE.name}
              </span>
              <span
                aria-hidden
                className="h-1.5 w-1.5 translate-y-[-0.1em] rounded-pill bg-fg/30"
              />
            </a>
            <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-muted">
              {SITE.tagline} Drop in a product, get a ready-to-post hook ad —
              scripted, cast, and rendered while you watch.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Timecode chip>{SITE.twitter}</Timecode>
              <Timecode>Render-ready in minutes</Timecode>
            </div>
          </div>

          {/* Nav columns ------------------------------------------------- */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3"
          >
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading} data-footer-col className="gsap-hidden">
                <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted">
                  {column.heading}
                </h2>
                <ul className="mt-5 space-y-3.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-fg/80 transition-colors duration-200 ease-[var(--ease-expo)] hover:text-fg"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Baseline: build line + socials + copyright ------------------- */}
        <div
          data-footer-baseline
          className="gsap-hidden mt-20 flex flex-col gap-6 border-t border-hairline pt-8 md:mt-24 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted">
            <span>
              © {year} {SITE.name} Labs
            </span>
            <span aria-hidden className="h-3 w-px bg-hairline-strong" />
            <span>
              Build {BUILD_VERSION} · {BUILD_REGION}
            </span>
            <span aria-hidden className="h-3 w-px bg-hairline-strong" />
            <span>All systems operational</span>
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
      </Container>
    </footer>
  );
}
