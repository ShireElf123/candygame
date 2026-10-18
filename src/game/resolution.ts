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
  jelly: Set<string>;
  bossHealth: number;
  sugarShells: Map<string, number>;
  shellsHit: number;
  shellHitCells: string[];
  shellsCleared: number;
  boardAfterDrop: Candy[][];
  fallDistances: Record<number, number>;
};

export type ResolutionPlan = {
  steps: ResolutionStep[];
  board: Candy[][];
  score: number;
  goalProgress: number;
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
    current = dropped.board;
    totalCleared += expanded.size;
    steps.push({
      cascade,
      clearCells: Array.from(expanded),
      points,
      score,
      goalProgress,
      jelly: new Set(jelly),
      bossHealth,
      sugarShells: new Map(sugarShells),
      shellsHit,
      shellHitCells,
      shellsCleared,
      boardAfterDrop: current,
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
    jelly,
    bossHealth,
    sugarShells,
    shellsCleared,
    totalCleared,
    totalShellsHit,
    reshuffleReason,
  };
}

