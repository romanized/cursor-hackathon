"use client";

import { useEffect, useRef } from "react";
import { useScrollScene } from "@/hooks/useScrollScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Container, Eyebrow, PhoneFrame, RecBadge, Timecode } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { SECTIONS } from "@/lib/constants/site";
import type { SectionProps } from "@/types";
import { buildResultScene, RESULT_CLASS } from "./Result.animation";

/**
 * RESULT — the output-proof showcase: "this is the actual ad it makes".
 *
 * A single hero PhoneFrame presenting a FINISHED vertical hook as PROOF, not
 * process. There is no raw->ad transformation here (that is the hero + dashboard
 * demo's job now) — the frame plays a real demo clip and rests at the finished
 * state, dressed with on-beat captions, a social rail, a color grade, a finished
 * REC stamp, and a "Generated in 38s" chip.
 *
 * ACCENT LOCK: this section spends exactly TWO lime uses — (1) the REC dot
 * (inside `RecBadge`) and (2) a thin lime scrub-line shown at its RESTING /
 * finished-playhead position. Nothing else is lime, and there is NO red. The
 * captions, social rail, grade, and chip all stay on fg/muted/surface tokens.
 *
 * PLAYBACK: a muted, looping, inline `<video>` is the PhoneFrame's base screen
 * layer (PhoneFrame's screen is a true 9:16 overflow-hidden box, so the clip
 * crops cleanly with object-cover — VideoCard is NOT nested here because it is a
 * 720x958 frame). An IntersectionObserver plays the loop only while on-screen and
 * pauses it off-screen (the VideoCard pattern); under reduced motion the clip
 * stays paused on its poster, with the CSS `FinishedAd` still beneath it.
 */

/** Registry meta for this section (eyebrow / a11y name) — single source. */
const META = SECTIONS.find((s) => s.id === "result");

/** The real demo clip presented as the output. */
const RESULT_VIDEO = {
  src: "/videos/skeleton_1.mp4",
  poster: "/videos/posters/skeleton_1.jpg",
} as const;

/** Fraction of the frame that must be visible before the loop plays. */
const PLAY_THRESHOLD = 0.35;

/** The on-beat captions baked into the finished ad. */
const CAPTIONS = [
  { text: "POV: you found the", className: "left-5 top-[18%]" },
  { text: "one that actually works", className: "left-5 top-[26%]" },
  { text: "wait for it...", className: "right-5 bottom-[30%] text-right" },
] as const;

export function Result({ id, className }: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();

  useScrollScene(sectionRef, buildResultScene);

  // PLAY-BY-LOCATION: an IntersectionObserver toggles the muted loop as the frame
  // enters/leaves the viewport (the VideoCard pattern). Under reduced motion the
  // clip stays paused on its poster — useScrollScene only governs GSAP timelines,
  // not the <video>, so this is handled here. `play()` rejections are swallowed.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reducedMotion !== false) {
      video.pause();
      return;
    }

    video.muted = true;
    video.loop = true;

    const play = () => {
      void video.play().catch(() => {});
    };
    const pause = () => {
      video.pause();
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return () => {
        pause();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) play();
          else pause();
        }
      },
      { threshold: PLAY_THRESHOLD },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      pause();
    };
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={META?.name ?? "The result"}
      className={cn(
        "relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-bg py-section",
        className,
      )}
    >
      {/* Header — centered, retitled to OUTPUT framing. */}
      <Container
        className={cn(
          RESULT_CLASS.header,
          "gsap-hidden mb-12 flex flex-col items-center text-center md:mb-16",
        )}
      >
        <Eyebrow index="03">{META?.eyebrow ?? "The output"}</Eyebrow>
        <h2 className="mt-5 max-w-[20ch] text-balance font-sans text-[clamp(2.25rem,5vw,4.5rem)] font-medium leading-[0.95] tracking-tighter text-fg">
          This is what Hookline ships.
        </h2>
        <p className="mt-5 max-w-[52ch] text-pretty font-sans text-base text-muted md:text-lg">
          A finished vertical hook — captions, pacing, and grade baked in. Ready to
          post to TikTok and Reels.
        </p>
      </Container>

      {/* Stage — the finished-ad phone frame. */}
      <Container className="flex items-center justify-center">
        <div
          className={cn(
            RESULT_CLASS.frame,
            "gsap-hidden relative w-full max-w-[clamp(17rem,30vw,21rem)]",
          )}
        >
          {/* Finished-spec tick rail flanking the frame (mono detailing). */}
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
            aria-label="Finished vertical hook ad"
            screenClassName="render-grain"
          >
            {/* --- LAYER (z-0): the CSS finished-ad still --- the reduced-motion /
                no-video poster state and a graded base beneath the clip. */}
            <div className="absolute inset-0 z-0">
              <FinishedAd />
            </div>

            {/* --- LAYER (z-10): the real demo clip = the output. object-cover
                crops the 9:16 screen cleanly. Decorative + inert to AT. --- */}
            <video
              ref={videoRef}
              className="absolute inset-0 z-10 h-full w-full object-cover"
              src={RESULT_VIDEO.src}
              poster={RESULT_VIDEO.poster}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              tabIndex={-1}
              aria-hidden
            />

            {/* --- LAYER (z-20): color-grade wash — sells the "finished" look. --- */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/55 via-transparent to-black/35 mix-blend-multiply"
            />

            {/* --- LAYER (z-30): on-beat captions. --- */}
            {CAPTIONS.map((caption) => (
              <span
                key={caption.text}
                className={cn(
                  RESULT_CLASS.caption,
                  "gsap-hidden absolute z-30 max-w-[70%] font-sans text-lg font-semibold leading-tight tracking-tight text-fg",
                  "[text-shadow:0_2px_18px_rgba(0,0,0,0.7)]",
                  caption.className,
                )}
              >
                {caption.text}
              </span>
            ))}

            {/* --- LAYER (z-30): social rail glyphs (mono/icons, no accent). --- */}
            <div
              aria-hidden
              className="absolute bottom-[28%] right-3 z-30 flex flex-col items-center gap-4 text-fg/80"
            >
              <SocialGlyph kind="heart" />
              <SocialGlyph kind="comment" />
              <SocialGlyph kind="share" />
            </div>

            {/* --- LAYER (z-40): REC HUD — lime dot (locked use #1) + a STATIC
                finished timecode stamp (does NOT count). --- */}
            <div
              className={cn(
                RESULT_CLASS.hud,
                "gsap-hidden pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-4 pt-4",
              )}
            >
              <RecBadge label="REC" />
              <span className="font-mono text-sm uppercase tracking-[0.18em] tabular-nums text-fg">
                0:15<span className="text-muted"> / 0:15</span>
              </span>
            </div>

            {/* --- LAYER (z-40): "Generated in 38s" chip — finished beat. NOT lime. */}
            <div
              className={cn(
                RESULT_CLASS.chip,
                "gsap-hidden absolute bottom-4 left-1/2 z-40 -translate-x-1/2",
              )}
            >
              <span className="inline-flex items-center gap-2 rounded-pill border border-hairline-strong bg-surface-2/90 px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-fg">
                <CheckGlyph />
                Generated in 38s
              </span>
            </div>

            {/* --- LAYER (z-50): the lime scrub-line at its RESTING / finished
                position (locked use #2). It does NOT sweep — it sits at full. --- */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-50 w-px bg-accent shadow-[0_0_24px_2px] shadow-accent/50"
            >
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-pill bg-accent" />
            </div>
          </PhoneFrame>

          {/* Proof chips beneath the frame — a finished SPEC, not a progress bar. */}
          <div
            className={cn(
              RESULT_CLASS.spec,
              "gsap-hidden mt-5 flex items-center justify-center gap-2",
            )}
          >
            <Timecode>1080×1920</Timecode>
            <span aria-hidden className="text-muted/50">
              ·
            </span>
            <Timecode>MP4</Timecode>
            <span aria-hidden className="text-muted/50">
              ·
            </span>
            <Timecode>:15</Timecode>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Finished-ad furniture — pure CSS/SVG, no accent.                            */
/* -------------------------------------------------------------------------- */

/** The finished vertical ad backdrop — a cinematic CSS scene (no media, no accent). */
function FinishedAd() {
  return (
    <div className="absolute inset-0">
      {/* Graded environment: warmer, contrastier than a flat still. */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_30%_20%,#242227_0%,#121215_55%,#08080a_100%)]" />
      {/* Subject staged off-center for a dynamic composition. */}
      <svg
        viewBox="0 0 120 220"
        aria-hidden
        className="absolute bottom-[20%] left-1/2 h-[52%] w-auto -translate-x-[58%] rotate-[-6deg] drop-shadow-[0_24px_50px_rgba(0,0,0,0.7)]"
      >
        <defs>
          <linearGradient id="result-bottle" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3e3e46" />
            <stop offset="50%" stopColor="#4a4a54" />
            <stop offset="100%" stopColor="#1c1c22" />
          </linearGradient>
        </defs>
        <rect x="46" y="6" width="28" height="22" rx="5" fill="url(#result-bottle)" />
        <path
          d="M40 30 h40 a14 14 0 0 1 14 14 v150 a14 14 0 0 1 -14 14 h-40 a14 14 0 0 1 -14 -14 v-150 a14 14 0 0 1 14 -14 z"
          fill="url(#result-bottle)"
        />
        <rect x="32" y="96" width="56" height="58" rx="6" fill="#0a0a0c" />
        <rect x="40" y="110" width="40" height="5" rx="2.5" fill="#56565f" />
        <rect x="40" y="122" width="28" height="4" rx="2" fill="#3a3a42" />
      </svg>
      {/* A few bokeh accents (neutral whites — never lime) for production polish. */}
      <span className="absolute right-6 top-[30%] h-16 w-16 rounded-pill bg-white/[0.05] blur-2xl" />
      <span className="absolute left-8 bottom-[22%] h-10 w-10 rounded-pill bg-white/[0.04] blur-xl" />
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
