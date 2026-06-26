/**
 * Barrel for the CTA section island.
 *
 * `app/page.tsx` imports `Cta` from here so the page stays pure composition and
 * the section internals (component + animation factory) remain swappable behind
 * one stable entry point.
 */
export { Cta } from "./Cta";
