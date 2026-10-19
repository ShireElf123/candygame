/**
 * Two intentionally different timing profiles for a controlled dev A/B. The
 * default/production profile preserves the live 79e7773 timings in `compact`;
 * `readable` is an explicit experiment, not an unmeasured production change.
 */
export const GAME_MOTION_PROFILES = {
  readable: {
    swapAnimationMs: 150,
    rejectAnimationMs: 170,
    clearAnimationMs: 120,
    fallBaseMs: 92,
    fallPerRowMs: 24,
    fallMaxMs: 260,
  },
  compact: {
    swapAnimationMs: 88,
    rejectAnimationMs: 100,
    clearAnimationMs: 72,
    fallBaseMs: 48,
    fallPerRowMs: 8,
    fallMaxMs: 128,
  },
} as const;

export type MotionProfileName = keyof typeof GAME_MOTION_PROFILES;
export type MotionProfile = (typeof GAME_MOTION_PROFILES)[MotionProfileName];

const DEV_OR_TEST = import.meta.env.DEV || import.meta.env.MODE === 'test';

export function motionProfileFromSearch(search: string, allowOverride = DEV_OR_TEST): MotionProfileName {
  if (!allowOverride) return 'compact';
  const requested = new URLSearchParams(search).get('motion');
  return requested === 'readable' ? 'readable' : 'compact';
}

function readSearch(): string {
  if (!DEV_OR_TEST || typeof window === 'undefined') return '';
  try {
    return window.location.search;
  } catch {
    return '';
  }
}

export const GAME_MOTION_PROFILE = motionProfileFromSearch(readSearch());
export const GAME_MOTION = GAME_MOTION_PROFILES[GAME_MOTION_PROFILE];

export function boardImpactClass(pulse: number): 'juice-impact-a' | 'juice-impact-b' | null {
  if (!Number.isInteger(pulse) || pulse <= 0) return null;
  return pulse % 2 === 1 ? 'juice-impact-a' : 'juice-impact-b';
}

export function fallAnimationDuration(distance: number, profile: MotionProfile = GAME_MOTION): number {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return Math.min(
    profile.fallMaxMs,
    profile.fallBaseMs + safeDistance * profile.fallPerRowMs,
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
