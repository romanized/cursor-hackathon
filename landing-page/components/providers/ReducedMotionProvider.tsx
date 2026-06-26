"use client";

import {
  createContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ReducedMotionState } from "@/types";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Context carrying the resolved `prefers-reduced-motion` state.
 *
 * `prefersReducedMotion` is `null` until the client resolves the media query —
 * this lets consumers (and `useScrollScene`) hold off on committing to a motion
 * path before the client knows, avoiding a hydration mismatch where the server
 * (which can't read the query) and client disagree.
 */
export const ReducedMotionContext = createContext<ReducedMotionState>({
  prefersReducedMotion: null,
});

/** Subscribe a callback to media-query changes (the external store). */
function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Client snapshot: the live match value. */
function getSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Server snapshot: `null` (the query can't be read on the server). */
function getServerSnapshot(): null {
  return null;
}

/**
 * Resolves `prefers-reduced-motion` and exposes it via context.
 *
 * Uses `useSyncExternalStore` — the React-19-idiomatic way to subscribe to an
 * external store (the media query) without cascading renders. SSR-safe: the
 * server snapshot is `null` and the client subscribes after hydration, so the
 * value transitions cleanly from "unknown" to the resolved boolean and tracks
 * live OS-level changes. Mount this ABOVE `SmoothScrollProvider` so the
 * smooth-scroll layer can decide not to engage under reduce.
 */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const value = useMemo<ReducedMotionState>(
    () => ({ prefersReducedMotion }),
    [prefersReducedMotion],
  );

  return (
    <ReducedMotionContext.Provider value={value}>
      {children}
    </ReducedMotionContext.Provider>
  );
}
