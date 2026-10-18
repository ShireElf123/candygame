import { describe, expect, it } from 'vitest';
import {
  applySpecialSwap,
  bossDamageForClear,
  buildSwapSpecial,
  COLORS,
  createJelly,
  dropMatches,
  expandSpecials,
  findBestMove,
  findMatches,
  freshBoard,
  goalsForLevel,
  hasGoal,
  hasMove,
  keyOf,
  LEVELS,
  makeCandy,
  objectiveProgressPercent,
  objectivesComplete,
  shuffleBoard,
  SIZE,
  type Candy,
} from '../src/game/engine';
import { starsForCampaign, starsForScore } from '../src/game/progress';

function seeded(seed = 7) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function emptyBoard(): Candy[][] {
  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => makeCandy((row + col) % COLORS.length)),
  );
}

describe('board generation and resolution', () => {
  it('creates a full, match-free board with at least one legal move', () => {
    const board = freshBoard(seeded(21));
    expect(board).toHaveLength(SIZE);
    expect(board.every(row => row.length === SIZE && row.every(Boolean))).toBe(true);
    expect(findMatches(board).size).toBe(0);
    expect(hasMove(board)).toBe(true);
  });

  it('finds horizontal and vertical runs without missing intersections', () => {
    const board = emptyBoard();
    for (let col = 1; col <= 4; col++) board[2][col] = makeCandy(0);
    for (let row = 1; row <= 4; row++) board[row][3] = makeCandy(0);

    const matches = findMatches(board);
    expect(matches.size).toBe(7);
    expect(matches.has(keyOf(2, 1))).toBe(true);
    expect(matches.has(keyOf(4, 3))).toBe(true);
  });

  it('drops cleared pieces, refills every cell, and returns new candy ids', () => {
    const board = emptyBoard();
    const originalIds = new Set(board.flat().map(candy => candy.id));
    const { board: result, spawned } = dropMatches(board, new Set([keyOf(7, 0), keyOf(6, 0)]));

    expect(result).toHaveLength(SIZE);
    expect(result.flat()).toHaveLength(SIZE * SIZE);
    expect(result.flat().every(Boolean)).toBe(true);
    expect(spawned).toHaveLength(2);
    expect(spawned.every(id => !originalIds.has(id))).toBe(true);
    expect(new Set(result.flat().map(candy => candy.id)).size).toBe(SIZE * SIZE);
  });

  it('reshuffles without creating a match or losing candies and specials', () => {
    const board = freshBoard(seeded(73));
    board[0][0] = makeCandy(2, 'wrapped');
    board[4][4] = makeCandy(5, 'striped-v');
    const idsBefore = board.flat().map(candy => candy.id).sort((a, b) => a - b);
    const boardBefore = board.flat().map(candy => ({ ...candy }));
    const result = shuffleBoard(board, seeded(91));

    expect(findMatches(result).size).toBe(0);
    expect(hasMove(result)).toBe(true);
    expect(result.flat().map(candy => candy.id).sort((a, b) => a - b)).toEqual(idsBefore);
    expect(result.flat().filter(candy => candy.special)).toHaveLength(2);
    expect(board.flat()).toEqual(boardBefore);
  });

  it('recommends a legal adjacent move', () => {
    const board = freshBoard(seeded(102));
    const move = findBestMove(board, 'score', 0, new Set());
    expect(move).not.toBeNull();
    if (!move) return;
    expect(Math.abs(move[0][0] - move[1][0]) + Math.abs(move[0][1] - move[1][1])).toBe(1);
    const moved = board.map(row => row.map(candy => ({ ...candy })));
    [moved[move[0][0]][move[0][1]], moved[move[1][0]][move[1][1]]] = [
      moved[move[1][0]][move[1][1]],
      moved[move[0][0]][move[0][1]],
    ];
    expect(findMatches(moved).size > 0 || Boolean(moved[move[0][0]][move[0][1]].special || moved[move[1][0]][move[1][1]].special)).toBe(true);
  });
});

describe('special candy rules', () => {
  it('creates a striped candy for a four-match and a color candy for five', () => {
    const fourBoard = emptyBoard();
    fourBoard[0][0] = makeCandy(2);
    fourBoard[0][1] = makeCandy(2);
    fourBoard[0][2] = makeCandy(1);
    fourBoard[0][3] = makeCandy(2);
    fourBoard[1][2] = makeCandy(2);
    [fourBoard[0][2], fourBoard[1][2]] = [fourBoard[1][2], fourBoard[0][2]];
    const fourMatches = findMatches(fourBoard);
    expect(fourMatches.size).toBe(4);
    buildSwapSpecial(fourBoard, fourMatches, [0, 2], [1, 2]);
    expect(fourBoard[0][2].special).toBe('striped-v');
    expect(fourMatches.has(keyOf(0, 2))).toBe(false);

    const fiveBoard = emptyBoard();
    fiveBoard[0][0] = makeCandy(4);
    fiveBoard[0][1] = makeCandy(4);
    fiveBoard[0][2] = makeCandy(2);
    fiveBoard[0][3] = makeCandy(4);
    fiveBoard[0][4] = makeCandy(4);
    fiveBoard[1][2] = makeCandy(4);
    [fiveBoard[0][2], fiveBoard[1][2]] = [fiveBoard[1][2], fiveBoard[0][2]];
    const fiveMatches = findMatches(fiveBoard);
    expect(fiveMatches.size).toBe(5);
    buildSwapSpecial(fiveBoard, fiveMatches, [0, 2], [1, 2]);
    expect(fiveBoard[0][2].special).toBe('color');
  });

  it('creates a wrapped candy at a five-cell T intersection', () => {
    const board = emptyBoard();
    board[3][1] = makeCandy(1);
    board[3][2] = makeCandy(4);
    board[3][3] = makeCandy(4);
    board[3][4] = makeCandy(4);
    board[2][3] = makeCandy(4);
    board[1][3] = makeCandy(1);
    board[4][3] = makeCandy(4);
    const matches = findMatches(board);
    expect(matches.size).toBe(5);
    buildSwapSpecial(board, matches, [3, 3], [3, 2]);
    expect(board[3][3].special).toBe('wrapped');
  });

  it('expands striped and wrapped effects, including chained effects', () => {
    const board = emptyBoard();
    board[4][2] = makeCandy(2, 'striped-h');
    board[4][6] = makeCandy(1, 'wrapped');
    const cleared = expandSpecials(board, new Set([keyOf(4, 2)]));

    for (let col = 0; col < SIZE; col++) expect(cleared.has(keyOf(4, col))).toBe(true);
    expect(cleared.has(keyOf(3, 5))).toBe(true);
    expect(cleared.has(keyOf(5, 7))).toBe(true);
  });

  it('consumes both pieces when activating a stripe and clears the matching line', () => {
    const board = emptyBoard();
    board[2][3] = makeCandy(2, 'striped-h');
    board[2][4] = makeCandy(5);
    const effect = applySpecialSwap(board, [2, 3], [2, 4], new Set());
    const matches = expandSpecials(board, effect.matches);

    expect(matches.has(keyOf(2, 3))).toBe(true);
    expect(matches.has(keyOf(2, 4))).toBe(true);
    for (let col = 0; col < SIZE; col++) expect(matches.has(keyOf(2, col))).toBe(true);
  });

  it.each([
    { label: 'parallel horizontal stripes', one: 'striped-h', two: 'striped-h', a: [2, 3] as [number, number], b: [2, 4] as [number, number], center: [2, 4] as [number, number] },
    { label: 'parallel vertical stripes', one: 'striped-v', two: 'striped-v', a: [2, 4] as [number, number], b: [3, 4] as [number, number], center: [3, 4] as [number, number] },
    { label: 'perpendicular horizontal swap', one: 'striped-h', two: 'striped-v', a: [2, 3] as [number, number], b: [2, 4] as [number, number], center: [2, 4] as [number, number] },
    { label: 'perpendicular vertical swap', one: 'striped-v', two: 'striped-h', a: [2, 3] as [number, number], b: [3, 3] as [number, number], center: [3, 3] as [number, number] },
  ])('fires one row and one column for $label', ({ one, two, a, b, center }) => {
    const board = emptyBoard();
    board[a[0]][a[1]] = makeCandy(1, one);
    board[b[0]][b[1]] = makeCandy(4, two);
    const effect = applySpecialSwap(board, a, b, new Set());
    const cleared = expandSpecials(board, effect.matches);

    for (let col = 0; col < SIZE; col++) expect(cleared.has(keyOf(center[0], col))).toBe(true);
    for (let row = 0; row < SIZE; row++) expect(cleared.has(keyOf(row, center[1]))).toBe(true);
    expect(cleared.has(keyOf((center[0] + 3) % SIZE, (center[1] + 3) % SIZE))).toBe(false);
  });

  it('requires both goals and tracks the least-complete objective on mixed levels', () => {
    const scoreAndJelly = LEVELS.find(level => level.secondaryGoalType && hasGoal(level, 'score') && hasGoal(level, 'jelly'))!;
    const jellyLevelNumber = LEVELS.indexOf(scoreAndJelly) + 1;
    const jellyTotal = createJelly(jellyLevelNumber).size;

    expect(goalsForLevel(scoreAndJelly)).toHaveLength(2);
    expect(objectivesComplete(scoreAndJelly, scoreAndJelly.target, 0, jellyTotal)).toBe(false);
    expect(objectivesComplete(scoreAndJelly, scoreAndJelly.target, 0, 0)).toBe(true);
    expect(objectiveProgressPercent(scoreAndJelly, scoreAndJelly.target, 0, jellyTotal, jellyTotal)).toBe(0);
    expect(objectiveProgressPercent(scoreAndJelly, scoreAndJelly.target, 0, 0, jellyTotal)).toBe(100);

    const scoreAndCollect = LEVELS.find(level => level.secondaryGoalType && hasGoal(level, 'score') && hasGoal(level, 'collect'))!;
    expect(objectivesComplete(scoreAndCollect, scoreAndCollect.target - 1, scoreAndCollect.goalCount, 0)).toBe(false);
    expect(objectivesComplete(scoreAndCollect, scoreAndCollect.target, scoreAndCollect.goalCount, 0)).toBe(true);
  });

  it('adds a named boss finale to every chapter and tracks remaining boss power', () => {
    const bossLevels = LEVELS.filter(level => level.boss);
    expect(bossLevels).toHaveLength(10);
    expect(bossLevels.map(level => LEVELS.indexOf(level) + 1)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(new Set(bossLevels.map(level => level.boss?.name)).size).toBe(10);

    const finale = bossLevels[0];
    const boss = finale.boss!;
    expect(goalsForLevel(finale)).toEqual(['boss']);
    expect(objectivesComplete(finale, 0, 0, 0, boss.maxHealth)).toBe(false);
    expect(objectivesComplete(finale, 0, 0, 0, 0)).toBe(true);
    expect(objectiveProgressPercent(finale, 0, 0, 0, 0, boss.maxHealth)).toBe(0);
    expect(objectiveProgressPercent(finale, 0, 0, 0, 0, Math.floor(boss.maxHealth / 2))).toBe(50);
    expect(objectiveProgressPercent(finale, 0, 0, 0, 0, 0)).toBe(100);
    expect(bossDamageForClear(3, 1)).toBe(1);
    expect(bossDamageForClear(8, 1)).toBe(2);
    expect(bossDamageForClear(3, 2)).toBe(2);
    expect(bossDamageForClear(-1, 0)).toBe(1);
  });

  it('marks jelly cells deterministically and keeps campaign star tiers consistent', () => {
    expect(createJelly(6)).toEqual(createJelly(6));
    expect(starsForScore(999, 1000)).toBe(0);
    expect(starsForScore(1000, 1000)).toBe(1);
    expect(starsForScore(1550, 1000)).toBe(2);
    expect(starsForScore(2350, 1000)).toBe(3);
    expect(starsForCampaign({ '1': 950, '2': 0, invalid: 99999 })).toBe(1);
  });
});
