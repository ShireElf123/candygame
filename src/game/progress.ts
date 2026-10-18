import { LEVELS } from './engine';

/** Score tiers are shared by the level recap, map, and saved campaign totals. */
export function starsForScore(score: number, target: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(target) || target <= 0) return 0;
  if (score >= target * 2.35) return 3;
  if (score >= target * 1.55) return 2;
  if (score >= target) return 1;
  return 0;
}

/** Only the best score from a completed run is passed in here, never a failed personal best. */
export function starsForCampaign(winningScores: Record<string, number>): number {
  return Object.entries(winningScores).reduce((total, [levelKey, score]) => {
    const levelNumber = Number(levelKey);
    const config = Number.isInteger(levelNumber) ? LEVELS[levelNumber - 1] : undefined;
    return config ? total + starsForScore(score, config.target) : total;
  }, 0);
}
