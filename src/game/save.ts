import type { Booster } from './engine';

export const SAVE_KEY = 'jamshift-save';
export const SAVE_VERSION = 2;

export type PlayerSave = {
  version: number;
  level: number;
  unlocked: number;
  bestScores: Record<string, number>;
  bestWinScores: Record<string, number>;
  completedLevels: Record<string, boolean>;
  tutorialSeen: boolean;
  sound: boolean;
  boosterCounts: Record<Booster, number>;
};

export const DEFAULT_SAVE: PlayerSave = {
  version: SAVE_VERSION,
  level: 1,
  unlocked: 1,
  bestScores: {},
  bestWinScores: {},
  completedLevels: {},
  tutorialSeen: false,
  sound: true,
  boosterCounts: { hammer: 3, line: 2, rainbow: 1 },
};

const MAX_BOOSTER_CHARGES = 999;

function safeLevel(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.floor(parsed))) : fallback;
}

function scoreRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record: Record<string, number> = {};
  for (const [key, score] of Object.entries(value)) {
    const level = Number(key);
    const normalized = typeof score === 'number' ? score : Number(score);
    if (Number.isInteger(level) && level >= 1 && level <= 100 && Number.isFinite(normalized) && normalized >= 0) {
      record[String(level)] = Math.floor(normalized);
    }
  }
  return record;
}

function completedRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record: Record<string, boolean> = {};
  for (const [key, completed] of Object.entries(value)) {
    const level = Number(key);
    if (Number.isInteger(level) && level >= 1 && level <= 100 && completed === true) record[String(level)] = true;
  }
  return record;
}

function boosterRecord(value: unknown): Record<Booster, number> {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const normalize = (name: Booster) => {
    const quantity = Number(raw[name]);
    return Number.isFinite(quantity)
      ? Math.max(0, Math.min(MAX_BOOSTER_CHARGES, Math.floor(quantity)))
      : DEFAULT_SAVE.boosterCounts[name];
  };
  return { hammer: normalize('hammer'), line: normalize('line'), rainbow: normalize('rainbow') };
}

/** Validate and migrate persisted progress without trusting browser storage contents. */
export function parseSave(serialized: string | null | undefined): PlayerSave {
  if (!serialized) return { ...DEFAULT_SAVE, boosterCounts: { ...DEFAULT_SAVE.boosterCounts } };

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_SAVE, boosterCounts: { ...DEFAULT_SAVE.boosterCounts } };
    }
    const raw = parsed as Record<string, unknown>;
    const bestScores = scoreRecord(raw.bestScores);
    const completedLevels = completedRecord(raw.completedLevels);
    const legacyWinningScores = Object.fromEntries(
      Object.keys(completedLevels)
        .filter(level => bestScores[level] !== undefined)
        .map(level => [level, bestScores[level]]),
    );
    const bestWinScores = raw.bestWinScores === undefined
      ? legacyWinningScores
      : scoreRecord(raw.bestWinScores);
    const highestCompleted = Math.max(0, ...Object.keys(completedLevels).map(Number));
    const unlocked = Math.max(
      safeLevel(raw.unlocked, 1),
      Math.min(100, highestCompleted + (highestCompleted > 0 ? 1 : 0)),
    );

    return {
      version: SAVE_VERSION,
      level: Math.min(unlocked, safeLevel(raw.level, 1)),
      unlocked,
      bestScores,
      bestWinScores,
      completedLevels,
      tutorialSeen: raw.tutorialSeen === true,
      sound: raw.sound !== false,
      boosterCounts: boosterRecord(raw.boosterCounts),
    };
  } catch {
    return { ...DEFAULT_SAVE, boosterCounts: { ...DEFAULT_SAVE.boosterCounts } };
  }
}

export function readSave(): PlayerSave {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_SAVE, boosterCounts: { ...DEFAULT_SAVE.boosterCounts } };
    return parseSave(window.localStorage.getItem(SAVE_KEY));
  } catch {
    return { ...DEFAULT_SAVE, boosterCounts: { ...DEFAULT_SAVE.boosterCounts } };
  }
}

export function writeSave(save: Omit<PlayerSave, 'version'>): boolean {
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, version: SAVE_VERSION }));
    return true;
  } catch {
    return false;
  }
}
