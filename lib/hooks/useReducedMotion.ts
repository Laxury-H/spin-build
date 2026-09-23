import { matchesMediaQuery, useMediaQuery } from "./useMediaQuery";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * True when the user asked the OS for reduced motion. `false` on the server
 * and during hydration (animations are progressive enhancement: the reduced
 * path must never be required for correctness), then live, following changes.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

/** Non-React variant for imperative code (wheel physics, audio, one-shot effects). */
export function prefersReducedMotion(): boolean {
  return matchesMediaQuery(REDUCED_MOTION_QUERY);
}
