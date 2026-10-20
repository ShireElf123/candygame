import { describe, expect, it } from 'vitest';
import { parsePlaytestLaunch } from '../src/game/playtest';

describe('development campaign playtest launch', () => {
  it('does not enable locked-level access without a playtest query', () => {
    expect(parsePlaytestLaunch('', true)).toEqual({ enabled: false, level: 1 });
  });

  it('ignores playtest queries in production mode', () => {
    expect(parsePlaytestLaunch('?playtest=79', false)).toEqual({ enabled: false, level: 1 });
  });

  it('opens a requested authored level in development mode', () => {
    expect(parsePlaytestLaunch('?playtest=79', true)).toEqual({ enabled: true, level: 79 });
  });

  it('falls back safely for malformed or out-of-range levels while keeping test mode explicit', () => {
    expect(parsePlaytestLaunch('?playtest=abc', true)).toEqual({ enabled: true, level: 1 });
    expect(parsePlaytestLaunch('?playtest=0', true)).toEqual({ enabled: true, level: 1 });
    expect(parsePlaytestLaunch('?playtest=121', true)).toEqual({ enabled: true, level: 1 });
  });
});
