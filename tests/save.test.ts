import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from '../src/game/engine';
import { DEFAULT_SAVE, parseSave, SAVE_VERSION } from '../src/game/save';

describe('local progress data', () => {
  it('starts from sensible defaults when there is no save', () => {
    const save = parseSave(null);
    expect(save.level).toBe(1);
    expect(save.unlocked).toBe(1);
    expect(save.boosterCounts).toEqual(DEFAULT_SAVE.boosterCounts);
    expect(save.version).toBe(SAVE_VERSION);
  });

  it('validates values and merges partial booster inventories safely', () => {
    const save = parseSave(JSON.stringify({
      level: 40,
      unlocked: 8,
      bestScores: { '2': 1200, '121': 900, broken: 10, '3': -50 },
      completedLevels: { '2': true, '3': 'yes', '121': true },
      boosterCounts: { hammer: -4, line: 1.8, rainbow: 'not a number' },
      sound: false,
    }));

    expect(save.level).toBe(8);
    expect(save.unlocked).toBe(8);
    expect(save.bestScores).toEqual({ '2': 1200 });
    expect(save.completedLevels).toEqual({ '2': true });
    expect(save.bestWinScores).toEqual({ '2': 1200 });
    expect(save.boosterCounts).toEqual({ hammer: 0, line: 1, rainbow: 1 });
    expect(save.sound).toBe(false);
  });

  it('keeps a failed personal best from inflating campaign star scores', () => {
    const save = parseSave(JSON.stringify({
      level: 2,
      unlocked: 2,
      bestScores: { '1': 4000 },
      bestWinScores: { '1': 950 },
      completedLevels: { '1': true },
    }));
    expect(save.bestScores['1']).toBe(4000);
    expect(save.bestWinScores['1']).toBe(950);
  });

  it('preserves late-campaign progress through the new final world', () => {
    expect(LEVEL_COUNT).toBe(120);
    const save = parseSave(JSON.stringify({
      level: 120,
      unlocked: 120,
      bestScores: { '100': 3000, '120': 4800, '121': 9000 },
      completedLevels: { '100': true, '120': true, '121': true },
    }));
    expect(save.level).toBe(120);
    expect(save.unlocked).toBe(120);
    expect(save.bestScores).toEqual({ '100': 3000, '120': 4800 });
    expect(save.completedLevels).toEqual({ '100': true, '120': true });
  });

  it('recovers from malformed JSON and invalid object shapes', () => {
    expect(parseSave('{')).toEqual(expect.objectContaining({ level: 1, unlocked: 1 }));
    expect(parseSave('[]')).toEqual(expect.objectContaining({ level: 1, unlocked: 1 }));
  });
});
