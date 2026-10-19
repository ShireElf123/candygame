export type AnimationWaitResult =
  | 'finished'
  | 'no-animation'
  | 'reduced-motion'
  | 'aborted'
  | 'hidden'
  | 'resized'
  | 'timeout';

export type AnimationWaitOptions = {
  signal?: AbortSignal;
  reducedMotion?: boolean;
  watchdogMs?: number;
  watchResize?: boolean;
};

const MIN_WATCHDOG_MS = 350;
const MAX_WATCHDOG_MS = 1_200;
const WATCHDOG_GRACE_MS = 250;

type FrameResult = 'frame' | 'aborted' | 'hidden' | 'resized';
type CssAnimationLike = Animation & { animationName?: string };

function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

function waitForNextFrame(options: AnimationWaitOptions): Promise<FrameResult> {
  const { signal, watchResize = true } = options;
  if (signal?.aborted) return Promise.resolve('aborted');
  if (isDocumentHidden()) return Promise.resolve('hidden');

  return new Promise(resolve => {
    let settled = false;
    let frameId: number | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (frameId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId);
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
      signal?.removeEventListener('abort', onAbort);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
      if (watchResize && typeof window !== 'undefined') window.removeEventListener('resize', onResize);
    };
    const finish = (result: FrameResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onAbort = () => finish('aborted');
    const onVisibilityChange = () => {
      if (isDocumentHidden()) finish('hidden');
    };
    const onResize = () => finish('resized');

    signal?.addEventListener('abort', onAbort, { once: true });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
    if (watchResize && typeof window !== 'undefined') window.addEventListener('resize', onResize, { once: true });

    if (signal?.aborted) {
      finish('aborted');
    } else if (isDocumentHidden()) {
      finish('hidden');
    } else if (typeof requestAnimationFrame === 'function') {
      frameId = requestAnimationFrame(() => finish('frame'));
    } else {
      fallbackTimer = setTimeout(() => finish('frame'), 0);
    }
  });
}

function animationNameOf(animation: Animation): string | undefined {
  return (animation as CssAnimationLike).animationName;
}

function hasNamedCssAnimation(element: Element, expectedName: string): boolean {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return false;
  try {
    const style = window.getComputedStyle(element);
    const names = style.animationName.split(',').map(name => name.trim());
    if (!names.includes(expectedName)) return false;

    // A zero-duration animation (including the reduced-motion CSS override) has
    // no visual phase to wait for. Most callers also short-circuit via matchMedia.
    const durations = style.animationDuration.split(',').map(value => value.trim());
    const index = names.indexOf(expectedName);
    const duration = durations[index % durations.length] ?? '0s';
    const amount = Number.parseFloat(duration);
    return Number.isFinite(amount) && amount > 0;
  } catch {
    return false;
  }
}

function watchdogFor(animations: readonly Animation[]): number {
  const remaining = animations.map(animation => {
    try {
      const timing = animation.effect?.getComputedTiming();
      const endTime = Number(timing?.endTime);
      const currentTime = Number(animation.currentTime ?? 0);
      const rate = Math.abs(animation.playbackRate);
      if (!Number.isFinite(endTime) || !Number.isFinite(currentTime) || !Number.isFinite(rate) || rate === 0) return 0;
      return Math.max(0, (endTime - currentTime) / rate);
    } catch {
      return 0;
    }
  });
  const desired = Math.max(...remaining, 0) + WATCHDOG_GRACE_MS;
  return Math.min(MAX_WATCHDOG_MS, Math.max(MIN_WATCHDOG_MS, Math.ceil(desired)));
}

function cancelAnimations(animations: readonly Animation[]) {
  for (const animation of animations) {
    const playState: string = animation.playState;
    if (playState !== 'running' && playState !== 'pending') continue;
    try {
      animation.cancel();
    } catch {
      // A detached/finished animation can throw in older browser engines.
    }
  }
}

function waitForCompletion(
  completion: Promise<void>,
  animations: readonly Animation[],
  options: AnimationWaitOptions,
  cleanupCompletion: () => void = () => undefined,
): Promise<AnimationWaitResult> {
  return new Promise(resolve => {
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (watchdog !== null) clearTimeout(watchdog);
      options.signal?.removeEventListener('abort', onAbort);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
      if (options.watchResize !== false && typeof window !== 'undefined') window.removeEventListener('resize', onResize);
      cleanupCompletion();
    };
    const finish = (result: AnimationWaitResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (result === 'aborted' || result === 'hidden' || result === 'resized' || result === 'timeout') {
        cancelAnimations(animations);
      }
      resolve(result);
    };
    const onAbort = () => finish('aborted');
    const onVisibilityChange = () => {
      if (isDocumentHidden()) finish('hidden');
    };
    const onResize = () => finish('resized');

    if (options.signal?.aborted) {
      finish('aborted');
      return;
    }
    if (isDocumentHidden()) {
      finish('hidden');
      return;
    }

    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
    if (options.watchResize !== false && typeof window !== 'undefined') window.addEventListener('resize', onResize, { once: true });

    const watchdogMs = options.watchdogMs ?? watchdogFor(animations);
    watchdog = setTimeout(() => finish('timeout'), Math.max(0, watchdogMs));
    completion.then(() => finish('finished'), () => finish('finished'));

    // Close the small race between the initial checks and listener registration.
    if (options.signal?.aborted) finish('aborted');
    else if (isDocumentHidden()) finish('hidden');
  });
}

function waitForAnimationEvents(elements: readonly Element[], animationName: string, options: AnimationWaitOptions): Promise<AnimationWaitResult> {
  const animations = new Set(elements.filter(element => element.isConnected && hasNamedCssAnimation(element, animationName)));
  if (!animations.size) return Promise.resolve('no-animation');

  let cleanup: () => void = () => undefined;
  const completion = new Promise<void>(resolve => {
    const pending = new Set(animations);
    const onAnimationDone = (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (animationEvent.animationName !== animationName) return;
      pending.delete(event.currentTarget as Element);
      if (!pending.size) resolve();
    };
    for (const element of pending) {
      element.addEventListener('animationend', onAnimationDone);
      element.addEventListener('animationcancel', onAnimationDone);
    }
    cleanup = () => {
      for (const element of animations) {
        element.removeEventListener('animationend', onAnimationDone);
        element.removeEventListener('animationcancel', onAnimationDone);
      }
    };
  });

  return waitForCompletion(completion, [], { ...options, watchdogMs: options.watchdogMs ?? MAX_WATCHDOG_MS }, cleanup);
}

/**
 * Wait for every active CSS animation with the requested name on the supplied
 * elements. Call after the state change that applies the animation class. It
 * checks after a rendered frame, so React's class update is visible first.
 */
export async function waitForAnimationPhase(
  getElements: () => Iterable<Element>,
  animationName: string,
  options: AnimationWaitOptions = {},
): Promise<AnimationWaitResult> {
  if (options.reducedMotion) return 'reduced-motion';
  if (options.signal?.aborted) return 'aborted';

  const frameResult = await waitForNextFrame(options);
  if (frameResult !== 'frame') return frameResult;
  if (options.signal?.aborted) return 'aborted';

  let elements: Element[];
  try {
    elements = Array.from(getElements()).filter(element => element.isConnected);
  } catch {
    return 'no-animation';
  }
  if (!elements.length) return 'no-animation';

  const activeAnimations: Animation[] = [];
  let sawNamedAnimation = false;
  for (const element of elements) {
    if (typeof element.getAnimations !== 'function') continue;
    let elementAnimations: Animation[];
    try {
      elementAnimations = element.getAnimations();
    } catch {
      continue;
    }
    for (const animation of elementAnimations) {
      const name = animationNameOf(animation);
      if (name !== animationName) continue;
      sawNamedAnimation = true;
      const playState: string = animation.playState;
      if (playState === 'running' || playState === 'pending') activeAnimations.push(animation);
    }
  }

  if (activeAnimations.length) {
    const completion = Promise.all(activeAnimations.map(animation =>
      animation.finished.then(() => undefined, () => undefined),
    )).then(() => undefined);
    return waitForCompletion(completion, activeAnimations, options);
  }

  if (sawNamedAnimation) return 'no-animation';
  return waitForAnimationEvents(elements, animationName, options);
}
