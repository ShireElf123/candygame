import {
  bossDamageForClear,
  clone,
  damageSugarShells,
  dropMatches,
  expandSpecials,
  findMatches,
  hasGoal,
  hasMove,
  LevelDefinition,
  Candy,
  posOf,
  shuffleBoard,
} from './engine';

export type ResolutionStep = {
  cascade: number;
  clearCells: string[];
  points: number;
  score: number;
  goalProgress: number;
  specialsActivated: number;
  ingredientsDelivered: number;
  ingredientsDeliveredThisWave: number;
  deliveredIngredientCells: string[];
  jelly: Set<string>;
  bossHealth: number;
  sugarShells: Map<string, number>;
  shellsHit: number;
  shellHitCells: string[];
  shellsCleared: number;
  boardAfterDrop: Candy[][];
  boardForFallAnimation: Candy[][];
  fallDistances: Record<number, number>;
};

export type ResolutionPlan = {
  steps: ResolutionStep[];
  board: Candy[][];
  score: number;
  goalProgress: number;
  specialsActivated: number;
  ingredientsDelivered: number;
  jelly: Set<string>;
  bossHealth: number;
  sugarShells: Map<string, number>;
  shellsCleared: number;
  totalCleared: number;
  totalShellsHit: number;
  reshuffleReason: 'cascade-limit' | 'no-valid-moves' | null;
};

export type ResolutionInput = {
  level: LevelDefinition;
  board: Candy[][];
  matches: Set<string>;
  score: number;
  goalProgress: number;
  specialsActivated?: number;
  ingredientsDelivered?: number;
  jelly: Set<string>;
  bossHealth: number;
  sugarShells: Map<string, number>;
  shellsCleared: number;
  startingShellImpactCells?: Set<string>;
};

/**
 * Resolve game rules into a deterministic sequence of snapshots. Rendering code
 * can animate each snapshot without owning or duplicating cascade/objective rules.
 */
export function buildResolutionPlan(input: ResolutionInput, random: () => number = Math.random): ResolutionPlan {
  let current = clone(input.board);
  let score = input.score;
  let goalProgress = input.goalProgress;
  let specialsActivated = input.specialsActivated ?? 0;
  let ingredientsDelivered = input.ingredientsDelivered ?? 0;
  let jelly = new Set(input.jelly);
  let bossHealth = input.bossHealth;
  let sugarShells = new Map(input.sugarShells);
  let shellsCleared = input.shellsCleared;
  let matches = new Set(input.matches);
  let cascade = 0;
  let totalCleared = 0;
  let totalShellsHit = 0;
  let reshuffleReason: ResolutionPlan['reshuffleReason'] = null;
  const steps: ResolutionStep[] = [];

  while (matches.size && cascade < 30) {
    cascade++;
    const expanded = expandSpecials(current, matches);
    const activatedThisWave = Array.from(expanded).reduce((count, key) => {
      const [row, column] = posOf(key);
      return count + (current[row]?.[column]?.special ? 1 : 0);
    }, 0);
    specialsActivated += activatedThisWave;
    const config = input.level;
    if (config.boss && bossHealth > 0) {
      bossHealth = Math.max(0, bossHealth - bossDamageForClear(expanded.size, cascade));
    }

    let shellsHit = 0;
    let shellHitCells: string[] = [];
    if (hasGoal(config, 'shell')) {
      const shellImpactCells = new Set(expanded);
      if (cascade === 1) input.startingShellImpactCells?.forEach(key => shellImpactCells.add(key));
      shellHitCells = Array.from(shellImpactCells).filter(key => sugarShells.has(key));
      const damage = damageSugarShells(sugarShells, shellImpactCells);
      sugarShells = damage.shells;
      shellsHit = damage.hit;
      shellsCleared += damage.cleared;
      totalShellsHit += shellsHit;
    }

    if (hasGoal(config, 'collect')) {
      for (const key of expanded) {
        const [row, column] = posOf(key);
        if (current[row]?.[column]?.color === config.goalColor) goalProgress++;
      }
    }
    if (hasGoal(config, 'jelly')) expanded.forEach(key => jelly.delete(key));

    const points = expanded.size * 60 * Math.min(cascade, 6);
    score += points;
    const dropped = dropMatches(current, expanded, config.spawnWeights, random);
    ingredientsDelivered += dropped.ingredientsDelivered;
    current = dropped.board;
    totalCleared += expanded.size;
    steps.push({
      cascade,
      clearCells: Array.from(expanded),
      points,
      score,
      goalProgress,
      specialsActivated,
      ingredientsDelivered,
      ingredientsDeliveredThisWave: dropped.ingredientsDelivered,
      deliveredIngredientCells: dropped.deliveredIngredientCells,
      jelly: new Set(jelly),
      bossHealth,
      sugarShells: new Map(sugarShells),
      shellsHit,
      shellHitCells,
      shellsCleared,
      boardAfterDrop: current,
      boardForFallAnimation: dropped.boardForFallAnimation,
      fallDistances: dropped.fallDistances,
    });
    matches = findMatches(current);
  }

  if (matches.size) {
    current = shuffleBoard(current, random);
    reshuffleReason = 'cascade-limit';
  } else if (!hasMove(current)) {
    current = shuffleBoard(current, random);
    reshuffleReason = 'no-valid-moves';
  }

  return {
    steps,
    board: current,
    score,
    goalProgress,
    specialsActivated,
    ingredientsDelivered,
    jelly,
    bossHealth,
    sugarShells,
    shellsCleared,
    totalCleared,
    totalShellsHit,
    reshuffleReason,
  };
}

