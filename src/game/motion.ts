/** Return no artificial wait when CSS motion is disabled for accessibility. */
export function motionWaitMs(durationMs: number, reducedMotion: boolean): number {
  if (reducedMotion || !Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return durationMs;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
