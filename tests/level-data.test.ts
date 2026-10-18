import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  createLevelBoard,
  findMatches,
  hasMove,
  LEVEL_COUNT,
  LEVELS,
  parseLevelManifest,
  type LevelDefinition,
} from '../src/game/engine';

const defaultWeights = [0, 1, 2, 3, 4, 5].map(color => ({ color, weight: 1 }));

function oneLevel(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    defaults: { rows: 8, columns: 8, spawnWeights: defaultWeights },
    levels: [{
      levelId: 1,
      chapter: 1,
      chapterName: 'Test Garden',
      maxMoves: 12,
      targetScore: 600,
      objectives: [{ type: 'score', targetAmount: 600 }],
      ...overrides,
    }],
  };
}

describe('data-driven campaign levels', () => {
  it('loads the whole campaign from the validated JSON manifest', () => {
    expect(LEVELS).toHaveLength(LEVEL_COUNT);
    expect(CHAPTERS).toHaveLength(10);
    expect(LEVELS[0]).toMatchObject({ levelId: 1, rows: 8, columns: 8, moves: 32, target: 850, goalType: 'score' });
    expect(LEVELS[7]).toMatchObject({ levelId: 8, goalType: 'collect', secondaryGoalType: 'shell', shellCount: 4 });
    expect(LEVELS[9].boss?.maxHealth).toBe(6);
    expect(LEVELS.every(level => level.spawnWeights.length >= 3)).toBe(true);
  });

  it('rejects malformed objectives and board matrices before play', () => {
    expect(() => parseLevelManifest(oneLevel({ objectives: [{ type: 'teleport', targetAmount: 1 }] })))
      .toThrow(/unknown objective type/);
    expect(() => parseLevelManifest(oneLevel({
      rows: 3,
      columns: 4,
      initialGrid: [[0, 1, 2, 3], [1, 2, 3, 4]],
    }))).toThrow(/must have 3 rows/);
  });

  it('supports authored color layouts and J-marked jelly in rectangular boards', () => {
    const level = parseLevelManifest(oneLevel({
      rows: 3,
      columns: 4,
      objectives: [{ type: 'jelly', targetAmount: 1 }],
      spawnWeights: [{ color: 0, weight: 1 }, { color: 1, weight: 1 }, { color: 2, weight: 1 }],
      initialGrid: [
        [0, 1, 0, 2],
        [1, 'J', 2, 3],
        [2, 1, 3, 4],
      ],
    }))[0] as LevelDefinition;
    const start = createLevelBoard(level, () => 0.2);

    expect(start.board).toHaveLength(3);
    expect(start.board.every(row => row.length === 4)).toBe(true);
    expect(start.jelly).toEqual(new Set(['1:1']));
    expect(findMatches(start.board).size).toBe(0);
    expect(hasMove(start.board)).toBe(true);
  });
});
