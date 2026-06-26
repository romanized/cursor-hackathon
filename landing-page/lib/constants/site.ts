import type { NavItem, SectionMeta } from "@/types";

/**
 * Single source of truth for site-level copy + structure.
 *
 * `app/layout.tsx` reads `SITE` for metadata; `app/page.tsx` maps over `SECTIONS`
 * (in order) to compose the page. Reshaping the page per creative direction means
 * editing `SECTIONS` here — never re-wiring the page composition by hand.
 */

/** Canonical production origin. Used for `metadataBase` + absolute OG URLs. */
export const SITE_URL = "https://hookline.ai";

/**
 * The live app's login entry. Every primary CTA ("Generate my first ad",
 * "Start rendering", etc.) points here — the landing page hands off to the
 * deployed dashboard. One constant so the URL lives in a single place.
 */
export const APP_LOGIN_URL =
  "https://app-cursor-hackathon.exportdefau.lt/login";

export const SITE = {
  name: "Hookline",
  /** Title shown in the browser tab / used as the metadata template base. */
  title: "Hookline — Turn any product into a viral hook video",
  /** Sub-60-word elevator pitch reused for meta description + hero subcopy. */
  description:
    "Drop in a product link, screenshot, or a few notes. Hookline scripts, casts, and renders a ready-to-post TikTok and Reels hook ad in minutes — no studio, no editor, no shoot.",
  /** Short tagline for OG cards and the nav wordmark sub-label. */
  tagline: "The render room for short-form ads.",
  twitter: "@hookline",
} as const;

/**
 * Floating-nav links. The page is intentionally SHORT — hero, the dashboard
 * sneak-peek, the "why" pitch, footer — so the nav is just the in-page anchors
 * that exist plus the app hand-off. `#why` resolves to the "Why Hookline" section;
 * the right-side "Start rendering" CTA goes to {@link APP_LOGIN_URL}, not an anchor.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "The studio", href: "#sneak-peek" },
  { label: "Why Hookline", href: "#why" },
] as const;

/**
 * The ORDERED section registry. `app/page.tsx` iterates this array top-to-bottom,
 * which also mirrors scroll order — important so ScrollTrigger instances are
 * created in page order (correct pin-spacing + refresh behavior).
 *
 * Order is load-bearing: hero -> sneak-peek -> why -> footer. (The old
 * how-it-works / result / features / cta sections were removed — they rendered
 * empty after the dashboard demo and the page is now a tight hero -> studio ->
 * why -> footer flow.)
 */
export const SECTIONS: readonly SectionMeta[] = [
  { id: "hero", name: "Hero", eyebrow: "Live render" },
  { id: "sneak-peek", name: "Sneak peek", eyebrow: "Inside the studio" },
  { id: "why", name: "Why Hookline", eyebrow: "Why Hookline" },
  { id: "footer", name: "Footer" },
] as const;
