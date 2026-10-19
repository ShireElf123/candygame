/**
 * Readable match-3 motion timings.
 *
 * These values are a measured-test starting point, not a frame-rate guarantee:
 * browser/device profiling should validate the full move and cascade lifecycle.
 */
export const GAME_MOTION = {
  swapAnimationMs: 155,
  rejectAnimationMs: 170,
  clearAnimationMs: 125,
  fallBaseMs: 105,
  fallPerRowMs: 22,
  fallMaxMs: 240,
} as const;

export function boardImpactClass(pulse: number): 'juice-impact-a' | 'juice-impact-b' | null {
  if (!Number.isInteger(pulse) || pulse <= 0) return null;
  return pulse % 2 === 1 ? 'juice-impact-a' : 'juice-impact-b';
}

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
