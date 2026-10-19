import type { AnimationDetectionInfo, AnimationWaitResult } from './animation';

export const PERFORMANCE_OVERRIDES_ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'test';

type Scalar = string | number | boolean | null;
export type PerformanceDetails = Record<string, Scalar>;
export type MoveTraceOutcome = 'completed' | 'cancelled' | 'recovered';
export type AnimationWaitMetric = {
  name: string;
  requestedAtMs: number;
  frameReadyAtMs?: number;
  animationDetectedAtMs?: number;
  completedAtMs?: number;
  source: AnimationDetectionInfo['source'] | 'not-detected';
  activeAnimationCount: number;
  expectedMotionMs: number | null;
  elapsedMs?: number;
  setupMs?: number;
  observedMotionWaitMs?: number;
  idleWaitMs?: number;
  result?: AnimationWaitResult;
};
export type ReactProfileMetric = {
  profilerId: string;
  phase: string;
  actualDurationMs: number;
  baseDurationMs: number;
  startTimeMs: number;
  commitTimeMs: number;
};
export type VisualSnapshot = {
  label: string;
  atMs: number;
  candyElements: number;
  burstElements: number;
  particleElements: number;
  activeAnimationCount: number;
  activeIdleAnimationCount: number;
  animationNames: Record<string, number>;
};
export type MovePerformanceReport = {
  id: number;
  kind: string;
  outcome: MoveTraceOutcome;
  metadata: PerformanceDetails;
  durationMs: number;
  events: Array<{ name: string; atMs: number; details?: PerformanceDetails }>;
  jsSpans: Array<{ name: string; atMs: number; durationMs: number }>;
  waits: AnimationWaitMetric[];
  reactSamples: ReactProfileMetric[];
  visualSnapshots: VisualSnapshot[];
  frameIntervalsMs: number[];
  longTasks: Array<{ atMs: number; durationMs: number }>;
  domMutations: {
    total: number;
    childList: number;
    attributes: number;
    characterData: number;
    addedNodes: number;
    removedNodes: number;
  };
  summary: {
    jsExecutionMs: number;
    appRenderMs: number;
    appCommitCount: number;
    boardRenderMs: number;
    boardCommitCount: number;
    totalAnimationWaitMs: number;
    expectedCssMotionMs: number;
    setupAndFrameHandoffMs: number;
    idleOrOverrunWaitMs: number;
    watchdogCount: number;
    frameGapCountOver25Ms: number;
    maxFrameGapMs: number;
    longTaskCount: number;
    maxBurstElements: number;
    maxParticleElements: number;
    maxActiveAnimations: number;
    maxActiveIdleAnimations: number;
  };
};

export type AnimationWaitRecorder = {
  frameReady(): void;
  animationsDetected(info: AnimationDetectionInfo): void;
  complete(result: AnimationWaitResult): void;
};

export type MoveTraceHandle = {
  id: number;
  mark(name: string, details?: PerformanceDetails): void;
  measure<T>(name: string, operation: () => T): T;
  beginWait(name: string): AnimationWaitRecorder;
  recordReactProfile(metric: ReactProfileMetric): void;
  snapshotBoard(board: Element | null, label: string): void;
  setOutcome(outcome: MoveTraceOutcome): void;
  finish(outcome?: MoveTraceOutcome): MovePerformanceReport;
};

export type DevelopmentPerformanceOptions = {
  seed: number | null;
  effectsOff: boolean;
};

const finishedReports: MovePerformanceReport[] = [];
let activeTrace: MoveTraceRecorder | null = null;
let nextMoveId = 1;
const MAX_REPORTS = 12;
const MAX_FRAME_SAMPLES = 900;

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function roundMs(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function copyReport(report: MovePerformanceReport): MovePerformanceReport {
  return JSON.parse(JSON.stringify(report)) as MovePerformanceReport;
}

function cssAnimationName(animation: Animation): string {
  return (animation as Animation & { animationName?: string }).animationName ?? '';
}

export function developmentPerformanceOptionsFromSearch(
  search: string,
  allowOverrides = PERFORMANCE_OVERRIDES_ENABLED,
): DevelopmentPerformanceOptions {
  if (!allowOverrides) return { seed: null, effectsOff: false };
  const params = new URLSearchParams(search);
  const rawSeed = params.get('perfSeed');
  const parsedSeed = rawSeed && /^[+-]?\d+$/.test(rawSeed) ? Number(rawSeed) : Number.NaN;
  return {
    seed: Number.isSafeInteger(parsedSeed) ? parsedSeed >>> 0 : null,
    effectsOff: params.get('perfEffects') === 'off',
  };
}

function currentSearch(): string {
  if (!PERFORMANCE_OVERRIDES_ENABLED || typeof window === 'undefined') return '';
  try {
    return window.location.search;
  } catch {
    return '';
  }
}

export function performanceTraceEnabledFromSearch(
  search: string,
  allowCapture = PERFORMANCE_OVERRIDES_ENABLED,
  testMode = import.meta.env.MODE === 'test',
): boolean {
  return allowCapture && (testMode || new URLSearchParams(search).get('perfTrace') === '1');
}

const STARTUP_SEARCH = currentSearch();
export const PERFORMANCE_TRACE_ENABLED = import.meta.env.MODE === 'test'
  || (import.meta.env.DEV && new URLSearchParams(STARTUP_SEARCH).get('perfTrace') === '1');
export const DEVELOPMENT_PERFORMANCE_OPTIONS = developmentPerformanceOptionsFromSearch(STARTUP_SEARCH);
export const PERFORMANCE_SEED = DEVELOPMENT_PERFORMANCE_OPTIONS.seed;
export const PERFORMANCE_EFFECTS_OFF = DEVELOPMENT_PERFORMANCE_OPTIONS.effectsOff;

/** A repeatable PRNG used only when a developer explicitly supplies `perfSeed`. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let value = state += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function fingerprintBoard(board: readonly (readonly { color: number; special?: string }[])[]): string {
  return board.map(row => row.map(candy => `${candy.color}${candy.special ? `:${candy.special}` : ''}`).join(','))
    .join('/');
}

export class MoveTraceRecorder implements MoveTraceHandle {
  readonly id: number;
  private readonly kind: string;
  private readonly metadata: PerformanceDetails;
  private readonly clock: () => number;
  private readonly startedAt: number;
  private outcome: MoveTraceOutcome = 'completed';
  private open = true;
  private events: MovePerformanceReport['events'] = [];
  private jsSpans: MovePerformanceReport['jsSpans'] = [];
  private waits: AnimationWaitMetric[] = [];
  private reactSamples: ReactProfileMetric[] = [];
  private visualSnapshots: VisualSnapshot[] = [];
  private frameIntervalsMs: number[] = [];
  private longTasks: MovePerformanceReport['longTasks'] = [];
  private domMutations: MovePerformanceReport['domMutations'] = {
    total: 0,
    childList: 0,
    attributes: 0,
    characterData: 0,
    addedNodes: 0,
    removedNodes: 0,
  };
  private mutationObserver: MutationObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  private frameId: number | null = null;
  private previousFrameTime: number | null = null;

  constructor(id: number, kind: string, metadata: PerformanceDetails, clock: () => number = now) {
    this.id = id;
    this.kind = kind;
    this.metadata = { ...metadata };
    this.clock = clock;
    this.startedAt = clock();
  }

  mark(name: string, details?: PerformanceDetails): void {
    if (!this.open) return;
    this.events.push({
      name,
      atMs: roundMs(this.clock() - this.startedAt),
      ...(details ? { details: { ...details } } : {}),
    });
  }

  measure<T>(name: string, operation: () => T): T {
    if (!this.open) return operation();
    const startedAt = this.clock();
    try {
      return operation();
    } finally {
      this.jsSpans.push({
        name,
        atMs: roundMs(startedAt - this.startedAt),
        durationMs: roundMs(this.clock() - startedAt),
      });
    }
  }

  beginWait(name: string): AnimationWaitRecorder {
    const requestedAt = this.clock();
    const metric: AnimationWaitMetric = {
      name,
      requestedAtMs: roundMs(requestedAt - this.startedAt),
      source: 'not-detected',
      activeAnimationCount: 0,
      expectedMotionMs: null,
    };
    this.waits.push(metric);
    let completed = false;

    return {
      frameReady: () => {
        if (!this.open || completed || metric.frameReadyAtMs !== undefined) return;
        metric.frameReadyAtMs = roundMs(this.clock() - this.startedAt);
      },
      animationsDetected: info => {
        if (!this.open || completed) return;
        metric.animationDetectedAtMs = roundMs(this.clock() - this.startedAt);
        metric.source = info.source;
        metric.activeAnimationCount = info.activeCount;
        metric.expectedMotionMs = info.expectedRemainingMs === undefined
          ? null
          : roundMs(Math.max(0, info.expectedRemainingMs));
      },
      complete: result => {
        if (!this.open || completed) return;
        completed = true;
        const completedAt = this.clock();
        metric.completedAtMs = roundMs(completedAt - this.startedAt);
        metric.elapsedMs = roundMs(completedAt - requestedAt);
        metric.result = result;
        const phaseStart = metric.animationDetectedAtMs !== undefined
          ? this.startedAt + metric.animationDetectedAtMs
          : metric.frameReadyAtMs !== undefined
            ? this.startedAt + metric.frameReadyAtMs
            : completedAt;
        metric.setupMs = roundMs(Math.max(0, phaseStart - requestedAt));
        metric.observedMotionWaitMs = metric.animationDetectedAtMs === undefined
          ? 0
          : roundMs(Math.max(0, completedAt - phaseStart));
        if (metric.activeAnimationCount === 0) {
          metric.idleWaitMs = metric.elapsedMs;
        } else if (metric.expectedMotionMs !== null) {
          metric.idleWaitMs = roundMs(Math.max(0, metric.observedMotionWaitMs - metric.expectedMotionMs));
        } else {
          metric.idleWaitMs = 0;
        }
      },
    };
  }

  recordReactProfile(metric: ReactProfileMetric): void {
    if (!this.open) return;
    this.reactSamples.push({
      ...metric,
      actualDurationMs: roundMs(metric.actualDurationMs),
      baseDurationMs: roundMs(metric.baseDurationMs),
      startTimeMs: roundMs(metric.startTimeMs - this.startedAt),
      commitTimeMs: roundMs(metric.commitTimeMs - this.startedAt),
    });
  }

  snapshotBoard(board: Element | null, label: string): void {
    if (!this.open || !board) return;
    const candies = board.querySelectorAll('.candy').length;
    const bursts = board.querySelectorAll('.juice-burst').length;
    const particles = board.querySelectorAll('.juice-burst i').length;
    let animations: Animation[] = [];
    try {
      if (typeof board.getAnimations === 'function') animations = board.getAnimations({ subtree: true });
    } catch {
      animations = [];
    }

    const animationNames: Record<string, number> = {};
    let activeAnimationCount = 0;
    let activeIdleAnimationCount = 0;
    for (const animation of animations) {
      const state: string = animation.playState;
      if (state !== 'running' && state !== 'pending') continue;
      activeAnimationCount += 1;
      const name = cssAnimationName(animation);
      if (name) animationNames[name] = (animationNames[name] ?? 0) + 1;
      if (/idle-bob|color-gem-glow|color-charge|wrapped-charge|jelly-glimmer|shell-glimmer/.test(name)) {
        activeIdleAnimationCount += 1;
      }
    }

    this.visualSnapshots.push({
      label,
      atMs: roundMs(this.clock() - this.startedAt),
      candyElements: candies,
      burstElements: bursts,
      particleElements: particles,
      activeAnimationCount,
      activeIdleAnimationCount,
      animationNames,
    });
  }

  setOutcome(outcome: MoveTraceOutcome): void {
    if (this.open) this.outcome = outcome;
  }

  observeBoard(board: Element | null): void {
    if (!this.open || !board || typeof MutationObserver === 'undefined') return;
    try {
      this.mutationObserver = new MutationObserver(records => this.recordMutations(records));
      this.mutationObserver.observe(board, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    } catch {
      this.mutationObserver = null;
    }
  }

  startDiagnostics(): void {
    if (!this.open || typeof window === 'undefined') return;
    if (typeof window.requestAnimationFrame === 'function') {
      const sampleFrame = (timestamp: number) => {
        if (!this.open) return;
        if (this.previousFrameTime !== null && this.frameIntervalsMs.length < MAX_FRAME_SAMPLES) {
          this.frameIntervalsMs.push(roundMs(timestamp - this.previousFrameTime));
        }
        this.previousFrameTime = timestamp;
        this.frameId = window.requestAnimationFrame(sampleFrame);
      };
      this.frameId = window.requestAnimationFrame(sampleFrame);
    }

    if (typeof PerformanceObserver === 'undefined') return;
    try {
      const supported = PerformanceObserver.supportedEntryTypes;
      if (!supported?.includes('longtask')) return;
      this.longTaskObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType !== 'longtask' || entry.startTime < this.startedAt) continue;
          this.longTasks.push({
            atMs: roundMs(entry.startTime - this.startedAt),
            durationMs: roundMs(entry.duration),
          });
        }
      });
      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      this.longTaskObserver?.disconnect();
      this.longTaskObserver = null;
    }
  }

  finish(outcome = this.outcome): MovePerformanceReport {
    if (!this.open) {
      const previous = finishedReports.find(report => report.id === this.id);
      if (previous) return copyReport(previous);
      throw new Error(`Move trace ${this.id} has already finished.`);
    }
    this.outcome = outcome;
    this.open = false;

    if (this.frameId !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(this.frameId);
    }
    this.frameId = null;

    if (this.mutationObserver) {
      this.recordMutations(this.mutationObserver.takeRecords());
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.longTaskObserver) {
      for (const entry of this.longTaskObserver.takeRecords()) {
        if (entry.entryType === 'longtask' && entry.startTime >= this.startedAt) {
          this.longTasks.push({ atMs: roundMs(entry.startTime - this.startedAt), durationMs: roundMs(entry.duration) });
        }
      }
      this.longTaskObserver.disconnect();
      this.longTaskObserver = null;
    }

    const durationMs = roundMs(this.clock() - this.startedAt);
    const appSamples = this.reactSamples.filter(sample => sample.profilerId === 'app');
    const boardSamples = this.reactSamples.filter(sample => sample.profilerId === 'board');
    const sum = (values: number[]) => roundMs(values.reduce((total, value) => total + value, 0));
    const max = (values: number[]) => values.length ? roundMs(Math.max(...values)) : 0;
    const maxBurstElements = max(this.visualSnapshots.map(snapshot => snapshot.burstElements));
    const maxParticleElements = max(this.visualSnapshots.map(snapshot => snapshot.particleElements));
    const maxActiveAnimations = max(this.visualSnapshots.map(snapshot => snapshot.activeAnimationCount));
    const maxActiveIdleAnimations = max(this.visualSnapshots.map(snapshot => snapshot.activeIdleAnimationCount));
    const report: MovePerformanceReport = {
      id: this.id,
      kind: this.kind,
      outcome: this.outcome,
      metadata: { ...this.metadata },
      durationMs,
      events: this.events.map(event => ({ ...event, ...(event.details ? { details: { ...event.details } } : {}) })),
      jsSpans: this.jsSpans.map(span => ({ ...span })),
      waits: this.waits.map(wait => ({ ...wait })),
      reactSamples: this.reactSamples.map(sample => ({ ...sample })),
      visualSnapshots: this.visualSnapshots.map(snapshot => ({ ...snapshot, animationNames: { ...snapshot.animationNames } })),
      frameIntervalsMs: [...this.frameIntervalsMs],
      longTasks: this.longTasks.map(task => ({ ...task })),
      domMutations: { ...this.domMutations },
      summary: {
        jsExecutionMs: sum(this.jsSpans.map(span => span.durationMs)),
        appRenderMs: sum(appSamples.map(sample => sample.actualDurationMs)),
        appCommitCount: appSamples.length,
        boardRenderMs: sum(boardSamples.map(sample => sample.actualDurationMs)),
        boardCommitCount: boardSamples.length,
        totalAnimationWaitMs: sum(this.waits.map(wait => wait.observedMotionWaitMs ?? 0)),
        expectedCssMotionMs: sum(this.waits.map(wait => wait.expectedMotionMs ?? 0)),
        setupAndFrameHandoffMs: sum(this.waits.map(wait => wait.setupMs ?? 0)),
        idleOrOverrunWaitMs: sum(this.waits.map(wait => wait.idleWaitMs ?? 0)),
        watchdogCount: this.waits.filter(wait => wait.result === 'timeout').length,
        frameGapCountOver25Ms: this.frameIntervalsMs.filter(interval => interval > 25).length,
        maxFrameGapMs: max(this.frameIntervalsMs),
        longTaskCount: this.longTasks.length,
        maxBurstElements,
        maxParticleElements,
        maxActiveAnimations,
        maxActiveIdleAnimations,
      },
    };

    finishedReports.push(copyReport(report));
    if (finishedReports.length > MAX_REPORTS) finishedReports.splice(0, finishedReports.length - MAX_REPORTS);
    if (activeTrace === this) activeTrace = null;
    return copyReport(report);
  }

  private recordMutations(records: MutationRecord[]): void {
    for (const record of records) {
      this.domMutations.total += 1;
      if (record.type === 'childList') {
        this.domMutations.childList += 1;
        this.domMutations.addedNodes += record.addedNodes.length;
        this.domMutations.removedNodes += record.removedNodes.length;
      } else if (record.type === 'attributes') {
        this.domMutations.attributes += 1;
      } else if (record.type === 'characterData') {
        this.domMutations.characterData += 1;
      }
    }
  }
}

export function startMoveTrace(
  kind: string,
  metadata: PerformanceDetails = {},
  board: Element | null = null,
): MoveTraceHandle | null {
  if (!PERFORMANCE_TRACE_ENABLED) return null;
  if (activeTrace) activeTrace.finish('cancelled');
  const trace = new MoveTraceRecorder(nextMoveId++, kind, metadata);
  activeTrace = trace;
  trace.observeBoard(board);
  trace.startDiagnostics();
  trace.mark('input-received');
  trace.snapshotBoard(board, 'input');
  return trace;
}

export function recordReactProfile(
  profilerId: string,
  phase: string,
  actualDurationMs: number,
  baseDurationMs: number,
  startTimeMs: number,
  commitTimeMs: number,
): void {
  if (!PERFORMANCE_TRACE_ENABLED || !activeTrace) return;
  activeTrace.recordReactProfile({
    profilerId,
    phase,
    actualDurationMs,
    baseDurationMs,
    startTimeMs,
    commitTimeMs,
  });
}

export function activeMoveTraceId(): number | null {
  return activeTrace?.id ?? null;
}

export function getMovePerformanceHistory(): MovePerformanceReport[] {
  return finishedReports.map(copyReport);
}

export function clearMovePerformanceHistory(): void {
  finishedReports.length = 0;
}

type BrowserPerformanceApi = {
  getLastMove(): MovePerformanceReport | null;
  getHistory(): MovePerformanceReport[];
  clear(): void;
};

declare global {
  interface Window {
    __JAM_SHIFT_PERFORMANCE__?: BrowserPerformanceApi;
  }
}

if (PERFORMANCE_TRACE_ENABLED && typeof window !== 'undefined') {
  window.__JAM_SHIFT_PERFORMANCE__ = {
    getLastMove: () => {
      const last = finishedReports[finishedReports.length - 1];
      return last ? copyReport(last) : null;
    },
    getHistory: getMovePerformanceHistory,
    clear: clearMovePerformanceHistory,
  };
}
