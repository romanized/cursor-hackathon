/**
 * Barrel for the design-system primitives.
 *
 * Token-styled, GSAP-free building blocks shared across sections. Importing from
 * here keeps section code reading against the design system, not file paths.
 */
export { Container, type ContainerProps } from "./Container";
export { Timecode, type TimecodeProps } from "./Timecode";
export { Eyebrow, type EyebrowProps } from "./Eyebrow";
export { RecBadge, type RecBadgeProps } from "./RecBadge";
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./Button";
export { PhoneFrame, type PhoneFrameProps } from "./PhoneFrame";
export { WindowChrome, type WindowChromeProps } from "./WindowChrome";
export { AdCard, type AdCardProps, type AdCardVariant } from "./AdCard";
export { VideoCard, type VideoCardProps } from "./VideoCard";
