import { blurReveal, fadeUp, stagger } from "@/lib/gsap/presets";
import type { SceneBuilder } from "@/hooks/useScrollScene";

/**
 * Result scene — a PLAY-ONCE "the render just finished" settle.
 *
 * NOT pinned, NOT scrubbed: it inherits `REVEAL_DEFAULTS` from `useScrollScene`
 * (start "top 82%", toggleActions "play none none reverse"). This is a pure
 * OUTPUT showcase, so there is NO raw->ad cross-dissolve, NO sweeping scrub-line,
 * and NO counting timecode — the frame rests at the finished state and the
 * furniture simply settles in.
 *
 * Sequence: header reveal -> the phone frame blur-settles in (the "render just
 * finished" beat — blurReveal is safe on a settling, non-pinned element) ->
 * captions stagger in -> the REC HUD + "Generated in 38s" chip + proof chips
 * fade up last. transform / opacity / filter only.
 *
 * Under reduced motion `useScrollScene` builds this same timeline then
 * `progress(1)`s it, landing everything visible; the <video> stays paused on its
 * poster (handled in the component, not here).
 *
 * Selectors are auto-scoped to the section ref by `useScrollScene`.
 */

/** Class hooks the component renders; kept here so markup + motion stay in sync. */
export const RESULT_CLASS = {
  header: "result-header",
  frame: "result-frame",
  caption: "result-caption",
  hud: "result-hud",
  chip: "result-chip",
  spec: "result-spec",
} as const;

export const buildResultScene: SceneBuilder = (tl) => {
  // Header settles first.
  tl.add(blurReveal(`.${RESULT_CLASS.header}`, { y: 24 }));

  // The phone frame resolves into focus — the "render just finished" settle.
  tl.add(blurReveal(`.${RESULT_CLASS.frame}`, { duration: 1.2 }), "-=0.6");

  // On-beat captions pop in over the finished ad.
  tl.add(
    stagger(
      `.${RESULT_CLASS.caption}`,
      { y: 16, scale: 0.94, transformOrigin: "center" },
      { each: 0.12, from: "start" },
    ),
    "-=0.5",
  );

  // The REC HUD, the "Generated in 38s" chip, and the spec proof row settle last.
  tl.add(fadeUp(`.${RESULT_CLASS.hud}`, { y: 12 }), "-=0.4");
  tl.add(fadeUp(`.${RESULT_CLASS.chip}`, { y: 16 }), "-=0.5");
  tl.add(fadeUp(`.${RESULT_CLASS.spec}`, { y: 12 }), "-=0.6");
};
