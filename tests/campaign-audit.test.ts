import { describe, expect, it } from 'vitest';
import {
  clone,
  createJelly,
  createLevelBoard,
  createSugarShells,
  findBestMove,
  findMatches,
  hasMove,
  LEVELS,
} from '../src/game/engine';
import { buildResolutionPlan } from '../src/game/resolution';

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('campaign playability audit', () => {
  it('starts every authored level full, match-free, and playable across eight deterministic seeds', () => {
    for (const level of LEVELS) {
      for (let attempt = 1; attempt <= 8; attempt++) {
        const start = createLevelBoard(level, seeded(level.levelId * 101 + attempt));

        expect(start.board).toHaveLength(level.rows);
        expect(start.board.every(row => row.length === level.columns && row.every(Boolean))).toBe(true);
        expect(findMatches(start.board).size).toBe(0);
        expect(hasMove(start.board)).toBe(true);
        expect(start.jelly.size).toBe(level.jellyCount);
        expect(createJelly(level.levelId).size).toBe(level.jellyCount);
      }

      expect(createSugarShells(level.levelId).size).toBe(level.shellCount ?? 0);
    }
  });

  it('resolves one legal, goal-aware turn on every authored level', () => {
    for (const level of LEVELS) {
      const levelNumber = level.levelId;
      const { board, jelly } = createLevelBoard(level, seeded(levelNumber * 211));
      const shells = createSugarShells(levelNumber);
      const move = findBestMove(board, level.goalType, level.goalColor, jelly, level.secondaryGoalType, shells);

      expect(move).not.toBeNull();
      if (!move) continue;

      const moved = clone(board);
      [moved[move[0][0]][move[0][1]], moved[move[1][0]][move[1][1]]] = [
        moved[move[1][0]][move[1][1]],
        moved[move[0][0]][move[0][1]],
      ];
      const matches = findMatches(moved);
      const plan = buildResolutionPlan({
        level,
        board: moved,
        matches,
        score: 0,
        goalProgress: 0,
        jelly,
        bossHealth: level.boss?.maxHealth ?? 0,
        sugarShells: shells,
        shellsCleared: 0,
        startingShellImpactCells: new Set(matches),
      }, seeded(levelNumber * 307));

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.board).toHaveLength(level.rows);
      expect(plan.board.every(row => row.length === level.columns && row.every(Boolean))).toBe(true);
      expect(findMatches(plan.board).size).toBe(0);
      expect(hasMove(plan.board)).toBe(true);
    }
  });
});
