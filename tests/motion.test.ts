import { afterEach, describe, expect, it, vi } from 'vitest';
import { motionWaitMs, prefersReducedMotion } from '../src/game/motion';

afterEach(() => vi.unstubAllGlobals());

describe('motion-aware game timing', () => {
  it('skips JavaScript animation waits when reduced motion is enabled', () => {
    expect(motionWaitMs(188, true)).toBe(0);
  });

  it('reads the browser reduced-motion preference', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('window', { matchMedia });

    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('keeps requested timing when animations are enabled and clamps invalid waits', () => {
    expect(motionWaitMs(140, false)).toBe(140);
    expect(motionWaitMs(-1, false)).toBe(0);
    expect(motionWaitMs(Number.NaN, false)).toBe(0);
  });
});
