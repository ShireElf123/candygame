import { describe, expect, it } from 'vitest';
import { buildSwapSpecial, evaluateSwap, keyOf, LEVELS, makeCandy, makeIngredient, objectivesComplete, type LevelDefinition } from '../src/game/engine';
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

  it('preserves a deterministic refill cascade as ordered immutable board snapshots', () => {
    const values = [0, 0, 0, 0, 0.2, 0.4];
    let index = 0;
    const plan = buildResolutionPlan({
      level: threeByThreeLevel({ spawnWeights: colors }),
      board: boardWithBottomMatch(),
      matches: new Set([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]),
      score: 0,
      goalProgress: 0,
      jelly: new Set(),
      bossHealth: 0,
      sugarShells: new Map(),
      shellsCleared: 0,
    }, () => values[index++] ?? 0);

    expect(plan.steps.map(step => step.cascade)).toEqual([1, 2]);
    expect(plan.steps[0].clearCells).toEqual([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]);
    expect(plan.steps[0].boardAfterDrop[0].map(candy => candy.color)).toEqual([0, 0, 0]);
    expect(plan.steps[1].clearCells).toEqual([keyOf(0, 0), keyOf(0, 1), keyOf(0, 2)]);
    expect(plan.steps[1].boardAfterDrop[0].map(candy => candy.color)).toEqual([0, 1, 2]);
    expect(plan.totalCleared).toBe(6);
    expect(plan.reshuffleReason).toBeNull();
    expect(plan.board).toEqual(plan.steps[1].boardAfterDrop);
  });

  it('counts activated specials cumulatively without counting a newly-created special', () => {
    const board = boardWithBottomMatch();
    board[2][2] = makeCandy(0, 'striped-v');
    const values = [0.1, 0.4, 0.8];
    let index = 0;
    const activatedPlan = buildResolutionPlan({
      level: threeByThreeLevel({ goalType: 'score', secondaryGoalType: 'special', specialCount: 3 }),
      board,
      matches: new Set([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]),
      score: 0,
      goalProgress: 0,
      specialsActivated: 2,
      jelly: new Set(),
      bossHealth: 0,
      sugarShells: new Map(),
      shellsCleared: 0,
    }, () => values[index++ % values.length]);

    expect(activatedPlan.steps).toHaveLength(1);
    expect(activatedPlan.steps[0].specialsActivated).toBe(3);
    expect(activatedPlan.specialsActivated).toBe(3);

    const cascadeBoard = [
      [makeCandy(1), makeCandy(2), makeCandy(3), makeCandy(0, 'striped-h')],
      [makeCandy(2), makeCandy(3), makeCandy(4), makeCandy(5)],
      [makeCandy(3), makeCandy(4), makeCandy(5), makeCandy(1)],
      [makeCandy(0), makeCandy(0), makeCandy(0), makeCandy(2)],
    ];
    const cascadeValues = [0, 0, 0, 0, 0.2, 0.4, 0.6];
    let cascadeIndex = 0;
    const cascadePlan = buildResolutionPlan({
      level: threeByThreeLevel({ rows: 4, columns: 4, goalType: 'score', secondaryGoalType: 'special', specialCount: 1 }),
      board: cascadeBoard,
      matches: new Set([keyOf(3, 0), keyOf(3, 1), keyOf(3, 2)]),
      score: 0,
      goalProgress: 0,
      jelly: new Set(),
      bossHealth: 0,
      sugarShells: new Map(),
      shellsCleared: 0,
    }, () => cascadeValues[cascadeIndex++] ?? 0.8);
    expect(cascadePlan.steps.map(step => step.specialsActivated)).toEqual([0, 1]);
    expect(cascadePlan.specialsActivated).toBe(1);

    const fourMatchBoard = [
      [makeCandy(3), makeCandy(4), makeCandy(0), makeCandy(5)],
      [makeCandy(0), makeCandy(0), makeCandy(1), makeCandy(0)],
      [makeCandy(1), makeCandy(2), makeCandy(3), makeCandy(4)],
      [makeCandy(2), makeCandy(3), makeCandy(4), makeCandy(5)],
    ];
    const evaluation = evaluateSwap(fourMatchBoard, [0, 2], [1, 2]);
    expect(evaluation.valid).toBe(true);
    buildSwapSpecial(evaluation.board, evaluation.matches, [0, 2], [1, 2]);
    expect(evaluation.board[1][2].special).toBe('striped-v');
    expect(evaluation.matches.has(keyOf(1, 2))).toBe(false);

    const createdPlan = buildResolutionPlan({
      level: threeByThreeLevel({ rows: 4, columns: 4, goalType: 'score', secondaryGoalType: 'special', specialCount: 1 }),
      board: evaluation.board,
      matches: evaluation.matches,
      score: 0,
      goalProgress: 0,
      jelly: new Set(),
      bossHealth: 0,
      sugarShells: new Map(),
      shellsCleared: 0,
    }, () => 0.1);
    expect(createdPlan.specialsActivated).toBe(0);
  });

  it('records ingredient delivery in ordered resolution snapshots and objective completion', () => {
    const level = threeByThreeLevel({ goalType: 'ingredient', ingredientCount: 1 });
    const board = [
      [makeCandy(0), makeCandy(1), makeCandy(2)],
      [makeCandy(1), makeIngredient(), makeCandy(0)],
      [makeCandy(2), makeCandy(2), makeCandy(2)],
    ];
    const plan = buildResolutionPlan({
      level,
      board,
      matches: new Set([keyOf(2, 0), keyOf(2, 1), keyOf(2, 2)]),
      score: 0,
      goalProgress: 0,
      jelly: new Set(),
      bossHealth: 0,
      sugarShells: new Map(),
      shellsCleared: 0,
    }, () => 0.4);

    expect(plan.steps[0].ingredientsDeliveredThisWave).toBe(1);
    expect(plan.steps[0].ingredientsDelivered).toBe(1);
    expect(plan.steps[0].deliveredIngredientCells).toEqual([keyOf(2, 1)]);
    expect(plan.steps[0].boardForFallAnimation[2][1]).toMatchObject({ kind: 'ingredient' });
    expect(plan.steps[0].boardAfterDrop[2][1].kind).toBeUndefined();
    expect(plan.ingredientsDelivered).toBe(1);
    expect(plan.board.flat().some(piece => piece.kind === 'ingredient')).toBe(false);
    expect(objectivesComplete(level, plan.score, plan.goalProgress, plan.jelly.size, plan.bossHealth, plan.shellsCleared, plan.specialsActivated, plan.ingredientsDelivered)).toBe(true);
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
