import { describe, expect, it } from 'vitest';
import { keyOf, LEVELS, makeCandy, type LevelDefinition } from '../src/game/engine';
import { buildResolutionPlan } from '../src/game/resolution';

const colors = [0, 1, 2, 3, 4, 5].map(color => ({ color, weight: 1 }));

function threeByThreeLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    ...LEVELS[0],
    rows: 3,
    columns: 3,
    spawnWeights: colors,
    ...overrides,
  };
}

function boardWithBottomMatch() {
  return [
    [makeCandy(0), makeCandy(1), makeCandy(2)],
    [makeCandy(1), makeCandy(2), makeCandy(0)],
    [makeCandy(0), makeCandy(0), makeCandy(0)],
  ];
}

describe('pure cascade resolution plan', () => {
  it('returns clear, score, refill, and fall snapshots without mutating the input board', () => {
    const board = boardWithBottomMatch();
    const originalIds = board.flat().map(candy => candy.id);
    const randomColors = [0.1, 0.4, 0.8];
    let randomIndex = 0;
    const plan = buildResolutionPlan({
      level: threeByThreeLevel(),
      board,
      matches: new Set([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]),
      score: 40,
      goalProgress: 0,
      jelly: new Set(),
      bossHealth: 0,
      sugarShells: new Map(),
      shellsCleared: 0,
    }, () => randomColors[randomIndex++ % randomColors.length]);

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].points).toBe(180);
    expect(plan.score).toBe(220);
    expect(plan.totalCleared).toBe(3);
    expect(plan.steps[0].boardAfterDrop).toHaveLength(3);
    expect(Object.keys(plan.steps[0].fallDistances)).toHaveLength(9);
    expect(board.flat().map(candy => candy.id)).toEqual(originalIds);
  });

  it('tracks jelly and shell damage as data events for the animation layer', () => {
    const level = threeByThreeLevel({ goalType: 'jelly', secondaryGoalType: 'shell', shellCount: 1 });
    const plan = buildResolutionPlan({
      level,
      board: boardWithBottomMatch(),
      matches: new Set([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]),
      score: 0,
      goalProgress: 0,
      jelly: new Set([keyOf(2, 1)]),
      bossHealth: 0,
      sugarShells: new Map([[keyOf(2, 0), 1]]),
      shellsCleared: 0,
    }, (() => {
      const values = [0.1, 0.4, 0.8];
      let index = 0;
      return () => values[index++ % values.length];
    })());

    expect(plan.steps[0].jelly.size).toBe(0);
    expect(plan.steps[0].shellHitCells).toContain(keyOf(2, 0));
    expect(plan.steps[0].shellsHit).toBe(1);
    expect(plan.steps[0].shellsCleared).toBe(1);
    expect(plan.sugarShells.size).toBe(0);
  });
});
