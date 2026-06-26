/**
 * Shared, app-wide types. Imported via the `@/types` alias.
 *
 * Kept deliberately small: section identity + props, nav items, and the
 * reduced-motion context shape. Section copy/order lives in
 * `lib/constants/site.ts` (the `SECTIONS` registry); these types give that
 * registry — and the page composition that maps over it — their contract.
 */

/**
 * The canonical, ORDERED set of section ids. This union is load-bearing: it is
 * the registry key in `app/page.tsx` (`Record<SectionId, …>` makes the island
 * map exhaustive) and every section's DOM `id` / anchor target. Order mirrors
 * scroll order: hero -> sneak-peek -> why -> footer.
 */
export type SectionId = "hero" | "sneak-peek" | "why" | "footer";

/**
 * One entry in the section registry (`SECTIONS`). `eyebrow` is the small mono
 * kicker some sections render above their heading; omitted where there is none
 * (e.g. the footer).
 */
export interface SectionMeta {
  /** Stable id — the section's DOM id + anchor target + registry key. */
  readonly id: SectionId;
  /** Human-readable label (aria / internal). */
  readonly name: string;
  /** Optional small mono kicker rendered above the section heading. */
  readonly eyebrow?: string;
}

/**
 * Props every section island receives from the page composition. `id` is the
 * registry id (also the DOM id); `className` lets the composer pass layout
 * niceties without the section knowing about its neighbours.
 */
export interface SectionProps {
  /** The section's DOM id (an in-page anchor target). */
  readonly id: string;
  /** Optional extra classes merged onto the section root. */
  readonly className?: string;
}

/** A floating-nav link: a label plus an in-page anchor href (e.g. `#cta`). */
export interface NavItem {
  readonly label: string;
  readonly href: string;
}

/**
 * The reduced-motion context value. `prefersReducedMotion` is `null` until the
 * client resolves the media query (so SSR and first paint agree), then the
 * resolved boolean. Consumers treat `null` as "unknown — don't commit to heavy
 * motion yet".
 */
export interface ReducedMotionState {
  readonly prefersReducedMotion: boolean | null;
}
