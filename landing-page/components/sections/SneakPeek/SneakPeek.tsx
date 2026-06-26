"use client";

import Image from "next/image";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useScrollScene } from "@/hooks/useScrollScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SCROLL_MARKERS } from "@/lib/gsap/scrollTrigger";
import { Container } from "@/components/ui";
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
 * The section that immediately follows the pinned hero. It is a little WINDOW INTO
 * THE REAL HOOKM PRODUCT: a faithful, premium mimic of the dashboard's Step-01
 * "Pick a format" screen. Because it is the product, the panel adopts the REAL
 * dashboard aesthetic — warm near-black (#0a0606) + RED (#ef4444) accent — which
 * is DELIBERATELY different from the landing page's Studio Black + lime. That
 * palette (and the Bricolage / Instrument-Serif type) is scoped to the panel via
 * the `.hookm-demo` wrapper's local CSS vars + arbitrary Tailwind values, so the
 * red NEVER leaks into the landing chrome (hero CTA + progress hairline stay lime;
 * cobalt stays Pipeline-only).
 *
 * Its signature is a seamless rounded panel-top TEASER that peeks above the fold
 * at the BOTTOM of the hero viewport FROM PAGE LOAD — before any scroll. The
 * teaser is the actual rounded top of the dashboard panel emerging from the
 * black: a warm-dark surface, a soft top-edge light hairline so the rounded edge
 * catches light, an ambient red-tinted glow so it "lifts" off the #050505 canvas,
 * and a gradient fade at the very top so it BLENDS rather than presenting a hard
 * bar. As the user scrolls out of the hero, the real dashboard panel rises and the
 * fixed teaser hands off to the panel's identical rounded top — a seamless swap.
 *
 * PEEK-ON-LOAD mechanism: a `position:fixed`, viewport-bottom-anchored teaser
 * (z-30, below the z-50 nav, above the hero canvas) is rendered as the first
 * child. Because it is fixed to the viewport, it sits at the bottom of whatever is
 * on screen — the pinned hero on load — with NO dependency on scroll position.
 *
 * HANDOFF: the hero is the only pin (`pinSpacing:true`); after it releases, normal
 * scroll resumes exactly at the bottom of the pinned viewport and this section
 * scrolls up into view — no gap, no jump, no double-scroll. This section's reveal
 * is a NON-pinned scrub (start 'top bottom', end 'top 30%'), so it adds no pinned
 * length of its own.
 *
 * REDUCED MOTION / MOBILE: a calm static fork — the panel is fully visible at rest
 * and the fixed teaser is retired (faded + non-interactive), so the demo reads
 * without any fixed/scroll trickery.
 */
export type SneakPeekProps = SectionProps;

/** Registry meta (eyebrow / a11y name) — single source of truth. */
const META = SECTIONS.find((s) => s.id === "sneak-peek");

/**
 * Fonts scoped to the demo panel so it reads as the real Hookm app without
 * touching app/layout.tsx. next/font is a build-time transform that works in
 * client components; both faces are exposed as CSS vars wired into `.hookm-demo`.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--hk-font-sans",
  subsets: ["latin"],
  display: "swap",
});
const instrument = Instrument_Serif({
  variable: "--hk-font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
  display: "swap",
});

/**
 * The real dashboard's design tokens (app/globals.css `@theme`), pinned as local
 * CSS vars on the demo wrapper. Using local vars (NOT the landing's `--color-*`)
 * keeps the warm-black + RED palette fully contained to this panel.
 */
const DEMO_VARS = {
  "--hk-bg": "#0a0606",
  "--hk-surface": "#15100f",
  "--hk-surface-elev": "#1c1716",
  "--hk-border": "rgba(255, 255, 255, 0.06)",
  "--hk-border-strong": "rgba(255, 255, 255, 0.12)",
  "--hk-text": "#ededed",
  "--hk-muted": "#8a8584",
  "--hk-faint": "#5a5554",
  "--hk-accent": "#ef4444",
  "--hk-accent-soft": "#f87171",
  "--hk-accent-dim": "#7a1d1d",
  "--hk-glow": "0 24px 80px -20px rgba(239, 68, 68, 0.45)",
  // Radii from the real dashboard tokens (--radius-lg 14px, --radius-xl 22px).
  "--hk-radius-lg": "14px",
  "--hk-radius-xl": "22px",
} as CSSProperties;

/**
 * The product's real 8-step workflow (lib/steps.ts in the dashboard). The step
 * strip renders all eight with 01 Template active (filled RED node); the rest are
 * outlined/muted. Captions match the real strip.
 */
const STEPS = [
  { idx: "01", label: "Template", caption: "Pick a format", state: "active" },
  { idx: "02", label: "Product", caption: "Your brief", state: "idle" },
  { idx: "03", label: "Script", caption: "Hook & beats", state: "idle" },
  { idx: "04", label: "Images", caption: "Frame render", state: "idle" },
  { idx: "05", label: "Voice", caption: "Voiceover render", state: "idle" },
  { idx: "06", label: "Clips", caption: "Motion clips", state: "idle" },
  { idx: "07", label: "Assemble", caption: "Final cut", state: "idle" },
  { idx: "08", label: "Film", caption: "Your footage", state: "idle" },
] as const;

/** Sidebar WORKSPACE group (Create is the primary RED button). */
const WORKSPACE = [
  { label: "Create", primary: true },
  { label: "Library", primary: false },
  { label: "Products", primary: false },
  { label: "Trends", primary: false },
] as const;

/** Sidebar ACCOUNT group. */
const ACCOUNT = ["Account", "Usage and Billing"] as const;

/**
 * The six format cards from the real Step-01 picker. "Skeleton AI" is featured
 * (MOST USED) and pre-SELECTED (red glow border + red play badge + red "Selected"
 * underline). Descriptions echo the dashboard's one-line voice.
 *
 * Each card carries a `templateKey` resolving to /demo/templates/<key>.jpg — the
 * generated preview frame for that format. The image sits behind a subtle grade
 * (object-cover, rounded); when a file is missing the card falls back to the
 * existing red gradient wash (see `FormatCard`).
 */
const FORMATS = [
  {
    name: "Skeleton AI",
    description: "Cinematic skeleton avatars that mouth your hook to camera.",
    overline: "Most used",
    templateKey: "skeleton_ai",
    featured: true,
    selected: true,
  },
  {
    name: "Cartoon",
    description: "Hand-styled 2D characters for a playful, scroll-stopping look.",
    overline: "Format",
    templateKey: "cartoon",
    featured: false,
    selected: false,
  },
  {
    name: "3D CGI",
    description: "Photoreal 3D product renders with studio lighting and motion.",
    overline: "Format",
    templateKey: "cgi_3d",
    featured: false,
    selected: false,
  },
  {
    name: "Animated body part",
    description: "Talking hands and faces that demo the product up close.",
    overline: "Format",
    templateKey: "animated_body_part",
    featured: false,
    selected: false,
  },
  {
    name: "AI Streamer",
    description: "A virtual streamer reacting live to your offer on stream.",
    overline: "Format",
    templateKey: "ai_streamer",
    featured: false,
    selected: false,
  },
  {
    name: "Pibble Dog",
    description: "The viral pibble mascot delivering your line with attitude.",
    overline: "Format",
    templateKey: "pibble_dog",
    featured: false,
    selected: false,
  },
] as const;

export function SneakPeek({ id, className }: SneakPeekProps) {
  const scopeRef = useRef<HTMLElement>(null);
  // `null` (unresolved) is treated as reduced so the fixed-teaser trickery never
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
      // bottom of the screen (as the hero pin releases); end 'top 45%' lands the
      // panel resting once its top reaches ~45% down — a SHORTER scrub range than
      // before (top 30%), so the section reads slightly less tall while keeping
      // the full rise-reveal + handoff. Adds no pinned length, so the single hero
      // pin stays the only pin (no double-scroll).
      scrollTrigger: reducedMotion
        ? false
        : {
            start: "top bottom",
            end: "top 45%",
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
        "relative bg-bg pb-[clamp(4rem,8vh,7rem)] pt-[clamp(2.5rem,6vh,4.5rem)]",
        className,
      )}
    >
      {/*
        FIXED TEASER SLIP — the signature. position:fixed, viewport-bottom, z-30
        (below the z-50 nav, above the hero canvas). Present + fully visible from
        FIRST PAINT (no scroll dependency), so an UNMISTAKABLE rounded window peeks
        above the fold at the bottom of the pinned hero. It is a clearly SEPARATE
        color from the #050505 canvas (the dashboard's warm-dark #15100f surface)
        with a visible RED top edge + red glow + a clear rounded-t-[22px], so it
        plainly reads as "a real window peeking up". The animation retires it (fade
        + non-interactive) as the real panel rises to take its place; the static
        fork hides it entirely. aria-hidden + decorative.
      */}
      <div
        data-sneak="teaser"
        aria-hidden
        style={DEMO_VARS}
        className={cn(
          "hookm-demo pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 sm:px-6",
          bricolage.variable,
          instrument.variable,
        )}
      >
        <TeaserSlip />
      </div>

      <Container>
        {/* Section header rides above the rising panel — landing-page Studio Black
            type/voice (NO red here; red lives only inside the demo panel). No
            numbered eyebrow/kicker chrome — just the headline + supporting copy. */}
        <div className="mb-7 flex flex-col items-center text-center md:mb-10">
          <h2 className="max-w-[18ch] text-balance font-sans text-[clamp(2rem,4.5vw,4rem)] font-medium leading-[0.98] tracking-tighter text-fg">
            A real window into the studio.
          </h2>
          <p className="mt-5 max-w-[52ch] text-pretty font-sans text-base text-muted md:text-lg">
            This is the actual Hookm dashboard. Paste a product link, pick a hook
            format, and the eight-step studio renders a finished ad.
          </p>
        </div>

        {/* THE RISING DASHBOARD PANEL — a faithful mimic of the real app, in the
            real app's warm-black + RED palette, scoped via `.hookm-demo`. */}
        <div
          data-sneak="panel"
          style={DEMO_VARS}
          className={cn(
            "hookm-demo relative mx-auto w-full max-w-7xl will-change-transform",
            bricolage.variable,
            instrument.variable,
          )}
        >
          {/* THE APP FRAME — its OWN rounded top IS the seam between the hero and
              this section (no separate labeled lip): a RED top edge + soft top
              highlight + ambient red lift, identical to the fixed teaser so the
              swap is invisible when the panel rises to meet it. Left sidebar · main
              work area; warm-black bg, the real dashboard's borders + surfaces. */}
          <div
            className={cn(
              "grid grid-cols-1 overflow-hidden rounded-[var(--hk-radius-xl)] border-x border-b border-t-2 border-[var(--hk-border-strong)] border-t-[var(--hk-accent)]/55 bg-[var(--hk-bg)] lg:grid-cols-[244px_minmax(0,1fr)]",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_-10px_30px_-12px_rgba(239,68,68,0.35),0_50px_140px_-60px_rgba(0,0,0,0.95)]",
            )}
          >
            <DemoSidebar />
            <div className="flex min-w-0 flex-col">
              <DemoStepStrip />
              <DemoMain />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * FIX C — the fixed TEASER SLIP. A clearly-visible rounded window peeking up from
 * the bottom of the viewport on page load, UNMISTAKABLY separate from the #050505
 * canvas:
 *
 *   - A SEPARATE color: the dashboard's warm-dark surface (#15100f → #1c1716).
 *   - A visible RED top edge (a 2px red top border) + an ambient RED glow lifting
 *     the slip off the black, so the rounded shape and the window plainly stand out.
 *   - A clear rounded-t-[22px] with a light inset top hairline so the curve reads.
 *   - A NOTICEABLE SLIVER: ~9vh of window peeks above the fold (header lip + a strip
 *     of panel body with a couple of skeleton rows), not a thin bar.
 *
 * It is pointer-events-none (decorative; its parent is too) and `data-sneak="teaser"`
 * so the scene fades it out as the real panel rises into the same place. The body
 * strip below the lip is masked with a downward fade so the bottom edge melts into
 * the viewport rather than presenting a hard cut.
 */
function TeaserSlip() {
  return (
    <div className="relative w-full max-w-7xl">
      {/* Ambient RED glow ABOVE the slip so the window lifts off the #050505 canvas
          — the dashboard's signature accent, low-opacity, soft. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -top-16 h-24 rounded-[40px] bg-[radial-gradient(60%_120%_at_50%_100%,rgba(239,68,68,0.28),rgba(239,68,68,0.08)_50%,transparent_75%)] blur-[6px]"
      />

      {/* THE WINDOW — warm-dark surface, RED top edge, rounded top, ambient red lift.
          NO label/handle lip: the clean rounded-top edge IS the seam between the
          hero and this section. overflow-hidden keeps the bottom open into the
          viewport; translate-y pushes the lower portion off the fold so a
          controlled sliver peeks up. */}
      <div
        className={cn(
          "relative translate-y-[28px] overflow-hidden rounded-t-[var(--hk-radius-xl)] border-x border-t-2 border-[var(--hk-accent)] bg-[var(--hk-bg)]",
          // The lift: a red ambient shadow above + a deep base shadow below so the
          // slip clearly reads as a lifted, separate window.
          "shadow-[0_-12px_40px_-8px_rgba(239,68,68,0.45),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
        )}
      >
        {/* A strip of panel body so a NOTICEABLE sliver of "real window" peeks up,
            with NO labeled lip — just the clean rounded-top edge of the dashboard
            surface. A faint red wash along the top edge + a couple of skeleton rows
            hint at the dashboard below, then a downward fade melts the bottom into
            the viewport. */}
        <div className="relative px-6 pb-9 pt-5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,rgba(239,68,68,0.12),transparent_70%)]"
          />
          <div className="relative flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--hk-accent)] shadow-[0_0_8px_1px_rgba(239,68,68,0.6)]" />
            <span className="h-2 w-28 rounded-full bg-[var(--hk-text)]/15" />
            <span className="ml-auto h-2 w-16 rounded-full bg-[var(--hk-text)]/10" />
          </div>
          <div className="relative mt-3 flex gap-3">
            <span className="h-8 flex-1 rounded-[10px] bg-[var(--hk-surface-elev)]" />
            <span className="h-8 flex-1 rounded-[10px] bg-[var(--hk-surface-elev)]" />
            <span className="hidden h-8 flex-1 rounded-[10px] bg-[var(--hk-surface-elev)] sm:block" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LEFT SIDEBAR — mimics components/sidebar.tsx: "hookm." wordmark (red period),
 * WORKSPACE group (Create primary RED w/ glow, Library, Products, Trends), ACCOUNT
 * group (Account, Usage and Billing), a generic PLAN card (Pro / unlimited renders,
 * no credits count), and a neutral "Hookm Studio · Live preview" demo chip. The
 * personal account identity (avatar, username, role, socials) is intentionally
 * stripped so the panel reads as a product DEMO, not a logged-in user's screen.
 */
function DemoSidebar() {
  return (
    <aside
      data-sneak="reveal"
      aria-label="Studio navigation"
      className="hidden flex-col border-r border-[var(--hk-border)] bg-[var(--hk-surface)]/40 px-5 py-6 lg:flex"
    >
      <span className="mb-9 font-[family-name:var(--hk-font-sans)] text-xl font-semibold tracking-tight text-[var(--hk-text)]">
        hookm
        <span className="text-[var(--hk-accent)]">.</span>
      </span>

      <SideGroupLabel>Workspace</SideGroupLabel>
      <nav className="flex flex-col gap-1">
        {WORKSPACE.map((item) => (
          <SideRow key={item.label} label={item.label} primary={item.primary} />
        ))}
      </nav>

      <SideGroupLabel className="mt-8">Account</SideGroupLabel>
      <nav className="flex flex-col gap-1">
        {ACCOUNT.map((label) => (
          <SideRow key={label} label={label} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        {/* DEMO/PLAN card — generic, no personal account data. A neutral plan
            label + a quiet "Live preview" status; no credits count, no Subscribe
            CTA, no user identity. Reads as a product DEMO, not a logged-in screen. */}
        <div className="rounded-[var(--hk-radius-lg)] border border-[var(--hk-border)] p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-[family-name:var(--hk-font-sans)] text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--hk-muted)]">
              Plan
            </span>
            <span className="inline-flex h-6 items-center rounded-full border border-[var(--hk-accent)]/40 bg-[rgba(239,68,68,0.10)] px-2.5 font-[family-name:var(--hk-font-sans)] text-[11px] font-medium text-[var(--hk-accent-soft)]">
              Pro
            </span>
          </div>
          <p className="font-[family-name:var(--hk-font-sans)] text-xs text-[var(--hk-muted)]">
            Unlimited renders
          </p>
        </div>

        {/* Demo workspace chip — a neutral product label with a live status dot,
            standing in for the user/account chip (no avatar, name, role or
            socials). */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="relative grid size-8 place-items-center rounded-full border border-[var(--hk-border-strong)] bg-[var(--hk-surface-elev)]"
          >
            <span className="size-1.5 rounded-full bg-[var(--hk-accent)] shadow-[0_0_8px_1px_rgba(239,68,68,0.6)]" />
          </span>
          <div className="flex flex-col">
            <span className="font-[family-name:var(--hk-font-sans)] text-xs font-medium text-[var(--hk-text)]">
              Hookm Studio
            </span>
            <span className="font-[family-name:var(--hk-font-sans)] text-[10px] uppercase tracking-wider text-[var(--hk-faint)]">
              Live preview
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SideGroupLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mb-3 font-[family-name:var(--hk-font-sans)] text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--hk-muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SideRow({ label, primary = false }: { label: string; primary?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-3 rounded-[var(--hk-radius-lg)] px-3 py-2.5 font-[family-name:var(--hk-font-sans)] text-sm",
        primary
          ? "bg-[var(--hk-accent)] font-medium text-white shadow-[var(--hk-glow)]"
          : "text-[var(--hk-muted)]",
      )}
    >
      <NavGlyph primary={primary} />
      <span>{label}</span>
    </span>
  );
}

/**
 * TOP STEP STRIP — mimics components/step-strip.tsx: the 8 steps with a connecting
 * hairline, 01 Template active as a filled RED numbered node (with soft pulse ring)
 * and the rest outlined/muted. Each node carries the label + caption.
 */
function DemoStepStrip() {
  return (
    <div
      data-sneak="reveal"
      className="border-b border-[var(--hk-border)] bg-[var(--hk-bg)]/85 px-4 py-4 sm:px-6"
    >
      <div className="relative">
        {/* The connecting hairline behind the nodes. */}
        <span
          aria-hidden
          className="absolute left-6 right-6 top-[18px] h-px bg-[var(--hk-border)]"
        />
        <ol className="relative flex gap-4 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6">
          {STEPS.map((step) => {
            const active = step.state === "active";
            return (
              <li
                key={step.idx}
                className="flex min-w-[78px] flex-1 flex-col items-center text-center"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full border font-[family-name:var(--hk-font-sans)] text-[12px] font-semibold",
                    active
                      ? "border-[var(--hk-accent)] bg-[var(--hk-accent)] text-white shadow-[0_0_0_4px_rgba(239,68,68,0.18)]"
                      : "border-[var(--hk-border-strong)] bg-[var(--hk-surface)] text-[var(--hk-muted)]",
                  )}
                >
                  {step.idx}
                </span>
                <span
                  className={cn(
                    "mt-2 font-[family-name:var(--hk-font-sans)] text-[12px] font-medium",
                    active ? "text-[var(--hk-text)]" : "text-[var(--hk-muted)]",
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-1 font-[family-name:var(--hk-font-sans)] text-[10px] uppercase tracking-[0.18em] text-[var(--hk-muted)]">
                  {step.caption}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * MAIN WORK AREA — the Step-01 picker: an overline + heading with an italic-serif
 * RED accent word (the dashboard's `.accent`), a Video/Slideshow toggle (Video
 * active = red pill), "6 formats available", and the grid of FORMAT CARDS.
 */
function DemoMain() {
  return (
    <div className="relative flex flex-col gap-6 px-5 py-7 sm:px-9 sm:py-9">
      {/* Ambient red wash behind the picker (the dashboard's `.ambient-red`). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-10%,rgba(239,68,68,0.10),transparent_70%)]"
      />

      <header data-sneak="reveal" className="relative flex flex-col gap-3">
        <span className="font-[family-name:var(--hk-font-sans)] text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--hk-accent)]">
          Template
        </span>
        <h3 className="font-[family-name:var(--hk-font-sans)] text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium tracking-tight text-[var(--hk-text)]">
          Pick a{" "}
          <span className="font-[family-name:var(--hk-font-serif)] italic tracking-[-0.02em] text-[var(--hk-accent)]">
            hook format.
          </span>
        </h3>
        <p className="max-w-xl font-[family-name:var(--hk-font-sans)] text-sm leading-relaxed text-[var(--hk-muted)]">
          The format decides the visual language of the final video. You can change
          it any time before the script is locked.
        </p>
      </header>

      {/* Video / Slideshow toggle + formats-available count. */}
      <div
        data-sneak="reveal"
        className="relative flex items-center justify-between"
      >
        <div className="inline-flex rounded-full border border-[var(--hk-border)] bg-[var(--hk-surface)] p-1 text-sm">
          <span className="rounded-full bg-[var(--hk-accent)] px-4 py-2 font-[family-name:var(--hk-font-sans)] text-white">
            Video
          </span>
          <span className="rounded-full px-4 py-2 font-[family-name:var(--hk-font-sans)] text-[var(--hk-muted)]">
            Slideshow
          </span>
        </div>
        <span className="font-[family-name:var(--hk-font-sans)] text-xs text-[var(--hk-muted)]">
          6 formats available
        </span>
      </div>

      {/* FORMAT CARD GRID — roomier gutters so the wider panel gives each card
          breathing space for its preview image + label + description. */}
      <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FORMATS.map((f) => (
          <FormatCard key={f.name} format={f} />
        ))}
      </div>
    </div>
  );
}

/**
 * A single FORMAT CARD — mimics the real template picker card + components/ui/card.
 * Featured/selected (Skeleton AI) gets the red glow border, red play badge, and a
 * red "Selected" underline; the rest are outlined surfaces with "Click to choose".
 *
 * Each card shows the generated preview frame for its format (an `<Image>` slot
 * pointing at /demo/templates/<templateKey>.jpg, object-cover + rounded, behind a
 * subtle bottom-up grade so the FORMAT overline + title + one-line description stay
 * legible). If the file is missing the image simply yields and the red gradient
 * fallback wash (always rendered behind it) shows through — no broken state.
 *
 * Layout: the preview image occupies the upper region; an overline + title sit on
 * the image, and the description + status pin to the bottom over the grade — giving
 * each card room for image + FORMAT overline + title + one-line description cleanly.
 */
function FormatCard({ format }: { format: (typeof FORMATS)[number] }) {
  const { name, description, overline, templateKey, featured, selected } = format;
  return (
    <div
      data-sneak="reveal"
      className={cn(
        "group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[var(--hk-radius-xl)] border p-5 text-left",
        selected
          ? "border-[var(--hk-accent)] bg-[rgba(239,68,68,0.06)] shadow-[var(--hk-glow)]"
          : "border-[var(--hk-border)] bg-[var(--hk-surface)]",
      )}
    >
      {/* Fallback wash — always rendered BEHIND the image so a missing
          /demo/templates file degrades gracefully to the red gradient. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(248,113,113,0.10),transparent_62%)]"
      />

      {/* Generated preview frame — object-cover, rounded (clipped by the card),
          behind a subtle bottom-up grade so the overline/title/description read
          cleanly over it. Decorative (aria-hidden); the title labels the card. */}
      <Image
        src={`/demo/templates/${templateKey}.jpg`}
        alt=""
        aria-hidden
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 90vw"
        className="object-cover opacity-45 transition-opacity duration-300 group-hover:opacity-60"
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--hk-bg)] via-[var(--hk-bg)]/78 to-[var(--hk-bg)]/12" />

      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "font-[family-name:var(--hk-font-sans)] text-[11px] font-medium uppercase tracking-[0.18em]",
              featured ? "text-[var(--hk-accent)]" : "text-[var(--hk-muted)]",
            )}
          >
            {overline}
          </span>
          <span className="font-[family-name:var(--hk-font-sans)] text-xl font-medium tracking-tight text-[var(--hk-text)]">
            {name}
          </span>
        </div>
        {selected && (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--hk-accent)] text-white">
            <PlayGlyph />
          </span>
        )}
      </div>

      <div className="relative mt-auto">
        <p className="mb-3 line-clamp-2 font-[family-name:var(--hk-font-sans)] text-sm leading-relaxed text-[var(--hk-muted)]">
          {description}
        </p>
        {selected ? (
          <span className="inline-flex flex-col font-[family-name:var(--hk-font-sans)] text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--hk-accent)]">
            Selected
            <span
              aria-hidden
              className="mt-1 h-px w-9 bg-[var(--hk-accent)]"
            />
          </span>
        ) : (
          <span className="font-[family-name:var(--hk-font-sans)] text-xs text-[var(--hk-faint)]">
            Click to choose
          </span>
        )}
      </div>
    </div>
  );
}

/* ---- Minimal inline glyphs (currentColor) — no icon deps inside the panel. ---- */

/** A generic nav-item glyph (outlined square) — primary rows tint it white. */
function NavGlyph({ primary }: { primary: boolean }) {
  return (
    <svg
      viewBox="0 0 18 18"
      aria-hidden
      className={cn("h-4 w-4", primary ? "text-white" : "text-[var(--hk-muted)]")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="2.5" width="13" height="13" rx="3.5" />
      <path d="M6 9h6M9 6v6" />
    </svg>
  );
}

/** Minimal "play" glyph for the selected format badge (currentColor = white). */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3" fill="currentColor">
      <path d="M3 2.2v7.6L9.5 6 3 2.2z" />
    </svg>
  );
}

