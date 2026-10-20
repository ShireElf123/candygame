import levelManifestJson from './levels.json';

/* Pure match-3 rules and board utilities. UI code renders the engine's results. */
export type Special = 'striped-h' | 'striped-v' | 'wrapped' | 'color';
export type Candy = { id: number; color: number; special?: Special; kind?: 'ingredient' };
export type Screen = 'intro' | 'map' | 'play' | 'win' | 'lose';
export type Booster = 'hammer' | 'line' | 'rainbow';
export type Pos = [number, number];
export const COLORS = ['grape', 'lemon', 'berry', 'mint', 'blueberry', 'orange'];
export const GLYPHS = ['✿', '●', '♥', '✦', '◆', '◉'];
export const SIZE = 8;
export const LEVEL_COUNT = 100;
export type GoalType = 'score' | 'collect' | 'jelly' | 'boss' | 'shell' | 'special' | 'ingredient';
export type BossDefinition = {
  name: string;
  epithet: string;
  color: number;
  maxHealth: number;
  taunt: string;
};
export type SpawnWeight = { color: number; weight: number };
export type LevelObjective = { type: GoalType; targetAmount: number; color?: number };
export type InitialGridCell = number | 'J' | 'I';
export type LevelDefinition = {
  levelId: number;
  chapter: number;
  chapterName: string;
  rows: number;
  columns: number;
  moves: number;
  target: number;
  goalType: GoalType;
  secondaryGoalType?: GoalType;
  goalColor: number;
  goalCount: number;
  jellyCount: number;
  specialCount: number;
  shellCount?: number;
  ingredientCount: number;
  spawnWeights: SpawnWeight[];
  initialGrid?: InitialGridCell[][];
  objectives: LevelObjective[];
  boss?: BossDefinition;
};

type ObjectiveSet = Pick<LevelDefinition, 'goalType' | 'secondaryGoalType'>;
type UnknownRecord = Record<string, unknown>;
const GOAL_TYPES: GoalType[] = ['score', 'collect', 'jelly', 'boss', 'shell', 'special', 'ingredient'];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`Invalid level data: ${field} must be a positive integer.`);
  return value as number;
}

function parseSpawnWeights(value: unknown, field: string): SpawnWeight[] {
  if (!Array.isArray(value)) throw new Error(`Invalid level data: ${field} must be an array.`);
  const byColor = new Map<number, number>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item) || !Number.isInteger(item.color) || (item.color as number) < 0 || (item.color as number) >= COLORS.length) {
      throw new Error(`Invalid level data: ${field}[${index}] has an invalid color.`);
    }
    const color = item.color as number;
    if (byColor.has(color)) throw new Error(`Invalid level data: ${field} contains duplicate color ${color}.`);
    if (typeof item.weight !== 'number' || !Number.isFinite(item.weight) || item.weight <= 0) {
      throw new Error(`Invalid level data: ${field}[${index}] must have a positive weight.`);
    }
    byColor.set(color, item.weight);
  }
  if (byColor.size < 3) throw new Error(`Invalid level data: ${field} must include at least three candy colors.`);
  return Array.from(byColor, ([color, weight]) => ({ color, weight })).sort((a, b) => a.color - b.color);
}

function parseObjectives(value: unknown, field: string): LevelObjective[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) {
    throw new Error(`Invalid level data: ${field} must contain one or two objectives.`);
  }
  return value.map((item, index) => {
    const objectiveField = `${field}[${index}]`;
    if (!isRecord(item) || !GOAL_TYPES.includes(item.type as GoalType)) {
      throw new Error(`Invalid level data: ${objectiveField} has an unknown objective type.`);
    }
    const type = item.type as GoalType;
    const targetAmount = positiveInteger(item.targetAmount, `${objectiveField}.targetAmount`);
    if (type === 'collect') {
      if (!Number.isInteger(item.color) || (item.color as number) < 0 || (item.color as number) >= COLORS.length) {
        throw new Error(`Invalid level data: ${objectiveField}.color must identify a candy color.`);
      }
      return { type, targetAmount, color: item.color as number };
    }
    return { type, targetAmount };
  });
}

function parseInitialGrid(value: unknown, rows: number, columns: number, field: string): InitialGridCell[][] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== rows) throw new Error(`Invalid level data: ${field} must have ${rows} rows.`);
  return value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columns) throw new Error(`Invalid level data: ${field}[${rowIndex}] must have ${columns} cells.`);
    return row.map((cell, columnIndex) => {
      if (cell === 'J' || cell === 'I') return cell;
      if (!Number.isInteger(cell) || (cell as number) < 0 || (cell as number) >= COLORS.length) {
        throw new Error(`Invalid level data: ${field}[${rowIndex}][${columnIndex}] must be a candy color, "J", or "I".`);
      }
      return cell as number;
    });
  });
}

function parseLevelEntry(value: unknown, index: number, defaults: UnknownRecord): LevelDefinition {
  const field = `levels[${index}]`;
  if (!isRecord(value)) throw new Error(`Invalid level data: ${field} must be an object.`);
  const levelId = positiveInteger(value.levelId, `${field}.levelId`);
  if (levelId !== index + 1) throw new Error(`Invalid level data: expected levelId ${index + 1}, received ${levelId}.`);
  const rows = positiveInteger(value.rows ?? defaults.rows, `${field}.rows`);
  const columns = positiveInteger(value.columns ?? defaults.columns, `${field}.columns`);
  if (rows < 3 || columns < 3 || rows > 16 || columns > 16) throw new Error(`Invalid level data: ${field} board size must be between 3 and 16 cells per side.`);
  const moves = positiveInteger(value.maxMoves, `${field}.maxMoves`);
  const target = positiveInteger(value.targetScore, `${field}.targetScore`);
  const chapter = positiveInteger(value.chapter, `${field}.chapter`);
  if (typeof value.chapterName !== 'string' || !value.chapterName.trim()) throw new Error(`Invalid level data: ${field}.chapterName is required.`);
  const objectives = parseObjectives(value.objectives, `${field}.objectives`);
  if (new Set(objectives.map(objective => objective.type)).size !== objectives.length) {
    throw new Error(`Invalid level data: ${field} cannot repeat an objective type.`);
  }
  const weights = parseSpawnWeights(value.spawnWeights ?? defaults.spawnWeights, `${field}.spawnWeights`);
  const initialGrid = parseInitialGrid(value.initialGrid, rows, columns, `${field}.initialGrid`);
  const jellyObjective = objectives.find(objective => objective.type === 'jelly');
  const ingredientObjective = objectives.find(objective => objective.type === 'ingredient');
  const jellyCells = initialGrid?.flat().filter(cell => cell === 'J').length ?? 0;
  const ingredientCells = initialGrid?.flat().filter(cell => cell === 'I').length ?? 0;
  if (jellyCells > 0 && !jellyObjective) throw new Error(`Invalid level data: ${field} has jelly tiles but no jelly objective.`);
  if (initialGrid && jellyObjective && jellyCells !== jellyObjective.targetAmount) {
    throw new Error(`Invalid level data: ${field} jelly objective must equal the number of J cells in initialGrid.`);
  }
  if (ingredientCells > 0 && !ingredientObjective) throw new Error(`Invalid level data: ${field} has ingredients but no ingredient objective.`);
  if (initialGrid && ingredientObjective && ingredientCells !== ingredientObjective.targetAmount) {
    throw new Error(`Invalid level data: ${field} ingredient objective must equal the number of I cells in initialGrid.`);
  }
  if (initialGrid?.some((row, rowIndex) => rowIndex === rows - 1 && row.includes('I'))) {
    throw new Error(`Invalid level data: ${field} ingredients cannot start on the exit row.`);
  }
  if (!initialGrid && ingredientObjective && ingredientObjective.targetAmount > columns) {
    throw new Error(`Invalid level data: ${field} ingredient objective cannot exceed the number of drop lanes without an authored initialGrid.`);
  }
  const boss = value.boss;
  if (boss !== undefined) {
    if (!isRecord(boss) || typeof boss.name !== 'string' || !boss.name.trim() ||
        typeof boss.epithet !== 'string' || typeof boss.taunt !== 'string' ||
        !Number.isInteger(boss.color) || (boss.color as number) < 0 || (boss.color as number) >= COLORS.length) {
      throw new Error(`Invalid level data: ${field}.boss is malformed.`);
    }
    positiveInteger(boss.maxHealth, `${field}.boss.maxHealth`);
    if (!objectives.some(objective => objective.type === 'boss')) throw new Error(`Invalid level data: ${field}.boss requires a boss objective.`);
  }
  const bossObjective = objectives.find(objective => objective.type === 'boss');
  if (Boolean(bossObjective) !== Boolean(boss)) throw new Error(`Invalid level data: ${field} must define boss metadata and a boss objective together.`);
  if (bossObjective && boss && bossObjective.targetAmount !== boss.maxHealth) throw new Error(`Invalid level data: ${field} boss target must match maxHealth.`);
  const collectObjective = objectives.find(objective => objective.type === 'collect');
  const shellObjective = objectives.find(objective => objective.type === 'shell');
  const specialObjective = objectives.find(objective => objective.type === 'special');
  const defaultGoalColor = collectObjective?.color ?? (boss && typeof boss.color === 'number' ? boss.color : (levelId + 1) % COLORS.length);
  const goalColor = value.goalColor ?? defaultGoalColor;
  if (!Number.isInteger(goalColor) || (goalColor as number) < 0 || (goalColor as number) >= COLORS.length) {
    throw new Error(`Invalid level data: ${field}.goalColor is invalid.`);
  }
  if (collectObjective && collectObjective.color !== goalColor) throw new Error(`Invalid level data: ${field}.goalColor must match its collect objective.`);

  return {
    levelId,
    chapter,
    chapterName: value.chapterName,
    rows,
    columns,
    moves,
    target,
    goalType: objectives[0].type,
    ...(objectives[1] ? { secondaryGoalType: objectives[1].type } : {}),
    goalColor: goalColor as number,
    goalCount: collectObjective?.targetAmount ?? 0,
    jellyCount: jellyObjective?.targetAmount ?? 0,
    specialCount: specialObjective?.targetAmount ?? 0,
    ...(shellObjective ? { shellCount: shellObjective.targetAmount } : {}),
    ingredientCount: ingredientObjective?.targetAmount ?? 0,
    spawnWeights: weights,
    ...(initialGrid ? { initialGrid } : {}),
    objectives,
    ...(boss ? { boss: boss as unknown as BossDefinition } : {}),
  };
}

/** Parse and validate editable campaign JSON before it reaches gameplay. */
export function parseLevelManifest(value: unknown): LevelDefinition[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.levels) || !isRecord(value.defaults)) {
    throw new Error('Invalid level data: expected schemaVersion 1, defaults, and a levels array.');
  }
  const levels = value.levels.map((entry, index) => parseLevelEntry(entry, index, value.defaults as UnknownRecord));
  if (!levels.length || levels.length > LEVEL_COUNT) throw new Error(`Invalid level data: expected between 1 and ${LEVEL_COUNT} levels.`);
  for (let index = 1; index < levels.length; index++) {
    if (levels[index].chapter < levels[index - 1].chapter) throw new Error('Invalid level data: chapter numbers must be in order.');
  }
  return levels;
}

const parsedLevelData = parseLevelManifest(levelManifestJson);
if (parsedLevelData.length !== LEVEL_COUNT) throw new Error(`Campaign data must define exactly ${LEVEL_COUNT} levels.`);
export const LEVELS: LevelDefinition[] = parsedLevelData;
export const CHAPTERS: string[] = Array.from(new Map(LEVELS.map(level => [level.chapter, level.chapterName])).values());

export function goalsForLevel(level: ObjectiveSet): GoalType[] {
  return level.secondaryGoalType ? [level.goalType, level.secondaryGoalType] : [level.goalType];
}

export function hasGoal(level: ObjectiveSet, goalType: GoalType): boolean {
  return goalsForLevel(level).includes(goalType);
}

function ingredientStartPositions(level: Pick<LevelDefinition, 'rows' | 'columns' | 'ingredientCount' | 'initialGrid'>): Pos[] {
  if (level.initialGrid) {
    return level.initialGrid.flatMap((row, rowIndex) => row.flatMap((cell, columnIndex) =>
      cell === 'I' ? [[rowIndex, columnIndex] as Pos] : [],
    ));
  }
  const count = Math.max(0, Math.min(level.ingredientCount, level.columns));
  return Array.from({ length: count }, (_, index) => [0, Math.floor((index + 1) * level.columns / (count + 1))] as Pos);
}

export function objectivesComplete(
  level: LevelDefinition,
  score: number,
  collected: number,
  jellyRemaining: number,
  bossHealthRemaining = level.boss?.maxHealth ?? 0,
  shellsCleared = 0,
  specialsActivated = 0,
  ingredientsDelivered = 0,
): boolean {
  return goalsForLevel(level).every(goalType => {
    if (goalType === 'score') return score >= level.target;
    if (goalType === 'collect') return collected >= level.goalCount;
    if (goalType === 'jelly') return jellyRemaining === 0;
    if (goalType === 'boss') return bossHealthRemaining <= 0;
    if (goalType === 'shell') return shellsCleared >= (level.shellCount ?? 0);
    if (goalType === 'special') return specialsActivated >= level.specialCount;
    return ingredientsDelivered >= level.ingredientCount;
  });
}

/** A mixed level's overall bar reflects the least-complete objective. */
export function objectiveProgressPercent(
  level: LevelDefinition,
  score: number,
  collected: number,
  jellyRemaining: number,
  jellyTotal: number,
  bossHealthRemaining = level.boss?.maxHealth ?? 0,
  shellsCleared = 0,
  specialsActivated = 0,
  ingredientsDelivered = 0,
): number {
  const percentages = goalsForLevel(level).map(goalType => {
    if (goalType === 'score') return level.target > 0 ? Math.min(100, score / level.target * 100) : 100;
    if (goalType === 'collect') return level.goalCount > 0 ? Math.min(100, collected / level.goalCount * 100) : 100;
    if (goalType === 'jelly') return jellyTotal > 0 ? Math.min(100, (jellyTotal - jellyRemaining) / jellyTotal * 100) : 100;
    if (goalType === 'boss') {
      return level.boss && level.boss.maxHealth > 0
        ? Math.min(100, Math.max(0, level.boss.maxHealth - bossHealthRemaining) / level.boss.maxHealth * 100)
        : 100;
    }
    if (goalType === 'shell') return level.shellCount && level.shellCount > 0 ? Math.min(100, shellsCleared / level.shellCount * 100) : 100;
    if (goalType === 'special') return level.specialCount > 0 ? Math.min(100, specialsActivated / level.specialCount * 100) : 100;
    return level.ingredientCount > 0 ? Math.min(100, ingredientsDelivered / level.ingredientCount * 100) : 100;
  });
  return Math.min(...percentages);
}

/** Bosses take one point per four cleared candies, plus momentum from cascades. */
export function bossDamageForClear(clearedCells: number, cascade: number): number {
  return Math.max(1, Math.floor(Math.max(0, clearedCells) / 4)) + Math.max(0, cascade - 1);
}

export function createJelly(levelNumber: number): Set<string> {
  const safeLevel = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(levelNumber)));
  const level = LEVELS[safeLevel - 1];
  if (!hasGoal(level, 'jelly')) return new Set();
  if (level.initialGrid) {
    return new Set(level.initialGrid.flatMap((row, r) => row.flatMap((cell, c) => cell === 'J' ? [keyOf(r, c)] : [])));
  }
  const ingredientCells = new Set(ingredientStartPositions(level).map(([row, column]) => keyOf(row, column)));
  const cells = Array.from({ length: level.rows * level.columns }, (_, index) => keyOf(Math.floor(index / level.columns), index % level.columns))
    .filter(key => !ingredientCells.has(key));
  if (level.jellyCount > cells.length) throw new Error(`Level ${level.levelId} has more jelly than available cells after ingredient placement.`);
  cells.sort((a, b) => {
    const [ar, ac] = posOf(a); const [br, bc] = posOf(b);
    return ((ar * 17 + ac * 29 + level.levelId * 13) % 67) - ((br * 17 + bc * 29 + level.levelId * 13) % 67);
  });
  return new Set(cells.slice(0, Math.min(level.jellyCount, cells.length)));
}

const SUGAR_SHELL_LAYOUT: Pos[] = [
  [1, 1], [1, 6], [2, 3], [2, 5], [3, 1], [3, 6],
  [4, 2], [4, 5], [5, 1], [5, 6], [6, 3], [6, 5],
];

/** Deterministic shell placement scaled from the 8x8 design to the authored board shape. */
export function createSugarShells(levelNumber: number): Map<string, number> {
  const safeLevel = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(levelNumber)));
  const level = LEVELS[safeLevel - 1];
  const shellCount = level.shellCount ?? 0;
  if (!hasGoal(level, 'shell') || shellCount <= 0) return new Map();

  const ingredientCells = new Set(ingredientStartPositions(level).map(([row, column]) => keyOf(row, column)));
  const start = (level.chapter * 3) % SUGAR_SHELL_LAYOUT.length;
  const positions = SUGAR_SHELL_LAYOUT.map(([row, column]) => [
    Math.min(level.rows - 1, Math.floor(row * level.rows / SIZE)),
    Math.min(level.columns - 1, Math.floor(column * level.columns / SIZE)),
  ] as Pos);
  for (let r = 0; r < level.rows; r++) for (let c = 0; c < level.columns; c++) positions.push([r, c]);
  const availablePositions = positions.filter(([row, column]) => !ingredientCells.has(keyOf(row, column)));
  if (availablePositions.length < shellCount) throw new Error(`Level ${level.levelId} has more sugar shells than available cells.`);
  const chosen = new Set<string>();
  for (let offset = 0; chosen.size < shellCount && offset < availablePositions.length; offset++) {
    const [row, column] = availablePositions[(start + offset) % availablePositions.length];
    chosen.add(keyOf(row, column));
  }
  return new Map(Array.from(chosen).slice(0, shellCount).map((key, index) => [key, safeLevel >= 18 && index % 4 === 0 ? 2 : 1]));
}

export function damageSugarShells(shells: ReadonlyMap<string, number>, matchedCells: ReadonlySet<string>) {
  const remainingShells = new Map(shells);
  let hit = 0;
  let cleared = 0;
  for (const key of matchedCells) {
    const layers = remainingShells.get(key);
    if (!layers) continue;
    hit++;
    if (layers <= 1) {
      remainingShells.delete(key);
      cleared++;
    } else {
      remainingShells.set(key, layers - 1);
    }
  }
  return { shells: remainingShells, hit, cleared };
}

let nextCandyId = 1;
export const makeCandy = (color?: number, special?: Special): Candy => ({
  id: nextCandyId++,
  color: color ?? Math.floor(Math.random() * COLORS.length),
  special,
});

export const makeIngredient = (): Candy => ({ id: nextCandyId++, color: 0, kind: 'ingredient' });
export const clone = (board: Candy[][]) => board.map(row => row.map(candy => ({ ...candy })));
export const keyOf = (r: number, c: number) => r + ':' + c;
export const posOf = (key: string): Pos => key.split(':').map(Number) as Pos;

export function findMatches(board: Candy[][]): Set<string> {
  const found = new Set<string>();
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  const colorAt = (row: number, column: number) => {
    const piece = board[row]?.[column];
    return piece?.kind === 'ingredient' ? undefined : piece?.color;
  };
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < columns) {
      const color = colorAt(r, c);
      let end = c + 1;
      while (color !== undefined && end < columns && colorAt(r, end) === color) end++;
      if (color !== undefined && end - c >= 3) for (let x = c; x < end; x++) found.add(keyOf(r, x));
      c = end;
    }
  }
  for (let c = 0; c < columns; c++) {
    let r = 0;
    while (r < rows) {
      const color = colorAt(r, c);
      let end = r + 1;
      while (color !== undefined && end < rows && colorAt(end, c) === color) end++;
      if (color !== undefined && end - r >= 3) for (let y = r; y < end; y++) found.add(keyOf(y, c));
      r = end;
    }
  }
  return found;
}

export type SwapEvaluation = {
  valid: boolean;
  board: Candy[][];
  matches: Set<string>;
  activatesSpecial: boolean;
};

/**
 * Evaluate a proposed adjacent swap without mutating the engine's current board.
 * Invalid swaps return the original arrangement so the UI can animate a reject
 * and then leave game state untouched.
 */
export function evaluateSwap(board: Candy[][], a: Pos, b: Pos): SwapEvaluation {
  const [ar, ac] = a;
  const [br, bc] = b;
  const inBounds = (row: number, column: number) =>
    Number.isInteger(row) && Number.isInteger(column) && Boolean(board[row]?.[column]);
  const adjacent = Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  if (!inBounds(ar, ac) || !inBounds(br, bc) || !adjacent) {
    return { valid: false, board: clone(board), matches: new Set(), activatesSpecial: false };
  }

  const first = board[ar][ac];
  const second = board[br][bc];
  if (first.kind === 'ingredient' || second.kind === 'ingredient') {
    return { valid: false, board: clone(board), matches: new Set(), activatesSpecial: false };
  }
  const swapped = clone(board);
  [swapped[ar][ac], swapped[br][bc]] = [swapped[br][bc], swapped[ar][ac]];
  const matches = findMatches(swapped);
  const activatesSpecial = Boolean(first.special || second.special);
  const valid = matches.size > 0 || activatesSpecial;
  return {
    valid,
    board: valid ? swapped : clone(board),
    matches: valid ? matches : new Set(),
    activatesSpecial,
  };
}

export function matchRuns(board: Candy[][]) {
  const runs: { cells: Pos[]; length: number; orientation: 'h' | 'v'; color: number }[] = [];
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  const colorAt = (row: number, column: number) => {
    const piece = board[row]?.[column];
    return piece?.kind === 'ingredient' ? undefined : piece?.color;
  };
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < columns) {
      const color = colorAt(r, c);
      let end = c + 1;
      while (color !== undefined && end < columns && colorAt(r, end) === color) end++;
      if (color !== undefined && end - c >= 3) runs.push({ cells: Array.from({ length: end - c }, (_, i) => [r, c + i] as Pos), length: end - c, orientation: 'h', color });
      c = end;
    }
  }
  for (let c = 0; c < columns; c++) {
    let r = 0;
    while (r < rows) {
      const color = colorAt(r, c);
      let end = r + 1;
      while (color !== undefined && end < rows && colorAt(end, c) === color) end++;
      if (color !== undefined && end - r >= 3) runs.push({ cells: Array.from({ length: end - r }, (_, i) => [r + i, c] as Pos), length: end - r, orientation: 'v', color });
      r = end;
    }
  }
  return runs;
}

export function hasMove(board: Candy[][]): boolean {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= rows || nc >= columns) continue;
      if (board[r][c]?.kind === 'ingredient' || board[nr][nc]?.kind === 'ingredient') continue;
      // Special swaps are valid activations even without a normal match.
      if (board[r][c]?.special || board[nr][nc]?.special) return true;
      const test = clone(board);
      [test[r][c], test[nr][nc]] = [test[nr][nc], test[r][c]];
      if (findMatches(test).size) return true;
    }
  }
  return false;
}

function chooseSpawnColor(random: () => number, weights: SpawnWeight[]): number {
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let choice = Math.max(0, Math.min(totalWeight - Number.EPSILON, random() * totalWeight));
  for (const entry of weights) {
    choice -= entry.weight;
    if (choice < 0) return entry.color;
  }
  return weights[weights.length - 1].color;
}

export function createBoard(
  random: () => number = Math.random,
  spawnWeights: SpawnWeight[] = COLORS.map((_, color) => ({ color, weight: 1 })),
  rows = SIZE,
  columns = SIZE,
): Candy[][] {
  const board: Candy[][] = [];
  for (let r = 0; r < rows; r++) {
    board[r] = [];
    for (let c = 0; c < columns; c++) {
      let color = chooseSpawnColor(random, spawnWeights);
      for (let attempt = 0; attempt < 40; attempt++) {
        const makesHorizontal = c >= 2 && board[r][c - 1].color === color && board[r][c - 2].color === color;
        const makesVertical = r >= 2 && board[r - 1][c].color === color && board[r - 2][c].color === color;
        if (!makesHorizontal && !makesVertical) break;
        const alternatives = spawnWeights.filter(entry => entry.color !== color);
        if (!alternatives.length) break;
        color = chooseSpawnColor(random, alternatives);
      }
      board[r][c] = makeCandy(color);
    }
  }
  return board;
}

export function freshBoard(
  random: () => number = Math.random,
  spawnWeights: SpawnWeight[] = COLORS.map((_, color) => ({ color, weight: 1 })),
  rows = SIZE,
  columns = SIZE,
): Candy[][] {
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 3 || columns < 3) {
    throw new Error('A playable board needs at least 3 rows and 3 columns.');
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    const board = createBoard(random, spawnWeights, rows, columns);
    if (!findMatches(board).size && hasMove(board)) return board;
  }
  // Deterministic fallback has no triples and a guaranteed top-row match after
  // swapping (0,1) with (1,1), even when the level weights only three colors.
  const palette = spawnWeights.map(entry => entry.color);
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => makeCandy(palette[(r * 2 + Math.floor(c / 2)) % palette.length]))
  );
  const [a, b, c] = palette;
  board[0][0] = makeCandy(a); board[0][1] = makeCandy(b); board[0][2] = makeCandy(a);
  board[1][0] = makeCandy(b); board[1][1] = makeCandy(a); board[1][2] = makeCandy(c);
  board[2][0] = makeCandy(c); board[2][1] = makeCandy(c); board[2][2] = makeCandy(b);
  if (findMatches(board).size || !hasMove(board)) throw new Error('Could not generate a playable board from these spawn weights.');
  return board;
}

export type LevelStart = { board: Candy[][]; jelly: Set<string> };

export function createLevelBoard(level: LevelDefinition, random: () => number = Math.random): LevelStart {
  if (!level.initialGrid) {
    const jelly = hasGoal(level, 'jelly') ? createJelly(level.levelId) : new Set<string>();
    for (let attempt = 0; attempt < (level.ingredientCount > 0 ? 64 : 1); attempt++) {
      const board = freshBoard(random, level.spawnWeights, level.rows, level.columns);
      for (const [row, column] of ingredientStartPositions(level)) board[row][column] = makeIngredient();
      if (!findMatches(board).size && hasMove(board)) return { board, jelly };
    }
    throw new Error(`Level ${level.levelId} could not start with a playable ingredient board.`);
  }
  const hasRandomJelly = level.initialGrid.some(row => row.includes('J'));
  for (let attempt = 0; attempt < (hasRandomJelly ? 64 : 1); attempt++) {
    const jelly = new Set<string>();
    const board = level.initialGrid.map((row, r) => row.map((cell, c) => {
      if (cell === 'J') {
        jelly.add(keyOf(r, c));
        return makeCandy(chooseSpawnColor(random, level.spawnWeights));
      }
      if (cell === 'I') return makeIngredient();
      return makeCandy(cell);
    }));
    if (!findMatches(board).size && hasMove(board)) return { board, jelly };
  }
  throw new Error(`Level ${level.levelId} initialGrid must start match-free with at least one legal move.`);
}

export function shuffleBoard(input: Candy[][], random: () => number = Math.random): Candy[][] {
  const rows = input.length;
  const columns = input[0]?.length ?? 0;
  const originalCandies = input.flat().map(candy => ({ ...candy }));
  const ingredientSlots = new Map<string, Candy>();
  originalCandies.forEach((candy, index) => {
    if (candy.kind === 'ingredient') ingredientSlots.set(keyOf(Math.floor(index / columns), index % columns), candy);
  });

  if (ingredientSlots.size) {
    const movable = originalCandies.filter(candy => candy.kind !== 'ingredient').map(candy => ({ ...candy }));
    const rebuild = (pieces: Candy[]) => {
      let pieceIndex = 0;
      return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
        const fixed = ingredientSlots.get(keyOf(row, column));
        return fixed ? { ...fixed } : { ...pieces[pieceIndex++] };
      }));
    };
    for (let attempt = 0; attempt < 160; attempt++) {
      const shuffled = movable.map(candy => ({ ...candy }));
      for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      const candidate = rebuild(shuffled);
      if (!findMatches(candidate).size && hasMove(candidate)) return candidate;
    }
    for (let offset = 1; offset < movable.length; offset++) {
      const rotated = movable.slice(offset).concat(movable.slice(0, offset));
      const candidate = rebuild(rotated);
      if (!findMatches(candidate).size && hasMove(candidate)) return candidate;
    }
    for (let attempt = 0; attempt < 160; attempt++) {
      const candidate = freshBoard(random, undefined, rows, columns);
      ingredientSlots.forEach((ingredient, key) => {
        const [row, column] = posOf(key);
        candidate[row][column] = { ...ingredient };
      });
      if (!findMatches(candidate).size && hasMove(candidate)) return candidate;
    }
    throw new Error('Could not shuffle a playable board while preserving its ingredients.');
  }

  const candies = originalCandies.map(candy => ({ ...candy }));
  for (let attempt = 0; attempt < 160; attempt++) {
    for (let i = candies.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candies[i], candies[j]] = [candies[j], candies[i]];
    }
    const candidate = Array.from({ length: rows }, (_, r) => candies.slice(r * columns, (r + 1) * columns).map(candy => ({ ...candy })));
    if (!findMatches(candidate).size && hasMove(candidate)) return candidate;
  }
  // Random shuffles can repeatedly land on dead boards. Try cyclic offsets before
  // replacing the board, preserving candy identity and specials where possible.
  for (let offset = 1; offset < originalCandies.length; offset++) {
    const rotated = originalCandies.slice(offset).concat(originalCandies.slice(0, offset));
    const candidate = Array.from({ length: rows }, (_, r) =>
      rotated.slice(r * columns, (r + 1) * columns).map(candy => ({ ...candy }))
    );
    if (!findMatches(candidate).size && hasMove(candidate)) return candidate;
  }
  return freshBoard(random, undefined, rows, columns);
}

export function expandSpecials(board: Candy[][], initial: Set<string>): Set<string> {
  const isClearable = (row: number, column: number) => {
    const piece = board[row]?.[column];
    return Boolean(piece) && piece.kind !== 'ingredient';
  };
  const cleared = new Set(Array.from(initial).filter(key => {
    const [row, column] = posOf(key);
    return isClearable(row, column);
  }));
  const queue = Array.from(cleared);
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  while (queue.length) {
    const key = queue.pop()!;
    const [r, c] = posOf(key);
    const candy = board[r]?.[c];
    if (!candy?.special) continue;
    const add = (y: number, x: number) => {
      const next = keyOf(y, x);
      if (isClearable(y, x) && !cleared.has(next)) { cleared.add(next); queue.push(next); }
    };
    if (candy.special === 'striped-h') {
      for (let x = 0; x < columns; x++) add(r, x);
    } else if (candy.special === 'striped-v') {
      for (let y = 0; y < rows; y++) add(y, c);
    } else if (candy.special === 'wrapped') {
      for (let y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++) {
        for (let x = Math.max(0, c - 1); x <= Math.min(columns - 1, c + 1); x++) add(y, x);
      }
    } else {
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const target = board[y][x];
        if (target.kind !== 'ingredient' && target.color === candy.color) add(y, x);
      }
    }
  }
  return cleared;
}

export function dropMatches(
  input: Candy[][],
  matches: Set<string>,
  spawnWeights: SpawnWeight[] = COLORS.map((_, color) => ({ color, weight: 1 })),
  random: () => number = Math.random,
): { board: Candy[][]; boardForFallAnimation: Candy[][]; spawned: number[]; fallDistances: Record<number, number>; ingredientsDelivered: number; deliveredIngredientCells: string[] } {
  const board = clone(input);
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  matches.forEach(key => {
    const [row, column] = posOf(key);
    if (board[row]?.[column] && board[row][column].kind !== 'ingredient') board[row][column] = null as unknown as Candy;
  });
  const spawned: number[] = [];
  const fallDistances: Record<number, number> = {};
  const deliveredIngredientCells = new Set<string>();
  const deliveredIngredientsByColumn = new Map<number, { candy: Candy; sourceRow: number }>();
  let ingredientsDelivered = 0;
  for (let c = 0; c < columns; c++) {
    const kept: Array<{ candy: Candy; sourceRow: number; fresh: boolean }> = [];
    for (let r = rows - 1; r >= 0; r--) {
      if (board[r][c]) kept.push({ candy: board[r][c], sourceRow: r, fresh: false });
    }
    const survivors: typeof kept = [];
    let destinationRow = rows - 1;
    for (const entry of kept) {
      if (entry.candy.kind === 'ingredient' && destinationRow === rows - 1) {
        ingredientsDelivered++;
        deliveredIngredientCells.add(keyOf(rows - 1, c));
        deliveredIngredientsByColumn.set(c, { candy: entry.candy, sourceRow: entry.sourceRow });
        continue;
      }
      survivors.push(entry);
      destinationRow--;
    }
    const spawnCount = rows - survivors.length;
    for (let index = 0; index < spawnCount; index++) {
      const candy = makeCandy(chooseSpawnColor(random, spawnWeights));
      survivors.push({ candy, sourceRow: -1, fresh: true });
      spawned.push(candy.id);
    }
    for (let r = rows - 1, i = 0; r >= 0; r--, i++) {
      const entry = survivors[i];
      board[r][c] = entry.candy;
      const distance = entry.fresh ? spawnCount : r - entry.sourceRow;
      if (distance > 0) fallDistances[entry.candy.id] = distance;
    }
  }
  const boardForFallAnimation = clone(board);
  for (const [column, { candy, sourceRow }] of deliveredIngredientsByColumn) {
    boardForFallAnimation[rows - 1][column] = { ...candy };
    fallDistances[candy.id] = Math.max(0, rows - 1 - sourceRow);
  }
  return {
    board,
    boardForFallAnimation,
    spawned,
    fallDistances,
    ingredientsDelivered,
    deliveredIngredientCells: Array.from(deliveredIngredientCells),
  };
}

function findCreatedSpecial(board: Candy[][], matches: Set<string>, a: Pos, b: Pos): { position: Pos; special: Special } | null {
  const runs = matchRuns(board);
  const straightFive = runs.find(run => run.length >= 5);
  const four = runs.find(run => run.length === 4);
  const intersections: Pos[] = [];
  const horizontals = runs.filter(run => run.orientation === 'h');
  const verticals = runs.filter(run => run.orientation === 'v');
  for (const horizontal of horizontals) for (const vertical of verticals) {
    if (horizontal.color !== vertical.color) continue;
    for (const [r, c] of horizontal.cells) {
      if (vertical.cells.some(([y, x]) => y === r && x === c)) intersections.push([r, c]);
    }
  }
  const candidate = (cells: Pos[]) =>
    cells.find(([r, c]) => (r === a[0] && c === a[1]) || (r === b[0] && c === b[1])) ??
    cells[Math.floor(cells.length / 2)];
  let keep: Pos | null = null;
  let special: Special | undefined;
  if (straightFive) { keep = candidate(straightFive.cells); special = 'color'; }
  else if (intersections.length && matches.size >= 5) { keep = candidate(intersections); special = 'wrapped'; }
  else if (four) { keep = candidate(four.cells); special = four.orientation === 'h' ? 'striped-v' : 'striped-h'; }
  return keep && special ? { position: keep, special } : null;
}

export function buildSwapSpecial(board: Candy[][], matches: Set<string>, a: Pos, b: Pos) {
  const created = findCreatedSpecial(board, matches, a, b);
  if (!created) return;
  const [r, c] = created.position;
  board[r][c] = makeCandy(board[r][c].color, created.special);
  matches.delete(keyOf(r, c));
}

export function findBestMove(
  board: Candy[][],
  goalType: GoalType,
  goalColor: number,
  jelly: Set<string>,
  secondaryGoalType?: GoalType,
  sugarShells?: Map<string, number>,
): [Pos, Pos] | null {
  let best: [Pos, Pos] | null = null;
  let bestValue = -Infinity;
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  const ingredientRows = Array.from({ length: columns }, (_, column) =>
    board.findIndex(row => row[column]?.kind === 'ingredient'),
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= rows || nc >= columns) continue;

        const first = board[r][c];
        const second = board[nr][nc];
        if (first.kind === 'ingredient' || second.kind === 'ingredient') continue;
        const candidate = clone(board);
        [candidate[r][c], candidate[nr][nc]] = [candidate[nr][nc], candidate[r][c]];
        const matches = findMatches(candidate);
        const activatesSpecial = Boolean(first.special || second.special);
        if (!matches.size && !activatesSpecial) continue;

        const createdSpecial = !activatesSpecial ? findCreatedSpecial(candidate, matches, [r, c], [nr, nc]) : null;
        const effectMatches = activatesSpecial
          ? applySpecialSwap(candidate, [r, c], [nr, nc], matches).matches
          : new Set(matches);
        if (createdSpecial) effectMatches.delete(keyOf(createdSpecial.position[0], createdSpecial.position[1]));
        const cleared = expandSpecials(candidate, effectMatches);
        let value = cleared.size + (createdSpecial ? 18 : 0);

        const goals = [goalType, ...(secondaryGoalType ? [secondaryGoalType] : [])];
        if (goals.includes('collect')) {
          for (const key of cleared) {
            const [mr, mc] = posOf(key);
            if (candidate[mr]?.[mc]?.color === goalColor) value += 9;
          }
        }
        if (goals.includes('jelly')) {
          for (const key of cleared) if (jelly.has(key)) value += 12;
        }
        if (goals.includes('score')) value += Math.min(20, cleared.size) * 0.35;
        if (goals.includes('boss')) value += Math.min(20, cleared.size) * 1.5;
        if (goals.includes('shell') && sugarShells) {
          for (const key of cleared) if (sugarShells.has(key)) value += 15;
        }
        if (goals.includes('special')) {
          for (const key of cleared) {
            const [specialRow, specialColumn] = posOf(key);
            if (candidate[specialRow]?.[specialColumn]?.special) value += 16;
          }
        }
        if (goals.includes('ingredient')) {
          for (const key of cleared) {
            const [clearRow, clearColumn] = posOf(key);
            if (ingredientRows[clearColumn] >= 0 && clearRow > ingredientRows[clearColumn]) value += 10;
          }
        }

        if (activatesSpecial) value += 4;
        if (value > bestValue) {
          bestValue = value;
          best = [[r, c], [nr, nc]];
        }
      }
    }
  }
  return best;
}

export function applySpecialSwap(board: Candy[][], a: Pos, b: Pos, existingMatches: Set<string>) {
  const matches = new Set(Array.from(existingMatches).filter(key => {
    const [row, column] = posOf(key);
    return board[row]?.[column]?.kind !== 'ingredient';
  }));
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  const first = board[a[0]][a[1]];
  const second = board[b[0]][b[1]];
  const one = first.special;
  const two = second.special;
  if (!one && !two) return { matches, message: '' };

  const addCell = (row: number, column: number) => {
    if (board[row]?.[column] && board[row][column].kind !== 'ingredient') matches.add(keyOf(row, column));
  };
  const addRow = (r: number) => { for (let c = 0; c < columns; c++) addCell(r, c); };
  const addColumn = (c: number) => { for (let r = 0; r < rows; r++) addCell(r, c); };
  const addArea = (centerR: number, centerC: number, radius: number) => {
    for (let r = Math.max(0, centerR - radius); r <= Math.min(rows - 1, centerR + radius); r++) {
      for (let c = Math.max(0, centerC - radius); c <= Math.min(columns - 1, centerC + radius); c++) addCell(r, c);
    }
  };

  if (one === 'color' && two === 'color') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) addCell(r, c);
    return { matches, message: 'BOARD CLEAR!' };
  }

  if (one === 'color' || two === 'color') {
    const bombPos = one === 'color' ? a : b;
    const partner = one === 'color' ? second : first;
    board[bombPos[0]][bombPos[1]] = { ...board[bombPos[0]][bombPos[1]], special: undefined };
    addCell(bombPos[0], bombPos[1]);
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
      if (board[r][c].kind === 'ingredient' || board[r][c].color !== partner.color) continue;
      if (partner.special && partner.special !== 'color') board[r][c] = { ...board[r][c], special: partner.special };
      addCell(r, c);
    }
    return { matches, message: partner.special ? 'COLOR CONVERSION!' : 'COLOR POP!' };
  }

  if (one === 'wrapped' && two === 'wrapped') {
    addArea(a[0], a[1], 2);
    addArea(b[0], b[1], 2);
    return { matches, message: 'DOUBLE WRAP!' };
  }

  if ((one === 'wrapped' && (two === 'striped-h' || two === 'striped-v')) ||
      (two === 'wrapped' && (one === 'striped-h' || one === 'striped-v'))) {
    const center = one === 'wrapped' ? a : b;
    for (let r = Math.max(0, center[0] - 1); r <= Math.min(rows - 1, center[0] + 1); r++) addRow(r);
    for (let c = Math.max(0, center[1] - 1); c <= Math.min(columns - 1, center[1] + 1); c++) addColumn(c);
    return { matches, message: 'TRIPLE CROSS!' };
  }

  if ((one === 'striped-h' || one === 'striped-v') && (two === 'striped-h' || two === 'striped-v')) {
    // Any stripe + stripe swap fires one row and one column at the destination;
    // the candies' own orientations do not turn a parallel pair into a single line.
    addRow(b[0]);
    addColumn(b[1]);
    return { matches, message: 'CROSS BLAST!' };
  }

  // A special swapped with an ordinary candy must consume both swapped
  // candies, even when the stripe's direction does not cross the partner cell.
  // Without this, a vertical swap with a horizontal stripe can leave the partner
  // stranded on the board, unlike the expected match-3 activation behavior.
  addCell(a[0], a[1]);
  addCell(b[0], b[1]);
  return { matches, message: one && two ? 'SPECIAL COMBO!' : 'SPECIAL BLAST!' };
}