import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForAnimationPhase } from '../src/game/animation';
import { GAME_MOTION } from '../src/game/motion';

type TestAnimation = Animation & { complete: () => void };

function makeAnimation(name = 'candy-swap') {
  let resolveFinished!: () => void;
  let rejectFinished!: (reason?: unknown) => void;
  let state: AnimationPlayState = 'running';
  const finished = new Promise<void>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });
  const animation = {
    animationName: name,
    get playState() { return state; },
    currentTime: 0,
    playbackRate: 1,
    effect: { getComputedTiming: () => ({ endTime: 100 }) },
    finished,
    cancel: vi.fn(() => {
      state = 'idle';
      rejectFinished(new Error('animation cancelled'));
    }),
    complete: () => {
      state = 'finished';
      resolveFinished();
    },
  } as unknown as TestAnimation;
  return animation;
}

function elementWith(...animations: Animation[]): Element {
  return {
    isConnected: true,
    getAnimations: () => animations,
  } as unknown as Element;
}

async function advanceToAnimationFrame() {
  await vi.advanceTimersByTimeAsync(0);
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('animation phase completion', () => {
  it('waits for every relevant animation rather than a fixed duration', async () => {
    vi.useFakeTimers();
    const first = makeAnimation();
    const second = makeAnimation();
    const result = waitForAnimationPhase(
      () => [elementWith(first), elementWith(second)],
      'candy-swap',
      { watchdogMs: 500 },
    );
    await advanceToAnimationFrame();

    let settled = false;
    void result.then(() => { settled = true; });
    first.complete();
    await Promise.resolve();
    expect(settled).toBe(false);

    second.complete();
    await expect(result).resolves.toBe('finished');
  });

  it('treats a cancelled animation as complete even after its element is removed', async () => {
    vi.useFakeTimers();
    const animation = makeAnimation();
    const element = elementWith(animation);
    const result = waitForAnimationPhase(() => [element], 'candy-swap', { watchdogMs: 500 });
    await advanceToAnimationFrame();

    Object.defineProperty(element, 'isConnected', { configurable: true, value: false });
    animation.cancel();
    await expect(result).resolves.toBe('finished');
  });

  it.each(['candy-swap', 'candy-reject', 'candy-pop', 'candy-fall'])(
    'cancels the %s animation and cleans up when the run is aborted',
    async animationName => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const animation = makeAnimation(animationName);
      const result = waitForAnimationPhase(
        () => [elementWith(animation)],
        animationName,
        { signal: controller.signal, watchdogMs: 500 },
      );
      await advanceToAnimationFrame();

      controller.abort();
      await expect(result).resolves.toBe('aborted');
      expect(animation.cancel).toHaveBeenCalledOnce();
    },
  );

  it('uses a bounded watchdog if the browser never reports animation completion', async () => {
    vi.useFakeTimers();
    const animation = makeAnimation();
    const result = waitForAnimationPhase(() => [elementWith(animation)], 'candy-swap', { watchdogMs: 24 });
    await advanceToAnimationFrame();
    await vi.advanceTimersByTimeAsync(24);

    await expect(result).resolves.toBe('timeout');
    expect(animation.cancel).toHaveBeenCalledOnce();
  });

  it('caps the default watchdog even if reported animation timing is unreasonable', async () => {
    vi.useFakeTimers();
    const animation = makeAnimation();
    Object.defineProperty(animation, 'effect', {
      configurable: true,
      value: { getComputedTiming: () => ({ endTime: 60_000 }) },
    });
    const result = waitForAnimationPhase(() => [elementWith(animation)], 'candy-swap');
    await advanceToAnimationFrame();
    await vi.advanceTimersByTimeAsync(1_199);
    let settled = false;
    void result.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe('timeout');
    expect(animation.cancel).toHaveBeenCalledOnce();
  });

  it('uses animation events as a fallback when the Web Animations API is unavailable', async () => {
    vi.useFakeTimers();
    const fakeWindow = Object.assign(new EventTarget(), {
      getComputedStyle: vi.fn(() => ({ animationName: 'candy-pop', animationDuration: `${GAME_MOTION.clearAnimationMs}ms` })),
    });
    vi.stubGlobal('window', fakeWindow);
    const target = Object.assign(new EventTarget(), { isConnected: true });
    const result = waitForAnimationPhase(() => [target as unknown as Element], 'candy-pop', { watchdogMs: 500 });
    await advanceToAnimationFrame();

    const animationEnd = new Event('animationend');
    Object.defineProperty(animationEnd, 'animationName', { value: 'candy-pop' });
    target.dispatchEvent(animationEnd);
    await expect(result).resolves.toBe('finished');
    expect(fakeWindow.getComputedStyle).toHaveBeenCalledWith(target);
  });

  it('fast-forwards on viewport resize so the next phase can measure its new geometry', async () => {
    vi.useFakeTimers();
    const fakeWindow = new EventTarget();
    vi.stubGlobal('window', fakeWindow);
    const animation = makeAnimation();
    const result = waitForAnimationPhase(() => [elementWith(animation)], 'candy-swap', { watchdogMs: 500 });
    await advanceToAnimationFrame();

    fakeWindow.dispatchEvent(new Event('resize'));
    await expect(result).resolves.toBe('resized');
    expect(animation.cancel).toHaveBeenCalledOnce();
  });

  it('fast-forwards and cancels active motion when the document is backgrounded', async () => {
    vi.useFakeTimers();
    const fakeDocument = new EventTarget() as EventTarget & { visibilityState: DocumentVisibilityState };
    Object.defineProperty(fakeDocument, 'visibilityState', { configurable: true, writable: true, value: 'visible' });
    vi.stubGlobal('document', fakeDocument);
    const animation = makeAnimation();
    const result = waitForAnimationPhase(() => [elementWith(animation)], 'candy-swap', { watchdogMs: 500 });
    await advanceToAnimationFrame();

    fakeDocument.visibilityState = 'hidden';
    fakeDocument.dispatchEvent(new Event('visibilitychange'));
    await expect(result).resolves.toBe('hidden');
    expect(animation.cancel).toHaveBeenCalledOnce();
  });

  it('does not wait for an absent animation or when reduced motion is requested', async () => {
    const getElements = vi.fn(() => [elementWith()]);
    await expect(waitForAnimationPhase(getElements, 'candy-swap', { reducedMotion: true })).resolves.toBe('reduced-motion');
    expect(getElements).not.toHaveBeenCalled();

    vi.useFakeTimers();
    const noAnimation = waitForAnimationPhase(() => [elementWith()], 'candy-swap');
    await advanceToAnimationFrame();
    await expect(noAnimation).resolves.toBe('no-animation');
  });
});
