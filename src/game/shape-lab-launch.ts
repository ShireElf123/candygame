import { BOARD_SHAPE_PROTOTYPES } from './shape-prototypes';

export type ShapeLabLaunch = { enabled: boolean; prototypeId: number };

/** Local development and Vercel Preview builds may host the isolated lab; Production never does. */
export function shapeLabIsAvailable(isDevelopment: boolean, mode: string, vercelEnvironment: string): boolean {
  return isDevelopment || mode === 'test' || vercelEnvironment === 'preview';
}

/** Isolated board-shape route for local development and Preview deployments only. */
export function parseShapeLabLaunch(search: string, isAvailable: boolean): ShapeLabLaunch {
  if (!isAvailable) return { enabled: false, prototypeId: 1 };
  const params = new URLSearchParams(search);
  if (!params.has('shapelab')) return { enabled: false, prototypeId: 1 };
  const requestedId = Number(params.get('shapelab'));
  const prototypeId = Number.isInteger(requestedId) &&
      requestedId >= 1 && requestedId <= BOARD_SHAPE_PROTOTYPES.length
    ? requestedId
    : 1;
  return { enabled: true, prototypeId };
}
