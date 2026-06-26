/**
 * THE REEL — exactly FIVE video cards distributed ALONG A WIDE HORIZONTAL TRACK
 * that pans to the right as you scroll. This is the signature: the cards FLOW
 * across the pinned viewport (they are NOT revealed in fixed screen slots). One
 * typed source of truth shared by the markup (`Hero.tsx` positions each card with
 * inline `left`/`top` ALONG THE TRACK) and the animation (`Hero.animation.ts`
 * reads the same params to author the pan distance, the per-card wave-in, and the
 * gentle depth parallax).
 *
 * COORDINATE MODEL:
 * - The track is `TRACK_VW` wide (in viewport widths). It lives inside a clipping
 *   stage that is exactly 100vw. As the scrubbed timeline runs, the track
 *   translates left via `xPercent`, so its content sweeps right-to-left through
 *   the viewport — that sideways motion is the whole point.
 * - `leftVw` — the card's CENTER measured ALONG THE TRACK, in vw (so values run
 *   from a small margin up to `TRACK_VW` minus a margin). The card wrapper carries
 *   `-translate-x-1/2 -translate-y-1/2`, so `left:${leftVw}vw` / `top:${topVh}vh`
 *   place the card's center exactly there (top measured against the VIEWPORT
 *   height, since the track is full-height).
 * - `topVh` — the card's CENTER vertically, in vh. The five values ALTERNATE
 *   top/bottom so the cards trace a zig-zag ribbon as they pan past.
 * - `scale` / `rotateDeg` — resting depth + a tasteful static tilt.
 * - `driftVw` — a small extra horizontal parallax drift (vw) applied as the pan
 *   runs, so nearer cards (bigger scale) slide a touch faster than farther ones —
 *   depth without breaking the 1:1 scroll feel.
 *
 * SIZE MATH (every FULL frame stays vertically on-screen): the source is 720x958,
 * ratio R = 958/720 = 1.3306. A card of width `WIDTH_VW` vw renders
 * `WIDTH_VW * R * (innerWidth/innerHeight) * scale` vh tall. With WIDTH_VW = 13
 * and the scales below, the zig-zag bands are pulled IN (tops ~30-32vh, bottoms
 * ~60vh) so the ribbon reads without anything hugging the floor. On a 16:10
 * MacBook (AR 1.6) every full frame already sits inside [~15vh, ~73vh];
 * `Hero.animation.ts` additionally applies a generic, LIVE-aspect per-card vertical
 * clamp (transform-only) so no frame can ever clip top (< 7vh) or bottom (> 93vh)
 * even on ultrawide / very short viewports — consistent placement across screens.
 *
 * THE ZIG-ZAG RIBBON (left -> right along the track, the order they sweep in):
 *   1 skeleton_1  TOP-ish           (enters first, visible at rest)
 *   2 skeleton_2  LOWER, toward center
 *   3 skeleton_3  HIGH / center apex
 *   4 simpson_1   LOWER, toward center (mirror of c2)
 *   5 simpson_2   TOP-ish           (sweeps in last, mirror of c1)
 */

/** The five clip basenames, in left-to-right track order. */
export type ReelVideo =
  | "skeleton_1"
  | "skeleton_2"
  | "skeleton_3"
  | "simpson_1"
  | "simpson_2";

export interface ReelCardDef {
  /** Stable id used as the data-card-id hook and React key. */
  readonly id: string;
  /** The clip basename; resolves to /videos/<video>.mp4 + posters/<video>.jpg. */
  readonly video: ReelVideo;
  /** A tiny mono tick in the card corner (decorative). */
  readonly tick?: string;
  /** Card CENTER measured ALONG THE TRACK, in vw (wrapper has -translate-x-1/2). */
  readonly leftVw: number;
  /** Card CENTER vertically, in vh (wrapper has -translate-y-1/2). */
  readonly topVh: number;
  /** Resting scale (depth). */
  readonly scale: number;
  /** Resting tilt, deg (static — never tweened on scrub). */
  readonly rotateDeg: number;
  /** Extra horizontal parallax drift (vw) over the pan; signed for depth. */
  readonly driftVw: number;
}

/**
 * Total track width in vw. The stage clips to 100vw, so the pan travels
 * (TRACK_VW - 100) vw of viewport leftward — the cards spread along this width
 * and sweep through one after another. Tightened from 300 -> 220 so the sweep is
 * SNAPPIER: the cards sit closer together (less dead space) and the whole reel
 * clears in less scroll, while keeping enough air that no two frames overlap.
 */
export const TRACK_VW = 220;

/**
 * Base card width in vw; the 3:4 height follows from `aspect-[720/958]`. Trimmed
 * from 14 -> 13 so the rendered frame is a touch shorter in vh, giving the
 * vertical clamp more headroom to keep every full frame inside [7vh, 93vh].
 */
export const WIDTH_VW = 13;

/** Native clip ratio (height / width) = 958 / 720. Drives the size math above. */
export const VIDEO_RATIO = 958 / 720;

/** Public path to a clip by basename. */
export function videoSrc(video: ReelVideo): string {
  return `/videos/${video}.mp4`;
}

/** Public path to a clip's poster (first frame) by basename. */
export function posterSrc(video: ReelVideo): string {
  return `/videos/posters/${video}.jpg`;
}

/**
 * THE FIVE CARDS — distributed left-to-right along the 220vw track in the
 * zig-zag the spec locks. `leftVw` is the on-track center: card 1 sits near the
 * start (visible at rest), the rest are spread rightward (48vw center-to-center —
 * tighter than before, but a 13vw card never overlaps its neighbour) so they sweep
 * into the viewport one after another as the track pans. `topVh` ALTERNATES with
 * GENTLE bands — tops ~30-32vh, bottoms ~60vh — so the up/down ribbon still reads
 * clearly while nothing hugs the floor; the vertical clamp in `Hero.animation.ts`
 * then guarantees [7vh, 93vh] on any aspect ratio. `driftVw` adds depth parallax.
 */
export const REEL_CARDS: readonly ReelCardDef[] = [
  {
    id: "c1",
    video: "skeleton_1",
    tick: "9:16",
    // TOP-ish — visible at rest near the start of the track.
    leftVw: 22,
    topVh: 32,
    scale: 1.0,
    rotateDeg: -3,
    driftVw: -2.5,
  },
  {
    id: "c2",
    video: "skeleton_2",
    tick: "9:16",
    // LOWER band, drifting toward center.
    leftVw: 70,
    topVh: 60,
    scale: 0.95,
    rotateDeg: 2.5,
    driftVw: 1.5,
  },
  {
    id: "c3",
    video: "skeleton_3",
    tick: "9:16",
    // HIGH / center apex of the ribbon.
    leftVw: 118,
    topVh: 30,
    scale: 1.04,
    rotateDeg: 0,
    driftVw: -3,
  },
  {
    id: "c4",
    video: "simpson_1",
    tick: "9:16",
    // LOWER band, toward center (mirror of c2).
    leftVw: 166,
    topVh: 60,
    scale: 0.95,
    rotateDeg: -2.5,
    driftVw: 1.5,
  },
  {
    id: "c5",
    video: "simpson_2",
    tick: "9:16",
    // TOP-ish — sweeps in last (mirror of c1).
    leftVw: 210,
    topVh: 32,
    scale: 1.0,
    rotateDeg: 3,
    driftVw: -2,
  },
] as const;
