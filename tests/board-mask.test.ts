import { describe, expect, it } from 'vitest';
import {
  applySpecialSwap,
  buildSwapSpecial,
  createJelly,
  createLevelBoard,
  createSugarShells,
  dropMatches,
  evaluateSwap,
  expandSpecials,
  findBestMove,
  findMatches,
  freshBoard,
  hasMove,
  keyOf,
  LEVELS,
  makeCandy,
  makeVoidCell,
  nextPlayableCell,
  parseLevelManifest,
  shuffleBoard,
  type BoardMask,
  type Candy,
  type InitialGridCell,
} from '../src/game/engine';
import { buildResolutionPlan } from '../src/game/resolution';
import { createSeededRandom } from '../src/game/performance';
import { BOARD_SHAPE_PROTOTYPES, getBoardShapePrototype } from '../src/game/shape-prototypes';
import { parseShapeLabLaunch } from '../src/game/shape-lab-launch';

const TEST_SEED = 20261020;
const weights = [0, 1, 2, 3, 4, 5].map(color => ({ color, weight: 1 }));
const splitLaneMask: BoardMask = [
  '######',
  '######',
  '###.##',
  '######',
  '######',
  '######',
];

function levelManifest(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    defaults: { rows: 6, columns: 6, spawnWeights: weights },
    levels: [{
      levelId: 1,
      chapter: 1,
      chapterName: 'Mask Test',
      maxMoves: 12,
      targetScore: 850,
      objectives: [{ type: 'score', targetAmount: 850 }],
      ...overrides,
    }],
  };
}

function cellKinds(board: Candy[][]) {
  return board.map(row => row.map(candy => candy.kind === 'void' ? '.' : '#').join(''));
}

describe('mask-aware board rules', () => {
  it('parses a void mask and creates playable candies only in marked cells', () => {
    const level = parseLevelManifest(levelManifest({ boardMask: splitLaneMask }))[0];
    const start = createLevelBoard(level, createSeededRandom(17));
    expect(level.boardMask).toEqual(splitLaneMask);
    expect(cellKinds(start.board)).toEqual(splitLaneMask);
    expect(start.board[2][3].kind).toBe('void');
    expect(findMatches(start.board).size).toBe(0);
    expect(hasMove(start.board)).toBe(true);
  });

  it('rejects malformed masks and masked authored grids before gameplay', () => {
    expect(() => parseLevelManifest(levelManifest({ boardMask: ['######'] }))).toThrow(/must have 6 rows/);
    expect(() => parseLevelManifest(levelManifest({ boardMask: ['######', '######', '##X.##', '######', '######', '######'] })))
      .toThrow(/characters of/);
    expect(() => parseLevelManifest(levelManifest({
      boardMask: ['#.#.#.', '.#.#.#', '#.#.#.', '.#.#.#', '#.#.#.', '.#.#.#'],
    }))).toThrow(/fully playable 3×3 area/);
    const shapedInitialGrid = Array.from({ length: 6 }, () => [0, 1, 2, 3, 4, 5]);
    expect(parseLevelManifest(levelManifest({ boardMask: splitLaneMask, initialGrid: shapedInitialGrid }))[0].boardMask)
      .toEqual(splitLaneMask);
    const objectiveInHole = shapedInitialGrid.map(row => [...row] as InitialGridCell[]);
    objectiveInHole[2][3] = 'J';
    expect(() => parseLevelManifest(levelManifest({
      boardMask: splitLaneMask,
      initialGrid: objectiveInHole,
      objectives: [{ type: 'jelly', targetAmount: 1 }],
    }))).toThrow(/cannot place objectives in a void cell/);
  });

  it('places ingredients on the first playable row and validates their route to the exit', () => {
    const topCutoutMask: BoardMask = ['......', '......', '######', '######', '######', '######'];
    const level = parseLevelManifest(levelManifest({
      objectives: [{ type: 'ingredient', targetAmount: 1 }],
      boardMask: topCutoutMask,
    }))[0];
    const start = createLevelBoard(level, createSeededRandom(29));
    const ingredient = start.board.flatMap((row, rowIndex) => row.flatMap((candy, columnIndex) =>
      candy.kind === 'ingredient' ? [[rowIndex, columnIndex]] : [],
    ));
    expect(ingredient).toEqual([[2, 3]]);
    expect(level.boardMask?.[ingredient[0][0]][ingredient[0][1]]).toBe('#');
    expect(() => parseLevelManifest(levelManifest({
      objectives: [{ type: 'ingredient', targetAmount: 1 }],
      boardMask: splitLaneMask,
    }))).toThrow(/ingredient drop lanes continuous/);
  });

  it('does not match through a void cell and never allows a swap onto one', () => {
    const board: Candy[][] = [
      [makeCandy(0), makeCandy(0), makeVoidCell(), makeCandy(0), makeCandy(0)],
      [makeCandy(1), makeCandy(2), makeVoidCell(), makeCandy(3), makeCandy(4)],
      [makeCandy(2), makeCandy(3), makeVoidCell(), makeCandy(4), makeCandy(5)],
    ];
    expect(findMatches(board)).toEqual(new Set());
    expect(evaluateSwap(board, [0, 1], [0, 2])).toMatchObject({ valid: false, matches: new Set() });

    board[0][2] = makeCandy(0);
    expect(findMatches(board)).toEqual(new Set(['0:0', '0:1', '0:2', '0:3', '0:4']));
  });

  it('moves keyboard navigation over voids without changing the grid frame', () => {
    const board = freshBoard(createSeededRandom(23), weights, 6, 6, splitLaneMask);
    expect(nextPlayableCell(board, [2, 2], [0, 1])).toEqual([2, 4]);
    expect(nextPlayableCell(board, [2, 4], [0, 1])).toEqual([2, 5]);
    expect(nextPlayableCell(board, [2, 5], [0, 1])).toBeNull();
    expect(nextPlayableCell(board, [2, 2], [1, 1])).toBeNull();
  });

  it('keeps gravity and refill inside each vertical segment without filling holes', () => {
    const board = freshBoard(createSeededRandom(31), weights, 6, 6, splitLaneMask);
    const aboveHole = [board[0][3].id, board[1][3].id];
    const holeId = board[2][3].id;
    const lowerTop = board[3][3].id;
    const lowerMiddle = board[4][3].id;
    const result = dropMatches(board, new Set([keyOf(5, 3)]), weights, createSeededRandom(32));

    expect(result.board[0][3].id).toBe(aboveHole[0]);
    expect(result.board[1][3].id).toBe(aboveHole[1]);
    expect(result.board[2][3]).toMatchObject({ id: holeId, kind: 'void' });
    expect(result.board[3][3].id).not.toBe(lowerTop);
    expect(result.board[4][3].id).toBe(lowerTop);
    expect(result.board[5][3].id).toBe(lowerMiddle);
    expect(result.board[2][3].id).toBe(result.boardForFallAnimation[2][3].id);
    expect(result.fallDistances[holeId]).toBeUndefined();
    expect(cellKinds(result.board)).toEqual(splitLaneMask);
  });

  it('keeps specials, reshuffles, jelly and shells away from voids', () => {
    const board = freshBoard(createSeededRandom(45), weights, 6, 6, splitLaneMask);
    board[0][3] = makeCandy(board[0][3].color, 'striped-v');
    const clear = expandSpecials(board, new Set([keyOf(0, 3)]));
    expect(clear).not.toContain(keyOf(2, 3));
    expect(clear).toContain(keyOf(3, 3));

    const bombBoard = board.map(row => row.map(candy => ({ ...candy })));
    bombBoard[0][0] = makeCandy(1, 'color');
    bombBoard[0][1] = makeCandy(3);
    bombBoard[2][2] = makeCandy(3);
    const bombClear = applySpecialSwap(bombBoard, [0, 0], [0, 1], new Set()).matches;
    expect(bombClear).not.toContain(keyOf(2, 3));
    expect(bombClear).toContain(keyOf(2, 2));
    expect(applySpecialSwap(bombBoard, [0, 0], [2, 3], new Set([keyOf(0, 1)])).matches.size).toBe(0);

    const shuffled = shuffleBoard(board, createSeededRandom(46), weights);
    expect(cellKinds(shuffled)).toEqual(splitLaneMask);
    expect(findMatches(shuffled).size).toBe(0);
    expect(hasMove(shuffled)).toBe(true);

    const level = parseLevelManifest(levelManifest({
      objectives: [
        { type: 'jelly', targetAmount: 4 },
        { type: 'shell', targetAmount: 3 },
      ],
      boardMask: splitLaneMask,
    }))[0];
    const jelly = createJelly(level);
    const shells = createSugarShells(level);
    for (const key of [...jelly, ...shells.keys()]) {
      const [row, column] = key.split(':').map(Number);
      expect(level.boardMask?.[row][column]).toBe('#');
    }
    expect(jelly).toHaveLength(4);
    expect(shells).toHaveLength(3);
  });

  it('resolves an actual move without changing any prototype void locations', () => {
    const prototype = getBoardShapePrototype(6);
    const start = createLevelBoard(prototype.level, createSeededRandom(2026));
    const move = findBestMove(start.board, prototype.level.goalType, prototype.level.goalColor, new Set());
    expect(move).not.toBeNull();
    const evaluation = evaluateSwap(start.board, move![0], move![1]);
    const matches = new Set(evaluation.matches);
    if (evaluation.activatesSpecial) applySpecialSwap(evaluation.board, move![0], move![1], matches);
    else buildSwapSpecial(evaluation.board, matches, move![0], move![1]);
    const plan = buildResolutionPlan({
      level: prototype.level,
      board: evaluation.board,
      matches,
      score: 0,
      goalProgress: 0,
      jelly: start.jelly,
      bossHealth: 0,
      sugarShells: new Map(),
      shellsCleared: 0,
    }, createSeededRandom(2027));

    expect(plan.steps.length).toBeGreaterThan(0);
    expect(cellKinds(plan.board)).toEqual(prototype.boardMask);
    expect(findMatches(plan.board).size).toBe(0);
    expect(hasMove(plan.board)).toBe(true);
  });
});

describe('isolated board-shape prototypes', () => {
  it('keeps six distinct layouts outside the unchanged 120-level campaign', () => {
    expect(LEVELS).toHaveLength(120);
    expect(LEVELS.every(level => level.boardMask === undefined)).toBe(true);
    expect(BOARD_SHAPE_PROTOTYPES).toHaveLength(6);
    expect(new Set(BOARD_SHAPE_PROTOTYPES.map(prototype => prototype.boardMask.join('/'))).size).toBe(6);
    expect(BOARD_SHAPE_PROTOTYPES.map(prototype => prototype.name)).toEqual([
      'Bellflower', 'Twin Isles', 'Tide Bowl', 'Switchback', 'Crescent Reach', 'Pocket Current',
    ]);

    const sharedPlayableColors = new Map<string, number>();
    for (const prototype of BOARD_SHAPE_PROTOTYPES) {
      expect(prototype.boardMask).toHaveLength(8);
      expect(prototype.boardMask.every(row => row.length === 8 && /^[#.]+$/.test(row))).toBe(true);
      expect(prototype.level.moves).toBe(LEVELS[0].moves);
      expect(prototype.level.target).toBe(LEVELS[0].target);
      const start = createLevelBoard(prototype.level, createSeededRandom(TEST_SEED));
      expect(cellKinds(start.board)).toEqual(prototype.boardMask);
      expect(findMatches(start.board).size).toBe(0);
      expect(hasMove(start.board)).toBe(true);
      for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
        if (prototype.boardMask[row][column] !== '#') continue;
        const key = keyOf(row, column);
        if (sharedPlayableColors.has(key)) expect(start.board[row][column].color).toBe(sharedPlayableColors.get(key));
        else sharedPlayableColors.set(key, start.board[row][column].color);
      }
    }
  });

  it('launches only in development and selects a valid prototype safely', () => {
    expect(parseShapeLabLaunch('?shapelab=3', true)).toEqual({ enabled: true, prototypeId: 3 });
    expect(parseShapeLabLaunch('?shapelab=9', true)).toEqual({ enabled: true, prototypeId: 1 });
    expect(parseShapeLabLaunch('?shapelab=abc', true)).toEqual({ enabled: true, prototypeId: 1 });
    expect(parseShapeLabLaunch('?shapelab=3', false)).toEqual({ enabled: false, prototypeId: 1 });
    expect(parseShapeLabLaunch('', true)).toEqual({ enabled: false, prototypeId: 1 });
  });
});
