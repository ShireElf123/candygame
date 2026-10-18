/* Pure match-3 rules and board utilities. UI code renders the engine's results. */
export type Special = 'striped-h' | 'striped-v' | 'wrapped' | 'color';
export type Candy = { id: number; color: number; special?: Special };
export type Screen = 'intro' | 'map' | 'play' | 'win' | 'lose';
export type Booster = 'hammer' | 'line' | 'rainbow';
export type Pos = [number, number];
export const COLORS = ['grape', 'lemon', 'berry', 'mint', 'blueberry', 'orange'];
export const GLYPHS = ['✿', '●', '♥', '✦', '◆', '◉'];
export const SIZE = 8;
export const LEVEL_COUNT = 100;
export type GoalType = 'score' | 'collect' | 'jelly' | 'boss';
export type BossDefinition = {
  name: string;
  epithet: string;
  color: number;
  maxHealth: number;
  taunt: string;
};
export type LevelDefinition = {
  chapter: number;
  chapterName: string;
  moves: number;
  target: number;
  goalType: GoalType;
  secondaryGoalType?: GoalType;
  goalColor: number;
  goalCount: number;
  boss?: BossDefinition;
};

type ObjectiveSet = Pick<LevelDefinition, 'goalType' | 'secondaryGoalType'>;

export const CHAPTERS = [
  'Sugar Garden',
  'Berry Bay',
  'Lemon Lagoon',
  'Mint Meadow',
  'Moonlit Market',
  'Crystal Caverns',
  'Neon Orchard',
  'Frosted Peaks',
  'Starfall Summit',
  'Royal Candy Castle',
] as const;

const CHAPTER_BOSSES: Omit<BossDefinition, 'maxHealth'>[] = [
  { name: 'Captain Crumble', epithet: 'Cookie corsair', color: 5, taunt: 'Catch me if you can!' },
  { name: 'Berry Bandit', epithet: 'Jam jar juggler', color: 2, taunt: 'This berry haul is mine!' },
  { name: 'Zest Zapper', epithet: 'Lagoon lightning', color: 1, taunt: 'Ready for a sour surprise?' },
  { name: 'Mallow Muncher', epithet: 'Meadow mischief-maker', color: 3, taunt: 'The meadow is my snack!' },
  { name: 'Midnight Moth', epithet: 'Market moonlighter', color: 0, taunt: 'You will never catch my sparkle.' },
  { name: 'Crystal Crumbler', epithet: 'Cavern keeper', color: 4, taunt: 'One crack and the crystals are mine.' },
  { name: 'Neon Nibbler', epithet: 'Orchard night owl', color: 0, taunt: 'Let us light up this board!' },
  { name: 'Frost Flurry', epithet: 'Peak snow-sprite', color: 4, taunt: 'A chilly challenge awaits!' },
  { name: 'Comet Cookie', epithet: 'Starfall showstopper', color: 5, taunt: 'Make a wish, then make a match!' },
  { name: 'Crowned Caramel', epithet: 'Castle confectioner', color: 1, taunt: 'The crown stays with me!' },
];

const CHAPTER_GOALS: GoalType[][] = [
  ['score', 'score', 'score', 'score', 'collect', 'jelly', 'score', 'collect', 'jelly', 'score'],
  ['score', 'collect', 'score', 'jelly', 'score', 'collect', 'jelly', 'score', 'collect', 'jelly'],
  ['score', 'jelly', 'collect', 'score', 'collect', 'jelly', 'score', 'collect', 'jelly', 'score'],
  ['score', 'collect', 'jelly', 'score', 'jelly', 'collect', 'score', 'collect', 'jelly', 'score'],
  ['score', 'jelly', 'collect', 'score', 'collect', 'jelly', 'score', 'jelly', 'collect', 'score'],
  ['score', 'collect', 'score', 'jelly', 'collect', 'score', 'jelly', 'collect', 'score', 'jelly'],
  ['score', 'jelly', 'collect', 'score', 'jelly', 'collect', 'score', 'jelly', 'collect', 'score'],
  ['score', 'collect', 'jelly', 'score', 'collect', 'jelly', 'score', 'collect', 'jelly', 'score'],
  ['score', 'jelly', 'collect', 'jelly', 'score', 'collect', 'jelly', 'score', 'collect', 'jelly'],
  ['score', 'collect', 'jelly', 'collect', 'score', 'jelly', 'collect', 'score', 'jelly', 'collect'],
];

const CHAPTER_MOVES = [
  [32, 32, 31, 31, 30, 30, 29, 29, 28, 28],
  [30, 30, 29, 29, 28, 28, 27, 27, 26, 26],
  [29, 29, 28, 28, 27, 27, 26, 26, 25, 25],
  [28, 28, 27, 27, 26, 26, 25, 25, 24, 24],
  [27, 27, 26, 26, 25, 25, 24, 24, 23, 23],
  [27, 26, 26, 25, 25, 24, 24, 23, 23, 22],
  [26, 26, 25, 25, 24, 24, 23, 23, 22, 22],
  [26, 25, 25, 24, 24, 23, 23, 22, 22, 21],
  [25, 25, 24, 24, 23, 23, 22, 22, 21, 21],
  [24, 24, 23, 23, 22, 22, 21, 21, 21, 20],
];

const CHAPTER_TARGET_BASES = [850, 1350, 1510, 1680, 1850, 2020, 2190, 2360, 2530, 2700];
const LEVEL_TARGET_STEPS = [0, 20, 45, 70, 95, 125, 155, 185, 215, 245];
// Late-chapter milestones introduce a second, explicit win condition.
const MIXED_OBJECTIVE_LEVELS = new Set([29, 39, 49, 59, 69, 79, 89, 99]);

export const LEVELS: LevelDefinition[] = Array.from({ length: LEVEL_COUNT }, (_, i) => {
  const chapterIndex = Math.floor(i / 10);
  const step = i % 10;
  const target = chapterIndex === 0
    ? [850, 900, 950, 1000, 1050, 1100, 1200, 1250, 1300, 1350][step]
    : CHAPTER_TARGET_BASES[chapterIndex] + LEVEL_TARGET_STEPS[step];
  const boss = step === 9
    ? { ...CHAPTER_BOSSES[chapterIndex], maxHealth: 6 + chapterIndex }
    : undefined;
  const goalType: GoalType = boss ? 'boss' : CHAPTER_GOALS[chapterIndex][step];
  const secondaryGoalType = !boss && MIXED_OBJECTIVE_LEVELS.has(i + 1)
    ? goalType === 'score' ? 'jelly' : 'score'
    : undefined;
  return {
    chapter: chapterIndex + 1,
    chapterName: CHAPTERS[chapterIndex],
    // Each chapter has its own authored goal sequence and move budget. Difficulty rises
    // in steps rather than using one steep formula for every level after level 10.
    moves: CHAPTER_MOVES[chapterIndex][step],
    target,
    goalType,
    ...(secondaryGoalType ? { secondaryGoalType } : {}),
    goalColor: boss?.color ?? (i + 2) % COLORS.length,
    goalCount: chapterIndex === 0
      ? 5 + Math.floor(step / 4)
      : Math.min(15, 6 + chapterIndex + Math.floor(step / 4)),
    ...(boss ? { boss } : {}),
  };
});

export function goalsForLevel(level: ObjectiveSet): GoalType[] {
  return level.secondaryGoalType ? [level.goalType, level.secondaryGoalType] : [level.goalType];
}

export function hasGoal(level: ObjectiveSet, goalType: GoalType): boolean {
  return goalsForLevel(level).includes(goalType);
}

export function objectivesComplete(
  level: LevelDefinition,
  score: number,
  collected: number,
  jellyRemaining: number,
  bossHealthRemaining = level.boss?.maxHealth ?? 0,
): boolean {
  return goalsForLevel(level).every(goalType => {
    if (goalType === 'score') return score >= level.target;
    if (goalType === 'collect') return collected >= level.goalCount;
    if (goalType === 'jelly') return jellyRemaining === 0;
    return bossHealthRemaining <= 0;
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
): number {
  const percentages = goalsForLevel(level).map(goalType => {
    if (goalType === 'score') return level.target > 0 ? Math.min(100, score / level.target * 100) : 100;
    if (goalType === 'collect') return level.goalCount > 0 ? Math.min(100, collected / level.goalCount * 100) : 100;
    if (goalType === 'jelly') return jellyTotal > 0 ? Math.min(100, (jellyTotal - jellyRemaining) / jellyTotal * 100) : 100;
    return level.boss && level.boss.maxHealth > 0
      ? Math.min(100, Math.max(0, level.boss.maxHealth - bossHealthRemaining) / level.boss.maxHealth * 100)
      : 100;
  });
  return Math.min(...percentages);
}

/** Bosses take one point per four cleared candies, plus momentum from cascades. */
export function bossDamageForClear(clearedCells: number, cascade: number): number {
  return Math.max(1, Math.floor(Math.max(0, clearedCells) / 4)) + Math.max(0, cascade - 1);
}

export function createJelly(level: number): Set<string> {
  const levelIndex = Math.max(0, Math.min(LEVEL_COUNT - 1, level - 1));
  const chapterIndex = Math.floor(levelIndex / 10);
  const step = levelIndex % 10;
  const amount = chapterIndex === 0
    ? 4 + Math.floor(step / 3)
    : Math.min(18, 5 + chapterIndex + Math.floor(step / 3));
  const cells = Array.from({ length: SIZE * SIZE }, (_, index) => keyOf(Math.floor(index / SIZE), index % SIZE));
  cells.sort((a, b) => {
    const [ar, ac] = posOf(a); const [br, bc] = posOf(b);
    return ((ar * 17 + ac * 29 + level * 13) % 67) - ((br * 17 + bc * 29 + level * 13) % 67);
  });
  return new Set(cells.slice(0, amount));
}
let nextCandyId = 1;
export const makeCandy = (color?: number, special?: Special): Candy => ({
  id: nextCandyId++,
  color: color ?? Math.floor(Math.random() * COLORS.length),
  special,
});
export const clone = (board: Candy[][]) => board.map(row => row.map(candy => ({ ...candy })));
export const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
export const keyOf = (r: number, c: number) => r + ':' + c;
export const posOf = (key: string): Pos => key.split(':').map(Number) as Pos;

export function findMatches(board: Candy[][]): Set<string> {
  const found = new Set<string>();
  for (let r = 0; r < SIZE; r++) {
    let c = 0;
    while (c < SIZE) {
      const color = board[r][c]?.color;
      let end = c + 1;
      while (color !== undefined && end < SIZE && board[r][end]?.color === color) end++;
      if (color !== undefined && end - c >= 3) for (let x = c; x < end; x++) found.add(keyOf(r, x));
      c = end;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let r = 0;
    while (r < SIZE) {
      const color = board[r][c]?.color;
      let end = r + 1;
      while (color !== undefined && end < SIZE && board[end][c]?.color === color) end++;
      if (color !== undefined && end - r >= 3) for (let y = r; y < end; y++) found.add(keyOf(y, c));
      r = end;
    }
  }
  return found;
}

export function matchRuns(board: Candy[][]) {
  const runs: { cells: Pos[]; length: number; orientation: 'h' | 'v'; color: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    let c = 0;
    while (c < SIZE) {
      const color = board[r][c]?.color;
      let end = c + 1;
      while (color !== undefined && end < SIZE && board[r][end]?.color === color) end++;
      if (color !== undefined && end - c >= 3) runs.push({ cells: Array.from({ length: end - c }, (_, i) => [r, c + i] as Pos), length: end - c, orientation: 'h', color });
      c = end;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let r = 0;
    while (r < SIZE) {
      const color = board[r][c]?.color;
      let end = r + 1;
      while (color !== undefined && end < SIZE && board[end][c]?.color === color) end++;
      if (color !== undefined && end - r >= 3) runs.push({ cells: Array.from({ length: end - r }, (_, i) => [r + i, c] as Pos), length: end - r, orientation: 'v', color });
      r = end;
    }
  }
  return runs;
}

export function hasMove(board: Candy[][]): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= SIZE || nc >= SIZE) continue;
      // Special swaps are valid activations even without a normal match.
      if (board[r][c]?.special || board[nr][nc]?.special) return true;
      const test = clone(board);
      [test[r][c], test[nr][nc]] = [test[nr][nc], test[r][c]];
      if (findMatches(test).size) return true;
    }
  }
  return false;
}

export function createBoard(random: () => number = Math.random): Candy[][] {
  const board: Candy[][] = [];
  for (let r = 0; r < SIZE; r++) {
    board[r] = [];
    for (let c = 0; c < SIZE; c++) {
      let color = Math.floor(random() * COLORS.length);
      for (let attempt = 0; attempt < 40; attempt++) {
        const makesHorizontal = c >= 2 && board[r][c - 1].color === color && board[r][c - 2].color === color;
        const makesVertical = r >= 2 && board[r - 1][c].color === color && board[r - 2][c].color === color;
        if (!makesHorizontal && !makesVertical) break;
        color = (color + 1 + Math.floor(random() * (COLORS.length - 1))) % COLORS.length;
      }
      board[r][c] = makeCandy(color);
    }
  }
  return board;
}

export function freshBoard(random: () => number = Math.random): Candy[][] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const board = createBoard(random);
    if (!findMatches(board).size && hasMove(board)) return board;
  }
  // Guaranteed fallback: no initial triples, and swapping (0,1) with (1,1)
  // creates 0-0-0 across the first row. The pattern also avoids vertical runs.
  const board = Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => makeCandy((r * 2 + Math.floor(c / 2)) % COLORS.length))
  );
  board[0][0] = makeCandy(0); board[0][1] = makeCandy(1); board[0][2] = makeCandy(0);
  board[1][0] = makeCandy(1); board[1][1] = makeCandy(0); board[1][2] = makeCandy(2);
  board[2][0] = makeCandy(3); board[2][1] = makeCandy(4); board[2][2] = makeCandy(5);
  return board;
}

export function shuffleBoard(input: Candy[][], random: () => number = Math.random): Candy[][] {
  // Keep an untouched copy so the deterministic fallback can preserve the player's candies.
  const originalCandies = input.flat().map(candy => ({ ...candy }));
  const candies = originalCandies.map(candy => ({ ...candy }));
  for (let attempt = 0; attempt < 160; attempt++) {
    for (let i = candies.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candies[i], candies[j]] = [candies[j], candies[i]];
    }
    const candidate = Array.from({ length: SIZE }, (_, r) => candies.slice(r * SIZE, (r + 1) * SIZE).map(candy => ({ ...candy })));
    if (!findMatches(candidate).size && hasMove(candidate)) return candidate;
  }
  // Random shuffles can repeatedly land on dead boards. Try every cyclic offset
  // deterministically before replacing the board, preserving candy identity and specials.
  for (let offset = 1; offset < originalCandies.length; offset++) {
    const rotated = originalCandies.slice(offset).concat(originalCandies.slice(0, offset));
    const candidate = Array.from({ length: SIZE }, (_, r) =>
      rotated.slice(r * SIZE, (r + 1) * SIZE).map(candy => ({ ...candy }))
    );
    if (!findMatches(candidate).size && hasMove(candidate)) return candidate;
  }
  return freshBoard(random);
}

export function expandSpecials(board: Candy[][], initial: Set<string>): Set<string> {
  const cleared = new Set(initial);
  const queue = Array.from(initial);
  while (queue.length) {
    const key = queue.pop()!;
    const [r, c] = posOf(key);
    const candy = board[r]?.[c];
    if (!candy?.special) continue;
    const add = (y: number, x: number) => {
      const next = keyOf(y, x);
      if (!cleared.has(next)) { cleared.add(next); queue.push(next); }
    };
    if (candy.special === 'striped-h') {
      for (let x = 0; x < SIZE; x++) add(r, x);
    } else if (candy.special === 'striped-v') {
      for (let y = 0; y < SIZE; y++) add(y, c);
    } else if (candy.special === 'wrapped') {
      for (let y = Math.max(0, r - 1); y <= Math.min(SIZE - 1, r + 1); y++) {
        for (let x = Math.max(0, c - 1); x <= Math.min(SIZE - 1, c + 1); x++) add(y, x);
      }
    } else {
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (board[y][x].color === candy.color) add(y, x);
    }
  }
  return cleared;
}

export function dropMatches(input: Candy[][], matches: Set<string>): { board: Candy[][]; spawned: number[] } {
  const board = clone(input);
  matches.forEach(key => { const [r, c] = posOf(key); board[r][c] = null as unknown as Candy; });
  const spawned: number[] = [];
  for (let c = 0; c < SIZE; c++) {
    const kept: Candy[] = [];
    for (let r = SIZE - 1; r >= 0; r--) if (board[r][c]) kept.push(board[r][c]);
    while (kept.length < SIZE) {
      const candy = makeCandy();
      kept.push(candy);
      spawned.push(candy.id);
    }
    for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) board[r][c] = kept[i];
  }
  return { board, spawned };
}

export function buildSwapSpecial(board: Candy[][], matches: Set<string>, a: Pos, b: Pos) {
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
  if (keep && special) {
    const [r, c] = keep;
    board[r][c] = makeCandy(board[r][c].color, special);
    matches.delete(keyOf(r, c));
  }
}

export function findBestMove(
  board: Candy[][],
  goalType: GoalType,
  goalColor: number,
  jelly: Set<string>,
  secondaryGoalType?: GoalType,
): [Pos, Pos] | null {
  let best: [Pos, Pos] | null = null;
  let bestValue = -Infinity;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= SIZE || nc >= SIZE) continue;

        const first = board[r][c];
        const second = board[nr][nc];
        const candidate = clone(board);
        [candidate[r][c], candidate[nr][nc]] = [candidate[nr][nc], candidate[r][c]];
        const matches = findMatches(candidate);
        const activatesSpecial = Boolean(first.special || second.special);
        if (!matches.size && !activatesSpecial) continue;

        const effectMatches = activatesSpecial
          ? applySpecialSwap(candidate, [r, c], [nr, nc], matches).matches
          : matches;
        const cleared = expandSpecials(candidate, effectMatches);
        let value = cleared.size;

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
  const matches = new Set(existingMatches);
  const first = board[a[0]][a[1]];
  const second = board[b[0]][b[1]];
  const one = first.special;
  const two = second.special;
  if (!one && !two) return { matches, message: '' };

  const addRow = (r: number) => { for (let c = 0; c < SIZE; c++) matches.add(keyOf(r, c)); };
  const addColumn = (c: number) => { for (let r = 0; r < SIZE; r++) matches.add(keyOf(r, c)); };
  const addArea = (centerR: number, centerC: number, radius: number) => {
    for (let r = Math.max(0, centerR - radius); r <= Math.min(SIZE - 1, centerR + radius); r++) {
      for (let c = Math.max(0, centerC - radius); c <= Math.min(SIZE - 1, centerC + radius); c++) matches.add(keyOf(r, c));
    }
  };

  if (one === 'color' && two === 'color') {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) matches.add(keyOf(r, c));
    return { matches, message: 'BOARD CLEAR!' };
  }

  if (one === 'color' || two === 'color') {
    const bombPos = one === 'color' ? a : b;
    const partner = one === 'color' ? second : first;
    board[bombPos[0]][bombPos[1]] = { ...board[bombPos[0]][bombPos[1]], special: undefined };
    matches.add(keyOf(bombPos[0], bombPos[1]));
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (board[r][c].color !== partner.color) continue;
      if (partner.special && partner.special !== 'color') board[r][c] = { ...board[r][c], special: partner.special };
      matches.add(keyOf(r, c));
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
    for (let r = Math.max(0, center[0] - 1); r <= Math.min(SIZE - 1, center[0] + 1); r++) addRow(r);
    for (let c = Math.max(0, center[1] - 1); c <= Math.min(SIZE - 1, center[1] + 1); c++) addColumn(c);
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
  matches.add(keyOf(a[0], a[1]));
  matches.add(keyOf(b[0], b[1]));
  return { matches, message: one && two ? 'SPECIAL COMBO!' : 'SPECIAL BLAST!' };
}