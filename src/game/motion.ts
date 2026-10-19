/**
 * Compact motion budget: a basic match (swap + clear + one-row fall) is 216ms
 * of CSS motion; each cascade clear/drop step is capped at 200ms.
 */
export const GAME_MOTION = {
  swapAnimationMs: 88,
  rejectAnimationMs: 100,
  clearAnimationMs: 72,
  fallBaseMs: 48,
  fallPerRowMs: 8,
  fallMaxMs: 128,
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
