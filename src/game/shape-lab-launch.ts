import { BOARD_SHAPE_PROTOTYPES } from './shape-prototypes';

export type ShapeLabLaunch = { enabled: boolean; prototypeId: number };

/** Development-only route for isolated board-shape playtesting. */
export function parseShapeLabLaunch(search: string, isDevelopment: boolean): ShapeLabLaunch {
  if (!isDevelopment) return { enabled: false, prototypeId: 1 };
  const params = new URLSearchParams(search);
  if (!params.has('shapelab')) return { enabled: false, prototypeId: 1 };
  const requestedId = Number(params.get('shapelab'));
  const prototypeId = Number.isInteger(requestedId) &&
      requestedId >= 1 && requestedId <= BOARD_SHAPE_PROTOTYPES.length
    ? requestedId
    : 1;
  return { enabled: true, prototypeId };
}
