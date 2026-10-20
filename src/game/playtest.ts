import { LEVEL_COUNT } from './engine';

export type PlaytestLaunch = {
  enabled: boolean;
  level: number;
};

/** Development-only query launch for manually testing locked campaign levels. */
export function parsePlaytestLaunch(search: string, isDevelopment: boolean): PlaytestLaunch {
  if (!isDevelopment) return { enabled: false, level: 1 };

  const params = new URLSearchParams(search);
  if (!params.has('playtest')) return { enabled: false, level: 1 };

  const requestedLevel = Number(params.get('playtest'));
  const level = Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= LEVEL_COUNT
    ? requestedLevel
    : 1;
  return { enabled: true, level };
}
