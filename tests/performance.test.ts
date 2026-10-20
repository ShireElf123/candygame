import { afterEach, describe, expect, it } from 'vitest';
import {
  clearMovePerformanceHistory,
  createSeededRandom,
  developmentPerformanceOptionsFromSearch,
  fingerprintBoard,
  MoveTraceRecorder,
  performanceTraceEnabledFromSearch,
  PERFORMANCE_OVERRIDES_ENABLED,
  PERFORMANCE_TRACE_ENABLED,
} from '../src/game/performance';

afterEach(() => clearMovePerformanceHistory());

describe('development performance controls', () => {
  it('enables development overrides and trace capture in Vitest', () => {
    expect(PERFORMANCE_OVERRIDES_ENABLED).toBe(true);
    expect(PERFORMANCE_TRACE_ENABLED).toBe(true);
    expect(performanceTraceEnabledFromSearch('', false, true)).toBe(false);
    expect(performanceTraceEnabledFromSearch('?perfTrace=1', true, false)).toBe(true);
    expect(performanceTraceEnabledFromSearch('', true, false)).toBe(false);
  });

  it('parses reproducible seeds and effect toggles only when overrides are enabled', () => {
    expect(developmentPerformanceOptionsFromSearch('?perfSeed=42&perfEffects=off', true)).toEqual({
      seed: 42,
      effectsOff: true,
    });
    expect(developmentPerformanceOptionsFromSearch('?perfSeed=-1', true)).toEqual({
      seed: 4_294_967_295,
      effectsOff: false,
    });
    expect(developmentPerformanceOptionsFromSearch('?perfSeed=1.5&perfEffects=off', true)).toEqual({
      seed: null,
      effectsOff: true,
    });
    expect(developmentPerformanceOptionsFromSearch('?perfSeed=42&perfEffects=off', false)).toEqual({
      seed: null,
      effectsOff: false,
    });
  });

  it('produces repeatable random sequences without changing board fingerprints', () => {
    const first = createSeededRandom(1234);
    const replay = createSeededRandom(1234);
    const other = createSeededRandom(1235);
    const firstSequence = Array.from({ length: 5 }, () => first());
    const boardWithIds: Array<Array<{ color: number; id: number; special?: string }>> = [
      [{ color: 1, id: 10 }, { color: 2, id: 20, special: 'wrapped' }],
    ];
    const sameBoardWithDifferentIds: Array<Array<{ color: number; id: number; special?: string }>> = [
      [{ color: 1, id: 99 }, { color: 2, id: 42, special: 'wrapped' }],
    ];

    expect(firstSequence).toEqual(Array.from({ length: 5 }, () => replay()));
    expect(firstSequence).not.toEqual(Array.from({ length: 5 }, () => other()));
    expect(fingerprintBoard(boardWithIds)).toBe('1,2:wrapped');
    expect(fingerprintBoard(sameBoardWithDifferentIds)).toBe('1,2:wrapped');
    expect(fingerprintBoard([[{ color: 0, kind: 'ingredient' }]])).toBe('ingredient');
  });
});

describe('move timing reports', () => {
  it('separates synchronous JS, React renders, CSS motion, frame handoff, and excess waiting', () => {
    let clock = 100;
    const trace = new MoveTraceRecorder(9876, 'swap', { profile: 'readable', seed: 11 }, () => clock);
    trace.mark('input-received');
    clock += 1;
    const result = trace.measure('evaluate-swap', () => {
      clock += 2;
      return 'valid';
    });
    expect(result).toBe('valid');

    const wait = trace.beginWait('swap');
    clock += 2;
    wait.frameReady();
    clock += 1;
    wait.animationsDetected({ source: 'web-animations', activeCount: 2, expectedRemainingMs: 120 });
    clock += 130;
    wait.complete('finished');
    trace.recordReactProfile({
      profilerId: 'app',
      phase: 'update',
      actualDurationMs: 2.5,
      baseDurationMs: 7,
      startTimeMs: 230,
      commitTimeMs: 232,
    });
    trace.recordReactProfile({
      profilerId: 'board',
      phase: 'update',
      actualDurationMs: 1.25,
      baseDurationMs: 3,
      startTimeMs: 230,
      commitTimeMs: 232,
    });
    trace.mark('input-unlocked');
    const report = trace.finish();

    expect(report.outcome).toBe('completed');
    expect(report.metadata).toEqual({ profile: 'readable', seed: 11 });
    expect(report.jsSpans).toEqual([{ name: 'evaluate-swap', atMs: 1, durationMs: 2 }]);
    expect(report.waits[0]).toMatchObject({
      name: 'swap',
      source: 'web-animations',
      activeAnimationCount: 2,
      expectedMotionMs: 120,
      elapsedMs: 133,
      setupMs: 3,
      observedMotionWaitMs: 130,
      idleWaitMs: 10,
      result: 'finished',
    });
    expect(report.summary).toMatchObject({
      jsExecutionMs: 2,
      appRenderMs: 2.5,
      appCommitCount: 1,
      boardRenderMs: 1.25,
      boardCommitCount: 1,
      totalAnimationWaitMs: 130,
      expectedCssMotionMs: 120,
      setupAndFrameHandoffMs: 3,
      idleOrOverrunWaitMs: 10,
      watchdogCount: 0,
    });
    expect(report.events.map(event => event.name)).toEqual(['input-received', 'input-unlocked']);
  });
});
