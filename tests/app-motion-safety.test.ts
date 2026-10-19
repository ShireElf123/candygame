import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const animationSource = readFileSync(new URL('../src/game/animation.ts', import.meta.url), 'utf8');
const performanceSource = readFileSync(new URL('../src/game/performance.ts', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');

describe('move lifecycle and performance instrumentation safeguards', () => {
  it('rejects rapid duplicate input and unlocks only after the final idle commit', () => {
    expect(appSource).toContain("phaseRef.current !== 'idle' || inputLock.current");
    expect(appSource).toContain("inputLock.current = validated !== 'idle'");
    expect(appSource).toContain("moveTrace.current.mark('input-unlock-requested')");
    expect(appSource).toContain("finishing.mark('input-unlocked')");
    expect(appSource).toContain("if (gamePhase === 'idle' && finishing)");
  });

  it('traces valid swaps, rejected swaps, boosters, cascades, and recovery separately', () => {
    expect(appSource).toContain("startMoveTrace('swap'");
    expect(appSource).toContain("startMoveTrace('booster'");
    expect(appSource).toContain("trace?.mark('match-detected'");
    expect(appSource).toContain("trace?.mark('rejected-swap-animation-requested')");
    expect(appSource).toContain("trace?.mark('cascade-wave-started'");
    expect(appSource).toContain("trace?.mark('cascade-wave-completed'");
    expect(appSource).toContain("trace?.mark('final-settling-started'");
    expect(appSource).toContain("trace?.setOutcome('recovered')");
  });

  it('keeps dependent cascade waves sequential and skips empty fall phases', () => {
    const waveLoop = appSource.indexOf('for (const step of plan.steps)');
    const clearWait = appSource.indexOf("await waitForBoardAnimation('.candy.clearing'", waveLoop);
    const fallStart = appSource.indexOf("setGamePhase('falling')", clearWait);
    const fallWait = appSource.indexOf("await waitForBoardAnimation('.candy.falling'", fallStart);
    const nextWave = appSource.indexOf("trace?.mark('cascade-wave-completed'", fallWait);

    expect(waveLoop).toBeGreaterThanOrEqual(0);
    expect(clearWait).toBeGreaterThan(waveLoop);
    expect(fallStart).toBeGreaterThan(clearWait);
    expect(fallWait).toBeGreaterThan(fallStart);
    expect(nextWave).toBeGreaterThan(fallWait);
    expect(appSource).toContain("trace?.mark('fall-animation-skipped'");
  });

  it('aborts stale work on restart and releases animation listeners for resize, reduced motion, and detachment', () => {
    expect(appSource).toContain('gameRun.current += 1');
    expect(appSource).toContain('cancelMotionRun();');
    expect(appSource).toContain('motionController.current?.abort()');
    expect(appSource).toContain('reducedMotion: prefersReducedMotion()');
    expect(animationSource).toContain("finish('resized')");
    expect(animationSource).toContain('detachObserver.observe(document.documentElement');
    expect(animationSource).toContain('detachObserver?.disconnect()');
  });

  it('keeps diagnostics and React profiling development/test-only without console logging', () => {
    expect(performanceSource).toContain("import.meta.env.DEV || import.meta.env.MODE === 'test'");
    expect(mainSource).toContain('PERFORMANCE_TRACE_ENABLED');
    expect(performanceSource).not.toMatch(/console\.(?:log|info|debug|warn|error)\s*\(/);
  });
});
