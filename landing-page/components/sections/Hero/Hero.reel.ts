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
 * - `scale` — resting depth.
 * - `rotateDeg` — the card's RESTING tilt MAGNITUDE, deg. STRAIGHTENED to a small
 *   ~2..3 (down from the old +4..+7) so the reel reads nearly upright at rest with
 *   just a hint of life. The SIGN is NOT baked here — it comes from `faceRight`
 *   below, so the rest tilt is `(faceRight ? +1 : -1) * rotateDeg`. `Hero.animation.ts`
 *   lays the scrubbed FACING-FLIP tween on top (see `leanDeg`).
 * - `faceRight` — the card's RESTING facing: `true` leans RIGHT (+rotateDeg),
 *   `false` leans LEFT (-rotateDeg). Seeded per card in a clean alternating-ish
 *   pattern (not all one way, not strictly A-B-A-B chaotic) so the cards face a
 *   subtle MIX of left/right at rest.
 * - `leanDeg` — the FACING-FLIP magnitude (deg). As the card crosses viewport
 *   center while panning, `Hero.animation.ts` SWITCHES its facing: it eases the
 *   rotation from its resting tilt THROUGH zero to the OPPOSITE side
 *   (`-(faceRight?+1:-1) * leanDeg`), so the card visibly flips which way it faces.
 *   After the card clears center the flipped facing holds. Transform-only scrubbed
 *   tween; reverses on scroll-up; skipped entirely under reduced motion (resting
 *   tilt only). Kept small so the flip is clean, never chaotic.
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
  /**
   * Resting tilt MAGNITUDE, deg (small, ~2..3 — straightened). The signed resting
   * rotation is `(faceRight ? +1 : -1) * rotateDeg`. `Hero.animation.ts` adds the
   * scrubbed facing-flip on top.
   */
  readonly rotateDeg: number;
  /**
   * Resting facing: `true` = leans RIGHT (+rotateDeg), `false` = leans LEFT
   * (-rotateDeg). Seeded per card so the reel faces a subtle mix at rest.
   */
  readonly faceRight: boolean;
  /**
   * FACING-FLIP magnitude, deg. As the card crosses viewport center it eases from
   * its resting tilt THROUGH zero to the OPPOSITE facing (magnitude `leanDeg`), so
   * it visibly switches which way it faces, then holds. Transform-only scrubbed
   * tween in `Hero.animation.ts`; reverses on scroll-up; skipped under reduced
   * motion.
   */
  readonly leanDeg: number;
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
 * into the viewport one after another as the track pans. `topVh` ALTERNATES; BOTH
 * bands were nudged DOWN a touch — tops ~28-29vh (was ~23-24), bottoms ~76vh (was
 * ~73) — lowering the whole ribbon while every full frame still stays on screen:
 * at AR 1.6 the lowest bottom edge lands ~89vh (<= 93) and the highest top edge
 * ~13.6vh (>= 7). The vertical clamp in `Hero.animation.ts` then guarantees
 * [7vh, 93vh] on ANY aspect ratio (ultrawide / short viewports), so the down-shift
 * never pushes a frame off-screen. `driftVw` adds depth parallax.
 *
 * RESTING TILT (straightened) + FACING FLIP: every card now rests NEARLY UPRIGHT —
 * a small ~2..3 magnitude — and its facing (`faceRight`) is SEEDED so the reel is a
 * subtle MIX of left- and right-leaning cards at rest, not all one way. `leanDeg`
 * is the FACING-FLIP magnitude: as each card crosses viewport center it eases from
 * its resting tilt THROUGH zero to the OPPOSITE facing, visibly switching which way
 * it faces, then holds (transform-only, reverses on scroll-up; see
 * `Hero.animation.ts`). leftVw / scale / driftVw layout math is otherwise stable.
 */
export const REEL_CARDS: readonly ReelCardDef[] = [
  {
    id: "c1",
    video: "skeleton_1",
    tick: "9:16",
    // TOP band, nudged DOWN (24 -> 29). Visible at rest near the start of the track.
    leftVw: 22,
    topVh: 29,
    scale: 1.0,
    rotateDeg: 2.5,
    faceRight: true,
    leanDeg: 2.5,
    driftVw: -2.5,
  },
  {
    id: "c2",
    video: "simpson_1",
    tick: "9:16",
    // LOWER band, nudged DOWN (73 -> 76), drifting toward center. Bottom edge at
    // AR 1.6: 76 + (13*1.3306*0.95*1.6)/2 = 89.1vh <= 93 (no clip).
    leftVw: 70,
    topVh: 76,
    scale: 0.95,
    rotateDeg: 3,
    faceRight: false,
    leanDeg: 3,
    driftVw: 1.5,
  },
  {
    id: "c3",
    video: "skeleton_2",
    tick: "9:16",
    // HIGH / center apex of the ribbon, nudged DOWN (23 -> 28). Top edge at AR 1.6:
    // 28 - (13*1.3306*1.04*1.6)/2 = 13.6vh >= 7 (no clip).
    leftVw: 118,
    topVh: 28,
    scale: 1.04,
    rotateDeg: 2,
    faceRight: true,
    leanDeg: 2.5,
    driftVw: -3,
  },
  {
    id: "c4",
    video: "simpson_2",
    tick: "9:16",
    // LOWER band, nudged DOWN (73 -> 76), toward center (mirror of c2). Bottom edge
    // at AR 1.6: 76 + (13*1.3306*0.95*1.6)/2 = 89.1vh <= 93 (no clip).
    leftVw: 166,
    topVh: 76,
    scale: 0.95,
    rotateDeg: 3,
    faceRight: true,
    leanDeg: 3,
    driftVw: 1.5,
  },
  {
    id: "c5",
    video: "skeleton_3",
    tick: "9:16",
    // TOP band, nudged DOWN (24 -> 29) — sweeps in last (mirror of c1).
    leftVw: 210,
    topVh: 29,
    scale: 1.0,
    rotateDeg: 2.5,
    faceRight: false,
    leanDeg: 2.5,
    driftVw: -2,
  },
] as const;
