export type GamePhase =
  | 'idle'
  | 'validating'
  | 'swapping'
  | 'rejecting'
  | 'clearing'
  | 'falling'
  | 'cascading'
  | 'settling';

const NEXT_PHASES: Record<GamePhase, readonly GamePhase[]> = {
  idle: ['validating'],
  validating: ['swapping', 'rejecting', 'clearing', 'settling'],
  swapping: ['validating', 'settling'],
  rejecting: ['settling'],
  clearing: ['falling', 'settling'],
  falling: ['cascading', 'settling'],
  cascading: ['clearing', 'settling'],
  settling: ['idle'],
};

/**
 * Validate normal resolver transitions. Returning to idle from any phase is
 * reserved for interruption/restart recovery, where the old run is cancelled.
 */
export function transitionGamePhase(current: GamePhase, next: GamePhase): GamePhase {
  if (current === next || next === 'idle' || NEXT_PHASES[current].includes(next)) return next;
  throw new Error(`Invalid game phase transition: ${current} -> ${next}`);
}
