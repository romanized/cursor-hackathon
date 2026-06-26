"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

/**
 * The ONE place GSAP plugins are registered.
 *
 * All GSAP plugins are free in 3.15 from the public `gsap` package and import
 * from subpaths. `registerPlugin` is idempotent, so re-importing this module (or
 * React Strict-Mode double-mount) cannot double-register. Every other module
 * imports `gsap` / `ScrollTrigger` / `EASE_EXPO` FROM HERE so registration is
 * guaranteed to have run first.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase);

/**
 * The locked Studio Black signature ease: cubic-bezier(0.32, 0.72, 0, 1).
 *
 * Heavy, mass-driven, fast-out/slow-settle — the project's single motion
 * fingerprint. `CustomEase.create` returns an ease function; we register it
 * under a stable name AND export the function so tweens can pass either
 * `ease: EASE_EXPO` or `ease: "expo-studio"`. Defaults are set globally so any
 * tween that omits `ease` still feels on-brand.
 */
export const EASE_NAME = "expo-studio" as const;
export const EASE_EXPO = CustomEase.create(EASE_NAME, "0.32,0.72,0,1");

gsap.defaults({ ease: EASE_EXPO, duration: 0.9 });

export { gsap, ScrollTrigger, SplitText, CustomEase, useGSAP };
