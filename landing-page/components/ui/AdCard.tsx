import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * AdCard — a clean 9:16 placeholder frame for the "reel of ad examples".
 *
 * A lighter cousin of {@link PhoneFrame}: a true 9:16 aspect tile with a
 * hairline-framed, render-grained stage and ONE of three on-palette placeholder
 * treatments. There is NO external media here — every card is pure CSS/SVG so it
 * stays GPU-cheap inside a wide horizontal-scroll canvas. The `variant` chooses
 * the look; later, the inner stage can be swapped for a `<video>` without
 * touching the frame.
 *
 * ACCENT LOCK: this primitive carries ZERO accent. Every treatment
 * is built from bg / surface / surface-2, hairline / hairline-strong, fg / muted
 * and white-alpha glows only — so the reel can scatter dozens of these without
 * ever spending one of the locked accent uses.
 *
 * Purely presentational + GSAP-free: the Hero island positions and animates the
 * card via transforms on the wrapper it renders this into.
 */
export type AdCardVariant = "gradient" | "caption" | "product";

export interface AdCardProps {
  /** Which on-palette placeholder treatment to render. */
  readonly variant: AdCardVariant;
  /**
   * Sub-treatment knob so repeated variants don't read identically: rotates /
   * flips the glow origin and tweaks caption density. `"a" | "b" | "c"`.
   */
  readonly tone?: "a" | "b" | "c";
  /** Show the social rail (heart/comment/share) — only meaningful for product. */
  readonly social?: boolean;
  /** A tiny mono tick in the corner, e.g. `9:16` or `1080p`. NOT a caption. */
  readonly tick?: string;
  /** A mono cut-counter shown bottom-right, e.g. `03/05` (caption variant). */
  readonly counter?: string;
  /** Class applied to the OUTER frame (sizing/positioning is the caller's job). */
  readonly className?: string;
  /** Optional a11y label; the card is decorative by default (aria-hidden). */
  readonly "aria-label"?: string;
}

/** Per-tone radial glow positions (white-alpha only — never an accent hue). */
const GLOW: Record<NonNullable<AdCardProps["tone"]>, string> = {
  a: "bg-[radial-gradient(80%_55%_at_50%_12%,rgba(255,255,255,0.09),transparent_60%),linear-gradient(180deg,#16161a,#0e0e10)]",
  b: "bg-[radial-gradient(70%_55%_at_82%_16%,rgba(255,255,255,0.08),transparent_58%),linear-gradient(150deg,#16161a,#070708)]",
  c: "bg-[radial-gradient(85%_60%_at_50%_8%,rgba(255,255,255,0.1),transparent_62%),linear-gradient(180deg,#1a1a1f,#0e0e10)]",
};

export function AdCard({
  variant,
  tone = "a",
  social = false,
  tick,
  counter,
  className,
  "aria-label": ariaLabel,
}: AdCardProps) {
  return (
    <div
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      className={cn(
        "relative aspect-[9/16] w-full overflow-hidden rounded-frame border border-hairline bg-surface-2",
        "shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {/* Base stage gradient (white-alpha glow over the surface ramp). */}
      <div aria-hidden className={cn("absolute inset-0", GLOW[tone])} />
      {/* Rendered-texture grain — a static background-image, never animated. */}
      <div aria-hidden className="render-grain absolute inset-0 opacity-60" />

      {variant === "caption" ? <CaptionStage tone={tone} counter={counter} /> : null}
      {variant === "product" ? <ProductStage social={social} /> : null}
      {variant === "gradient" ? <GradientStage tone={tone} /> : null}

      {/* Tiny mono tick (e.g. 9:16 / 1080p) — bottom-left, muted, NOT a caption. */}
      {tick ? (
        <span className="absolute bottom-2.5 left-3 z-20 font-mono text-[0.5rem] uppercase tracking-[0.2em] text-muted">
          {tick}
        </span>
      ) : null}
    </div>
  );
}

/**
 * GRADIENT-STAGE — the atmospheric "empty set" card: glow + grain + a single
 * neutral progress hairline along the bottom (hairline-strong, NEVER lime).
 */
function GradientStage({ tone }: { tone: NonNullable<AdCardProps["tone"]> }) {
  return (
    <>
      {/* Soft off-center bokeh for depth (white-alpha). Pre-rendered as soft-stop
          radial gradients — NOT blur filters — so a deck of held cards never each
          spends a compositor blur layer (the dozens-of-blurs jank risk). */}
      <span className="absolute right-2 top-[26%] z-10 h-20 w-20 rounded-pill bg-[radial-gradient(closest-side,rgba(255,255,255,0.07),transparent_72%)]" />
      <span className="absolute bottom-[18%] left-3 z-10 h-16 w-16 rounded-pill bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent_72%)]" />
      {/* A single neutral card-progress hairline (NOT the page's lime scrubber). */}
      <div className="absolute inset-x-3 bottom-7 z-10 h-px bg-hairline">
        <span
          className="absolute inset-y-0 left-0 bg-hairline-strong"
          style={{ width: tone === "b" ? "62%" : tone === "c" ? "44%" : "30%" }}
        />
      </div>
    </>
  );
}

/**
 * MOCK-CAPTION — reads as a TikTok hook without legible copy: stacked fg-alpha
 * "text" bars + a muted @handle·ad chip, plus an optional mono cut-counter.
 */
function CaptionStage({
  tone,
  counter,
}: {
  tone: NonNullable<AdCardProps["tone"]>;
  counter?: string;
}) {
  // Tone drives caption density so repeats don't read identically.
  const bars =
    tone === "c"
      ? [
          { w: "70%", a: "bg-fg/14" },
          { w: "48%", a: "bg-fg/14" },
          { w: "58%", a: "bg-fg/14" },
        ]
      : tone === "b"
        ? [{ w: "64%", a: "bg-fg/12" }]
        : [
            { w: "78%", a: "bg-fg/15" },
            { w: "52%", a: "bg-fg/15" },
          ];

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-[6%] px-[10%] pb-[18%]">
      {bars.map((bar, i) => (
        <span
          key={i}
          className={cn("h-[5%] rounded-pill", bar.a)}
          style={{ width: bar.w }}
        />
      ))}
      <span className="mt-[6%] inline-flex w-fit items-center gap-1.5 rounded-pill border border-hairline bg-surface/50 px-2 py-1 font-mono text-[0.45rem] uppercase tracking-[0.16em] text-muted">
        <span className="h-1.5 w-1.5 rounded-pill bg-fg/30" />
        @brand · ad
      </span>
      {counter ? (
        <span className="absolute right-[10%] top-[8%] font-mono text-[0.5rem] uppercase tracking-[0.18em] text-muted">
          {counter}
        </span>
      ) : null}
    </div>
  );
}

/**
 * PRODUCT-BLOCK — the "cleanest" card: a machined product squircle with an inset
 * highlight on a radial stage, faint neutral bokeh, and an optional social rail.
 */
function ProductStage({ social }: { social: boolean }) {
  return (
    <>
      {/* Neutral bokeh accents (white-alpha — never lime). Pre-rendered as
          soft-stop radial gradients, NOT blur filters, so each held card costs no
          compositor blur layer inside the wide deck. */}
      <span className="absolute right-3 top-[18%] z-10 h-20 w-20 rounded-pill bg-[radial-gradient(closest-side,rgba(255,255,255,0.07),transparent_72%)]" />
      <span className="absolute bottom-[16%] left-3 z-10 h-16 w-16 rounded-pill bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent_72%)]" />

      {/* The product squircle — surface fill, strong hairline, inset highlight. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative aspect-square w-[44%] rounded-[28%] border border-hairline-strong bg-surface shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
          {/* Inset top highlight — sells machined hardware. */}
          <span className="pointer-events-none absolute inset-0 rounded-[28%] bg-gradient-to-b from-white/[0.07] to-transparent" />
          {/* A quiet label band so it reads as a product, not an empty box. */}
          <span className="absolute inset-x-[22%] bottom-[26%] h-[7%] rounded-pill bg-fg/12" />
          <span className="absolute inset-x-[30%] bottom-[16%] h-[6%] rounded-pill bg-fg/8" />
        </div>
      </div>

      {social ? (
        <div className="absolute bottom-[24%] right-3 z-20 flex flex-col items-center gap-3 text-fg/70">
          <RailGlyph kind="heart" />
          <RailGlyph kind="comment" />
          <RailGlyph kind="share" />
        </div>
      ) : null}
    </>
  );
}

/** Minimal ultra-light social-rail glyph (currentColor = fg, no accent). */
function RailGlyph({ kind }: { kind: "heart" | "comment" | "share" }): ReactNode {
  const paths: Record<typeof kind, string> = {
    heart: "M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z",
    comment: "M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z",
    share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-[1.1rem] w-[1.1rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
