import {
  createBoard,
  findMatches,
  hasMove,
  LEVELS,
  makeCandy,
  makeVoidCell,
  type BoardMask,
  type Candy,
  type LevelDefinition,
} from './engine';
import { createSeededRandom } from './performance';

export type BoardShapePrototype = {
  id: number;
  name: string;
  description: string;
  boardMask: BoardMask;
  playableCellCount: number;
  level: LevelDefinition;
};

const START_ROWS = [
  [2, 1, 0, 0, 0, 0, 1, 2],
  [0, 0, 3, 3, 3, 3, 0, 0],
  [3, 2, 1, 0, 0, 1, 2, 3],
  [0, 1, 2, 3, 4, 3, 2, 1],
  [4, 3, 2, 1, 0, 0, 0, 0],
  [0, 1, 2, 3, 3, 2, 1, 0],
] as const;

const NAMES = [
  ['Bellflower', 'A broad lower bowl opening into a compact crown.'],
  ['Twin Isles', 'Two upper banks join into one shared lower field.'],
  ['Tide Bowl', 'A deep, symmetric inlet that widens toward the bottom.'],
  ['Switchback', 'A stepped diagonal edge shifts the playable lanes.'],
  ['Crescent Reach', 'An asymmetric sweep leaves a long, open shoulder.'],
  ['Pocket Current', 'A central cut-out splits two gravity lanes before they rejoin below.'],
] as const;

function maskFromStartRows(starts: readonly number[]): BoardMask {
  return Array.from({ length: 8 }, (_, row) => starts.map(start => row >= start ? '#' : '.').join(''));
}

const SHAPE_MASKS = START_ROWS.map((starts, index) => {
  const mask = maskFromStartRows(starts);
  if (index === 5) {
    mask[4] = '###..###';
    mask[5] = '###..###';
  }
  return mask;
});

function boardFromColors(colors: number[][], mask: BoardMask): Candy[][] {
  return colors.map((row, rowIndex) => row.map((color, columnIndex) =>
    mask[rowIndex][columnIndex] === '#' ? makeCandy(color) : makeVoidCell(),
  ));
}

/** One reproducible, match-free color layout shared by every shape study. */
function createSharedInitialGrid(): number[][] {
  const base = LEVELS[0];
  const palette = base.spawnWeights.map(weight => weight.color);
  for (let seedOffset = 0; seedOffset < 128; seedOffset++) {
    const initial = createBoard(createSeededRandom(20261020 + seedOffset), base.spawnWeights, 8, 8);
    const colors = initial.map(row => row.map(candy => candy.color));
    for (let rotation = 0; rotation < palette.length; rotation++) {
      const [a, b, c] = [0, 1, 2].map(offset => palette[(rotation + offset) % palette.length]);
      const candidate = colors.map(row => [...row]);
      // This shared 3×3 patch exists on all six silhouettes and guarantees the
      // same opening move without changing the rest of the seeded board.
      candidate[5][0] = a; candidate[5][1] = b; candidate[5][2] = a;
      candidate[6][0] = b; candidate[6][1] = a; candidate[6][2] = c;
      candidate[7][0] = c; candidate[7][1] = c; candidate[7][2] = b;
      if (SHAPE_MASKS.every(mask => {
        const board = boardFromColors(candidate, mask);
        return findMatches(board).size === 0 && hasMove(board);
      })) return candidate;
    }
  }
  throw new Error('Could not prepare a shared match-free opening for the shape lab.');
}

const SHARED_INITIAL_GRID = createSharedInitialGrid();

function makePrototype(id: number): BoardShapePrototype {
  const [name, description] = NAMES[id - 1];
  const boardMask = SHAPE_MASKS[id - 1].map(row => row);
  const playableCellCount = boardMask.reduce((total, row) => total + [...row].filter(cell => cell === '#').length, 0);
  const base = LEVELS[0];
  const level: LevelDefinition = {
    ...base,
    levelId: 1,
    chapter: 1,
    chapterName: 'Shape Lab',
    rows: 8,
    columns: 8,
    // Every prototype uses the same level-one score goal, move budget, spawn
    // pool and seeded tile colors; only the playable silhouette changes.
    moves: base.moves,
    target: base.target,
    goalType: base.goalType,
    secondaryGoalType: undefined,
    objectives: base.objectives.map(objective => ({ ...objective })),
    spawnWeights: base.spawnWeights.map(weight => ({ ...weight })),
    initialGrid: SHARED_INITIAL_GRID.map(row => [...row]),
    boardMask,
  };
  return { id, name, description, boardMask, playableCellCount, level };
}

/** Development-only board studies; deliberately not appended to the campaign manifest. */
export const BOARD_SHAPE_PROTOTYPES: BoardShapePrototype[] = START_ROWS.map((_, index) => makePrototype(index + 1));

export function getBoardShapePrototype(id: number): BoardShapePrototype {
  return BOARD_SHAPE_PROTOTYPES.find(prototype => prototype.id === id) ?? BOARD_SHAPE_PROTOTYPES[0];
}
