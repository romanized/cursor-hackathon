"use client";

import { useContext } from "react";
import { ReducedMotionContext } from "@/components/providers/ReducedMotionProvider";

/**
 * Read the app-wide reduced-motion state.
 *
 * Returns the resolved boolean, or `null` before the client has determined it
 * (pre-hydration / first paint). Treat `null` as "unknown, don't animate yet"
 * when correctness matters; treat it as "not reduced" for purely decorative,
 * non-essential motion.
 *
 * @example
 * const reduced = useReducedMotion();
 * if (reduced) return; // skip the heavy scene
 */
export function useReducedMotion(): boolean | null {
  return useContext(ReducedMotionContext).prefersReducedMotion;
}
