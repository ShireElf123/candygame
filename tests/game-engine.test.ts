import { describe, expect, it } from 'vitest';
import {
  applySpecialSwap,
  bossDamageForClear,
  clone,
  buildSwapSpecial,
  COLORS,
  createJelly,
  createLevelBoard,
  createSugarShells,
  damageSugarShells,
  dropMatches,
  expandSpecials,
  evaluateSwap,
  findBestMove,
  findMatches,
  matchRuns,
  freshBoard,
  goalsForLevel,
  hasGoal,
  hasMove,
  keyOf,
  LEVELS,
  makeCandy,
  makeIngredient,
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

  it('creates a playable rectangular board and respects weighted refill colors', () => {
    const weights = [{ color: 0, weight: 1 }, { color: 1, weight: 2 }, { color: 2, weight: 3 }];
    const board = freshBoard(seeded(55), weights, 5, 7);
    expect(board).toHaveLength(5);
    expect(board.every(row => row.length === 7)).toBe(true);
    expect(findMatches(board).size).toBe(0);
    expect(hasMove(board)).toBe(true);

    const refill = dropMatches(board, new Set([keyOf(4, 0), keyOf(3, 0)]), [{ color: 4, weight: 1 }], seeded(3));
    const refilled = refill.board.flat().filter(candy => refill.spawned.includes(candy.id));
    expect(refill.spawned).toHaveLength(2);
    expect(refilled.every(candy => candy.color === 4)).toBe(true);
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

  it('validates swaps without mutating the current board or committing rejected moves', () => {
    const board = emptyBoard();
    board[2][0] = makeCandy(2);
    board[3][0] = makeCandy(2);
    const originalIds = board.map(row => row.map(candy => candy.id));
    const valid = evaluateSwap(board, [1, 0], [1, 1]);

    expect(valid.valid).toBe(true);
    expect(valid.activatesSpecial).toBe(false);
    expect(valid.matches).toEqual(new Set([keyOf(1, 0), keyOf(2, 0), keyOf(3, 0)]));
    expect(board.map(row => row.map(candy => candy.id))).toEqual(originalIds);
    expect(valid.board[1][0].id).toBe(board[1][1].id);

    const rejected = evaluateSwap(board, [0, 0], [0, 1]);
    expect(rejected.valid).toBe(false);
    expect(rejected.matches.size).toBe(0);
    expect(rejected.board.map(row => row.map(candy => candy.id))).toEqual(originalIds);

    const nonAdjacent = evaluateSwap(board, [0, 0], [0, 2]);
    expect(nonAdjacent.valid).toBe(false);
    expect(nonAdjacent.board.map(row => row.map(candy => candy.id))).toEqual(originalIds);
  });

  it('allows a special-candy swap even when ordinary matches are absent', () => {
    const board = emptyBoard();
    board[1][0] = makeCandy(3, 'striped-h');

    const result = evaluateSwap(board, [1, 0], [1, 1]);
    expect(result.valid).toBe(true);
    expect(result.activatesSpecial).toBe(true);
    expect(result.board[1][0].id).toBe(board[1][1].id);
  });

  it('drops cleared pieces, refills every cell, and reports each candy fall distance', () => {
    const board = emptyBoard();
    const originalIds = new Set(board.flat().map(candy => candy.id));
    const { board: result, spawned, fallDistances } = dropMatches(board, new Set([keyOf(7, 0), keyOf(6, 0)]));

    expect(result).toHaveLength(SIZE);
    expect(result.flat()).toHaveLength(SIZE * SIZE);
    expect(result.flat().every(Boolean)).toBe(true);
    expect(spawned).toHaveLength(2);
    expect(spawned.every(id => !originalIds.has(id))).toBe(true);
    expect(new Set(result.flat().map(candy => candy.id)).size).toBe(SIZE * SIZE);
    expect(result.map(row => fallDistances[row[0].id])).toEqual(Array(SIZE).fill(2));
    expect(Object.keys(fallDistances)).toHaveLength(SIZE);
    expect(result.flatMap(row => row.slice(1)).some(candy => fallDistances[candy.id] !== undefined)).toBe(false);
  });

  it('keeps jam jars non-matchable, non-swappable, and gravity-driven until delivery', () => {
    const ingredient = makeIngredient();
    const board = [
      [makeCandy(0), makeCandy(1, 'striped-h'), makeCandy(2)],
      [makeCandy(1), ingredient, makeCandy(0)],
      [makeCandy(2), makeCandy(3), makeCandy(4)],
      [makeCandy(1), makeCandy(1), makeCandy(1)],
    ];
    const bottomMatch = new Set([keyOf(3, 0), keyOf(3, 1), keyOf(3, 2)]);

    expect(findMatches(board)).toEqual(bottomMatch);
    expect(evaluateSwap(board, [1, 0], [1, 1]).valid).toBe(false);
    expect(evaluateSwap(board, [2, 1], [1, 1]).valid).toBe(false);
    const specialBoard = clone(board);
    specialBoard[0][0] = makeIngredient();
    expect(expandSpecials(specialBoard, new Set([keyOf(0, 1)])).has(keyOf(0, 0))).toBe(false);

    const firstDrop = dropMatches(board, bottomMatch, undefined, () => 0.4);
    expect(firstDrop.ingredientsDelivered).toBe(0);
    expect(firstDrop.board[2][1]).toMatchObject({ id: ingredient.id, kind: 'ingredient' });
    expect(firstDrop.fallDistances[ingredient.id]).toBe(1);

    const delivered = dropMatches(firstDrop.board, new Set([keyOf(3, 1)]), undefined, () => 0.4);
    expect(delivered.ingredientsDelivered).toBe(1);
    expect(delivered.deliveredIngredientCells).toEqual([keyOf(3, 1)]);
    expect(delivered.board.flat().some(piece => piece.kind === 'ingredient')).toBe(false);
    expect(delivered.boardForFallAnimation[3][1]).toMatchObject({ id: ingredient.id, kind: 'ingredient' });
    expect(delivered.fallDistances[ingredient.id]).toBe(1);
    expect(delivered.board.flat()).toHaveLength(12);
  });

  it('keeps ingredient drop lanes fixed when a dead board is reshuffled', () => {
    const start = createLevelBoard(LEVELS[24], seeded(735));
    const before = start.board.flatMap((row, rowIndex) => row.flatMap((piece, columnIndex) =>
      piece.kind === 'ingredient' ? [keyOf(rowIndex, columnIndex)] : [],
    ));
    const reshuffled = shuffleBoard(start.board, seeded(736));
    const after = reshuffled.flatMap((row, rowIndex) => row.flatMap((piece, columnIndex) =>
      piece.kind === 'ingredient' ? [keyOf(rowIndex, columnIndex)] : [],
    ));

    expect(after).toEqual(before);
    expect(findMatches(reshuffled).size).toBe(0);
    expect(hasMove(reshuffled)).toBe(true);
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

  it('keeps a level-specific spawn palette when a dead board needs replacement', () => {
    const spawnWeights = [0, 1, 4].map(color => ({ color, weight: 1 }));
    const deadBoard = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => makeCandy(2)));
    const reshuffled = shuffleBoard(deadBoard, () => 0, spawnWeights);
    expect(reshuffled.flat().every(candy => [0, 1, 4].includes(candy.color))).toBe(true);
    expect(findMatches(reshuffled).size).toBe(0);
    expect(hasMove(reshuffled)).toBe(true);
  });

  it('prioritizes a swap that creates a special candy', () => {
    const board = emptyBoard();
    [0, 0, 1, 0, 0, 5, 0, 1].forEach((color, col) => { board[0][col] = makeCandy(color); });
    board[1][2] = makeCandy(0);

    const move = findBestMove(board, 'score', 0, new Set());
    expect(move).not.toBeNull();
    if (!move) return;
    const candidate = board.map(row => row.map(candy => ({ ...candy })));
    [candidate[move[0][0]][move[0][1]], candidate[move[1][0]][move[1][1]]] = [
      candidate[move[1][0]][move[1][1]],
      candidate[move[0][0]][move[0][1]],
    ];
    expect(matchRuns(candidate).some(run => run.length >= 4)).toBe(true);
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
  ] as const)('fires one row and one column for $label', ({ one, two, a, b, center }) => {
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

  it('requires special-candy activations and tracks their mixed-objective progress', () => {
    const level = LEVELS[14];
    expect(level.levelId).toBe(15);
    expect(goalsForLevel(level)).toEqual(['score', 'special']);
    expect(level.specialCount).toBe(1);

    expect(objectivesComplete(level, level.target, 0, 0, 0, 0, 0)).toBe(false);
    expect(objectivesComplete(level, level.target, 0, 0, 0, 0, level.specialCount)).toBe(true);
    expect(objectiveProgressPercent(level, level.target, 0, 0, 0, 0, 0, 0)).toBe(0);
    expect(objectiveProgressPercent(level, level.target, 0, 0, 0, 0, 0, level.specialCount)).toBe(100);
  });

  it('adds a named boss finale to every chapter and tracks remaining boss power', () => {
    const bossLevels = LEVELS.filter(level => level.boss);
    expect(bossLevels).toHaveLength(12);
    expect(bossLevels.map(level => LEVELS.indexOf(level) + 1)).toEqual(Array.from({ length: 12 }, (_, index) => (index + 1) * 10));
    expect(new Set(bossLevels.map(level => level.boss?.name)).size).toBe(12);

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

  it('requires jam-jar deliveries and uses the least-complete mixed-goal progress', () => {
    const level = LEVELS[24];
    expect(level.levelId).toBe(25);
    expect(goalsForLevel(level)).toEqual(['collect', 'ingredient']);
    expect(level.ingredientCount).toBe(1);
    expect(objectivesComplete(level, level.target, level.goalCount, 0, 0, 0, 0, 0)).toBe(false);
    expect(objectivesComplete(level, level.target, level.goalCount, 0, 0, 0, 0, level.ingredientCount)).toBe(true);
    expect(objectiveProgressPercent(level, level.target, level.goalCount, 0, 0, 0, 0, 0)).toBe(0);
    expect(objectiveProgressPercent(level, level.target, level.goalCount, 0, 0, 0, 0, 0, level.ingredientCount)).toBe(100);
  });

  it('tracks the best cascade chain as a mixed-goal objective across turns', () => {
    const level = LEVELS[11];
    expect(level.levelId).toBe(12);
    expect(goalsForLevel(level)).toEqual(['collect', 'cascade']);
    expect(level.cascadeCount).toBe(2);
    expect(objectivesComplete(level, 0, level.goalCount, 0, 0, 0, 0, 0, 1)).toBe(false);
    expect(objectivesComplete(level, 0, level.goalCount, 0, 0, 0, 0, 0, level.cascadeCount)).toBe(true);
    expect(objectiveProgressPercent(level, 0, level.goalCount, 0, 0, 0, 0, 0, 0, 1)).toBe(50);
    expect(objectiveProgressPercent(level, 0, level.goalCount, 0, 0, 0, 0, 0, 0, level.cascadeCount)).toBe(100);
  });

  it('adds deterministic layered sugar shells as a second objective', () => {
    const firstShellLevel = LEVELS[7];
    const firstShells = createSugarShells(8);
    expect(firstShellLevel.secondaryGoalType).toBe('shell');
    expect(firstShells).toEqual(createSugarShells(8));
    expect(firstShells.size).toBe(firstShellLevel.shellCount);
    expect([...firstShells.values()].every(layers => layers === 1)).toBe(true);
    expect(createSugarShells(7).size).toBe(0);

    expect(objectivesComplete(firstShellLevel, 0, firstShellLevel.goalCount, 0, 0, 0)).toBe(false);
    expect(objectivesComplete(firstShellLevel, 0, firstShellLevel.goalCount, 0, 0, firstShellLevel.shellCount)).toBe(true);
    expect(objectiveProgressPercent(firstShellLevel, 0, firstShellLevel.goalCount, 0, 0, 0, 0)).toBe(0);
    expect(objectiveProgressPercent(firstShellLevel, 0, firstShellLevel.goalCount, 0, 0, 0, firstShellLevel.shellCount)).toBe(100);

    const laterShells = createSugarShells(18);
    expect([...laterShells.values()].some(layers => layers === 2)).toBe(true);

    const start = new Map([['one-layer', 1], ['two-layer', 2]]);
    const hit = damageSugarShells(start, new Set(['one-layer', 'two-layer', 'empty']));
    expect(hit.hit).toBe(2);
    expect(hit.cleared).toBe(1);
    expect(hit.shells).toEqual(new Map([['two-layer', 1]]));
    expect(start).toEqual(new Map([['one-layer', 1], ['two-layer', 2]]));
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
