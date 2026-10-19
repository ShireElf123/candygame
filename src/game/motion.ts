/** CSS animation durations and the matching duration function for fall motion. */
export const GAME_MOTION = {
  swapAnimationMs: 116,
  rejectAnimationMs: 128,
  clearAnimationMs: 96,
  fallBaseMs: 92,
  fallPerRowMs: 15,
  fallMaxMs: 220,
} as const;

export function fallAnimationDuration(distance: number): number {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return Math.min(
    GAME_MOTION.fallMaxMs,
    GAME_MOTION.fallBaseMs + safeDistance * GAME_MOTION.fallPerRowMs,
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
