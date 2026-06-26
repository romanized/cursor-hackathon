"use client";

import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useGSAP } from "@/lib/gsap/register";
import { useScrollScene } from "@/hooks/useScrollScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils/cn";
import { Container, Eyebrow, Timecode, Button, RecBadge } from "@/components/ui";
import type { SectionProps } from "@/types";
import { SECTIONS } from "@/lib/constants/site";
import { buildCtaScene, createMagnet, type Magnet } from "./Cta.animation";

/** Strength of the magnetic pull — fraction of the cursor offset applied. */
const MAGNET_STRENGTH = 0.32;

/** Trust-row line items — mono "edit suite" detailing, no accent. */
const TRUST_ITEMS = [
  "No credit card",
  "3 free renders",
  "Export 1080×1920",
] as const;

const META = SECTIONS.find((s) => s.id === "cta");

/**
 * CTA — the closing conversion beat.
 *
 * Mirrors the hero entry point: a bold display line, the Geist-Mono product-link
 * input, and a primary lime CTA whose fill is one of the EXACTLY THREE locked
 * lime uses (counts as the same "primary CTA" use as the hero). The button is
 * magnetic — a pointer-driven transform via `contextSafe`. Everything else is
 * token-neutral; the only other lime on this section is the REC dot in
 * `RecBadge`. Audited: no accent leak, no purple.
 */
export function Cta({ id, className }: SectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const magnetRef = useRef<HTMLDivElement | null>(null);
  const magnetSetters = useRef<Magnet | null>(null);

  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState("");

  // Scroll-in reveal: kicker -> masked headline -> input -> credits/trust. The
  // scene resolves the headline from its scoped `[data-cta-headline]` selector
  // at run time (inside useGSAP), so no ref is read during render.
  useScrollScene(sectionRef, buildCtaScene(), {
    dependencies: [reducedMotion],
  });

  // Magnetic button: pointer-driven transform, set up once via contextSafe.
  useGSAP(
    (_context, contextSafe) => {
      const el = magnetRef.current;
      // Skip the magnet entirely under reduced motion (and until resolved).
      if (!el || reducedMotion !== false || !contextSafe) return;

      magnetSetters.current = createMagnet(el);

      return () => {
        magnetSetters.current = null;
      };
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const setters = magnetSetters.current;
      const el = magnetRef.current;
      if (!setters || !el) return;
      const rect = el.getBoundingClientRect();
      const relX = event.clientX - (rect.left + rect.width / 2);
      const relY = event.clientY - (rect.top + rect.height / 2);
      setters.xTo(relX * MAGNET_STRENGTH);
      setters.yTo(relY * MAGNET_STRENGTH);
    },
    [],
  );

  const handlePointerLeave = useCallback(() => {
    const setters = magnetSetters.current;
    if (!setters) return;
    setters.xTo(0);
    setters.yTo(0);
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    // Honest placeholder: no backend wired yet — prevent navigation.
    event.preventDefault();
  }, []);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={META?.name ?? "Get started"}
      className={cn(
        "relative overflow-hidden border-t border-hairline bg-bg py-section",
        className,
      )}
    >
      {/* Decorative render-grain wash — CSS only, no media, no accent. */}
      <div
        aria-hidden
        className="render-grain pointer-events-none absolute inset-0 opacity-40"
      />
      {/* Soft top vignette to seat the section against the page above it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-hairline-strong"
      />

      <Container className="relative flex flex-col items-center text-center">
        <div data-cta-kicker className="gsap-hidden flex flex-col items-center gap-5">
          <Eyebrow index="05">{META?.eyebrow ?? "Your first render"}</Eyebrow>
          <RecBadge label="Render engine online" />
        </div>

        <h2
          data-cta-headline
          className="mt-8 max-w-[18ch] font-sans font-medium tracking-tighter text-fg text-[length:var(--text-display)] leading-none"
        >
          Make your first ad in 60 seconds
        </h2>

        <p className="mt-6 max-w-[52ch] text-balance font-sans text-base text-muted md:text-lg">
          Drop a product link below. Hookline scripts the hook, casts the creator,
          and renders a post-ready TikTok and Reels ad — while you watch.
        </p>

        {/* Hero-mirrored entry point: the product-link input + primary CTA. */}
        <form
          data-cta-input
          onSubmit={handleSubmit}
          className="gsap-hidden mt-10 w-full max-w-xl"
        >
          <div className="flex flex-col gap-3 rounded-frame border border-hairline-strong bg-surface/80 p-3 sm:flex-row sm:items-center sm:gap-2 sm:p-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-3 pl-3">
              <Timecode className="shrink-0 text-muted">URL</Timecode>
              <span
                aria-hidden
                className="h-5 w-px shrink-0 bg-hairline"
              />
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="paste-your-product-url.com/item"
                aria-label="Product link"
                className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-sm tracking-tight text-fg placeholder:text-muted/70 focus:outline-none"
              />
            </div>

            {/* Magnetic wrapper: pointer-driven transform target (contextSafe). */}
            <div
              ref={magnetRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="shrink-0"
            >
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Generate ad
              </Button>
            </div>
          </div>
        </form>

        {/* Secondary credits / free-trial mention + trust row. */}
        <div
          data-cta-meta
          className="mt-7 flex flex-col items-center gap-4"
        >
          <p className="font-sans text-sm text-muted">
            Starts free —{" "}
            <span className="text-fg">3 renders on the house</span>, no card
            required.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-2.5">
            {TRUST_ITEMS.map((item) => (
              <li key={item}>
                <Timecode chip>{item}</Timecode>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
