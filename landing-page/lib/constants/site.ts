import type { NavItem, SectionMeta } from "@/types";

/**
 * Single source of truth for site-level copy + structure.
 *
 * `app/layout.tsx` reads `SITE` for metadata; `app/page.tsx` maps over `SECTIONS`
 * (in order) to compose the page. Reshaping the page per creative direction means
 * editing `SECTIONS` here — never re-wiring the page composition by hand.
 */

/** Canonical production origin. Used for `metadataBase` + absolute OG URLs. */
export const SITE_URL = "https://hookm.ai";

export const SITE = {
  name: "Hookm",
  /** Title shown in the browser tab / used as the metadata template base. */
  title: "Hookm — Turn any product into a viral hook video",
  /** Sub-60-word elevator pitch reused for meta description + hero subcopy. */
  description:
    "Drop in a product link, screenshot, or a few notes. Hookm scripts, casts, and renders a ready-to-post TikTok and Reels hook ad in minutes — no studio, no editor, no shoot.",
  /** Short tagline for OG cards and the nav wordmark sub-label. */
  tagline: "The render room for short-form ads.",
  twitter: "@hookmai",
} as const;

/**
 * Floating-nav links. Each `href` is an in-page anchor that resolves to a
 * section's DOM `id` (see `SECTIONS`). Lenis/ScrollToPlugin can smooth-scroll
 * to these targets.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Result", href: "#result" },
  { label: "Features", href: "#features" },
  { label: "Start", href: "#cta" },
] as const;

/**
 * The ORDERED section registry. `app/page.tsx` iterates this array top-to-bottom,
 * which also mirrors scroll order — important so ScrollTrigger instances are
 * created in page order (correct pin-spacing + refresh behavior).
 *
 * Order is load-bearing: hero -> sneak-peek -> how-it-works -> result -> features
 * -> cta -> footer.
 */
export const SECTIONS: readonly SectionMeta[] = [
  { id: "hero", name: "Hero", eyebrow: "Live render" },
  { id: "sneak-peek", name: "Sneak peek", eyebrow: "Inside the studio" },
  { id: "how-it-works", name: "How it works", eyebrow: "The flow" },
  { id: "result", name: "The result", eyebrow: "The output" },
  { id: "features", name: "Features", eyebrow: "Inside the suite" },
  { id: "cta", name: "Get started", eyebrow: "Your first render" },
  { id: "footer", name: "Footer" },
] as const;
