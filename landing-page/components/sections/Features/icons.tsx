import type { SVGProps } from "react";

/**
 * Section-local iconography.
 *
 * Hand-drawn inline SVGs on a 24px grid, 1.5 stroke, `currentColor` so they
 * inherit text color from the cell (muted at rest, brighter on the icon plate)
 * — they MUST never carry the locked lime accent. Kept here (not in `ui/`) so
 * the Features redesign stays self-contained.
 */

export type FeatureIcon = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

const base: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

/** Layered template / skeleton cards. */
export const TemplateIcon: FeatureIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="3" width="11" height="14" rx="1.5" />
    <path d="M17 6h4v15H8v-4" />
    <path d="M6 8h5M6 11h5M6 14h3" />
  </svg>
);

/** Waveform / voiceover. */
export const VoiceIcon: FeatureIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3 12h2M19 12h2" />
    <path d="M7 9v6M11 5v14M15 8v8" />
  </svg>
);

/** Caption bars on a beat grid. */
export const CaptionIcon: FeatureIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 13h6M7 16h10" />
    <path d="M7 9.5h.01" />
  </svg>
);

/** Still frame morphing into motion (image -> video). */
export const MotionIcon: FeatureIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="m9 9 4 3-4 3V9Z" />
    <path d="M19 8v8M21.5 10v4" />
  </svg>
);

/** Brief / document with prompt lines. */
export const BriefIcon: FeatureIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M6 3h8l4 4v14H6V3Z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6M9 15h6M9 18h4" />
  </svg>
);

/** Trend-aware spark / rising signal. */
export const TrendIcon: FeatureIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3 17l5-5 3 3 6-7" />
    <path d="M17 8h4v4" />
    <path d="M3 21h18" />
  </svg>
);
