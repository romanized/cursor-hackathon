import {
  TemplateIcon,
  VoiceIcon,
  CaptionIcon,
  MotionIcon,
  BriefIcon,
  TrendIcon,
  type FeatureIcon,
} from "./icons";

/**
 * The capability set rendered by the Features bento.
 *
 * One cell per item (no empty tiles). `span` controls the bento footprint on the
 * 6-column desktop grid: the two anchor capabilities take a wider 3-col cell, the
 * rest take a 2-col cell — six items resolve to two clean rows with no gaps.
 * `meta` is the Geist Mono micro-label that sells the edit-suite authenticity.
 */
export interface Feature {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Mono micro-label, e.g. an engine/model name or a spec. */
  readonly meta: string;
  readonly icon: FeatureIcon;
  /** Desktop column span on the 6-col grid: 2 (standard) or 3 (wide anchor). */
  readonly span: 2 | 3;
}

export const FEATURES: readonly Feature[] = [
  {
    id: "templates",
    title: "Skeleton AI templates",
    description:
      "Start from proven hook structures — pattern interrupts, problem-agitate, fast unboxings — pre-blocked beat by beat so the cut already works.",
    meta: "120+ structures",
    icon: TemplateIcon,
    span: 3,
  },
  {
    id: "voiceover",
    title: "Voiceover in 30+ voices",
    description:
      "Cast a creator voice that fits the product. Natural cadence, breath, and emphasis — generated and timed to the script in one pass.",
    meta: "ENGINE / vox-2",
    icon: VoiceIcon,
    span: 3,
  },
  {
    id: "captions",
    title: "Auto-captions on beat",
    description:
      "Word-level captions snap to the voiceover and punch on the downbeat — styled to match the platform, ready to retain the scroll.",
    meta: "Word-level sync",
    icon: CaptionIcon,
    span: 2,
  },
  {
    id: "motion",
    title: "Image → Video motion",
    description:
      "Feed a flat product shot; get parallax, push-ins, and handheld drift that reads like a real shoot — no footage required.",
    meta: "Still → 1080p",
    icon: MotionIcon,
    span: 2,
  },
  {
    id: "brief",
    title: "Brief editor",
    description:
      "Steer angle, audience, and tone in a single brief. Edit the script inline and re-render only the shots you touched.",
    meta: "Inline rerender",
    icon: BriefIcon,
    span: 2,
  },
  {
    id: "trends",
    title: "Trends-aware hooks",
    description:
      "Hook lines are written against what is breaking out this week on TikTok and Reels — so the first second earns the next ten.",
    meta: "Refreshed weekly",
    icon: TrendIcon,
    span: 3,
  },
] as const;
