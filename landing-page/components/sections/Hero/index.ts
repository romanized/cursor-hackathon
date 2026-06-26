/**
 * Barrel for the Hero section island (the five-card video "Reel").
 *
 * `app/page.tsx` imports `Hero` from here so the page stays pure composition.
 * The animation factory, selectors, and reel data are exported too for
 * testability, but the island owns its own wiring — sections are self-contained.
 */
export { Hero } from "./Hero";
export { buildReelScene, applyReelStaticState, REEL } from "./Hero.animation";
export {
  REEL_CARDS,
  WIDTH_VW,
  VIDEO_RATIO,
  videoSrc,
  posterSrc,
  type ReelCardDef,
  type ReelVideo,
} from "./Hero.reel";
