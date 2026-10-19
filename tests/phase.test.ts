import { describe, expect, it } from 'vitest';
import { transitionGamePhase, type GamePhase } from '../src/game/phase';

describe('game phase transitions', () => {
  it('accepts the complete swap, reject, cascade, and settle paths', () => {
    expect(transitionGamePhase('idle', 'validating')).toBe('validating');
    expect(transitionGamePhase('validating', 'swapping')).toBe('swapping');
    expect(transitionGamePhase('swapping', 'validating')).toBe('validating');
    expect(transitionGamePhase('validating', 'clearing')).toBe('clearing');
    expect(transitionGamePhase('clearing', 'falling')).toBe('falling');
    expect(transitionGamePhase('falling', 'cascading')).toBe('cascading');
    expect(transitionGamePhase('cascading', 'clearing')).toBe('clearing');
    expect(transitionGamePhase('falling', 'settling')).toBe('settling');
    expect(transitionGamePhase('settling', 'idle')).toBe('idle');

    expect(transitionGamePhase('validating', 'rejecting')).toBe('rejecting');
    expect(transitionGamePhase('rejecting', 'settling')).toBe('settling');
  });

  it('allows cancellation to recover directly to idle from every active phase', () => {
    const activePhases: GamePhase[] = [
      'validating', 'swapping', 'rejecting', 'clearing', 'falling', 'cascading', 'settling',
    ];
    for (const phase of activePhases) expect(transitionGamePhase(phase, 'idle')).toBe('idle');
  });

  it('rejects a resolver transition that would skip or reorder a phase', () => {
    expect(() => transitionGamePhase('idle', 'clearing')).toThrow('Invalid game phase transition');
    expect(() => transitionGamePhase('swapping', 'falling')).toThrow('Invalid game phase transition');
    expect(() => transitionGamePhase('clearing', 'cascading')).toThrow('Invalid game phase transition');
  });
});
