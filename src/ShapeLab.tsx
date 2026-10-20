import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Download, RotateCcw, Save, X } from 'lucide-react';
import CandyArt from './components/CandyArt';
import JuiceBurstLayer, { type JuiceBurst } from './components/JuiceBurstLayer';
import {
  applySpecialSwap,
  buildSwapSpecial,
  COLORS,
  clone,
  createLevelBoard,
  evaluateSwap,
  keyOf,
  objectiveProgressPercent,
  objectivesComplete,
  nextPlayableCell,
  posOf,
  type Candy,
  type Pos,
} from './game/engine';
import { waitForAnimationPhase } from './game/animation';
import { calculateFallOffsets, translationBetween, type CellPoint, type MotionOffset } from './game/board-geometry';
import { buildResolutionPlan, type ResolutionPlan } from './game/resolution';
import { createSeededRandom } from './game/performance';
import { boardImpactClass, fallAnimationDuration, GAME_MOTION, prefersReducedMotion } from './game/motion';
import { BOARD_SHAPE_PROTOTYPES, getBoardShapePrototype } from './game/shape-prototypes';
import './shape-lab.css';

type RoundStatus = 'playing' | 'won' | 'out';
type TestOutcome = 'goal-reached' | 'out-of-moves' | 'stopped-early';
type SwapMotion = MotionOffset & { rejected?: boolean };
type FallMotion = MotionOffset & { distance: number };
type ShapeFeedbackEntry = {
  prototypeId: number;
  prototypeName: string;
  outcome: TestOutcome;
  funRating: number;
  challengeRating: number;
  note: string;
  createdAt: string;
};

const FEEDBACK_SESSION_KEY = 'jam-shift.shape-lab.feedback.v1';

function readSessionFeedback(): ShapeFeedbackEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(FEEDBACK_SESSION_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is ShapeFeedbackEntry =>
      Boolean(entry) && typeof entry === 'object' &&
      Number.isInteger((entry as ShapeFeedbackEntry).prototypeId) &&
      typeof (entry as ShapeFeedbackEntry).prototypeName === 'string' &&
      ['goal-reached', 'out-of-moves', 'stopped-early'].includes((entry as ShapeFeedbackEntry).outcome) &&
      Number.isInteger((entry as ShapeFeedbackEntry).funRating) &&
      (entry as ShapeFeedbackEntry).funRating >= 1 && (entry as ShapeFeedbackEntry).funRating <= 5 &&
      Number.isInteger((entry as ShapeFeedbackEntry).challengeRating) &&
      (entry as ShapeFeedbackEntry).challengeRating >= 1 && (entry as ShapeFeedbackEntry).challengeRating <= 5 &&
      typeof (entry as ShapeFeedbackEntry).note === 'string' &&
      typeof (entry as ShapeFeedbackEntry).createdAt === 'string',
    ).slice(-100);
  } catch {
    return [];
  }
}
type ShapeRound = {
  board: Candy[][];
  moves: number;
  score: number;
  bestCascade: number;
  status: RoundStatus;
  message: string;
  random: () => number;
};

const TEST_SEED = 20261020;

function makeRound(prototypeId: number): ShapeRound {
  const prototype = getBoardShapePrototype(prototypeId);
  const random = createSeededRandom(TEST_SEED);
  const start = createLevelBoard(prototype.level, random);
  return {
    board: start.board,
    moves: prototype.level.moves,
    score: 0,
    bestCascade: 0,
    status: 'playing',
    message: 'Select a candy, then a neighboring candy that makes a match.',
    random,
  };
}

function isNeighbor(a: Pos, b: Pos) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function firstPlayableCell(board: Candy[][]): Pos {
  for (let row = 0; row < board.length; row++) {
    const column = board[row].findIndex(candy => candy.kind !== 'void');
    if (column >= 0) return [row, column];
  }
  return [0, 0];
}

function cellLabel(candy: Candy) {
  const colorName = COLORS[candy.color] ?? 'candy';
  return `${colorName}${candy.special ? ` ${candy.special.replace('-', ' ')}` : ''}`;
}

export default function ShapeLab({ initialPrototypeId }: { initialPrototypeId: number }) {
  const [prototypeId, setPrototypeId] = useState(initialPrototypeId);
  const [round, setRound] = useState(() => makeRound(initialPrototypeId));
  const [selected, setSelected] = useState<Pos | null>(null);
  const [focusedCell, setFocusedCell] = useState<Pos>(() => firstPlayableCell(round.board));
  const [busy, setBusy] = useState(false);
  const [swapMotion, setSwapMotion] = useState<Record<number, SwapMotion>>({});
  const [clearing, setClearing] = useState<string[]>([]);
  const [fallMotion, setFallMotion] = useState<Record<number, FallMotion>>({});
  const [juiceBursts, setJuiceBursts] = useState<JuiceBurst[]>([]);
  const [impactPulse, setImpactPulse] = useState(0);
  const inputLocked = useRef(false);
  const motionRun = useRef(0);
  const motionController = useRef<AbortController | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const candyRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const burstSequence = useRef(0);
  const burstTimeouts = useRef(new Set<number>());
  const [feedbackEntries, setFeedbackEntries] = useState(readSessionFeedback);
  const [feedbackOutcome, setFeedbackOutcome] = useState<TestOutcome | ''>('');
  const [funRating, setFunRating] = useState<number | ''>('');
  const [challengeRating, setChallengeRating] = useState<number | ''>('');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const prototype = getBoardShapePrototype(prototypeId);
  const progress = objectiveProgressPercent(
    prototype.level,
    round.score,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    round.bestCascade,
  );

  const cellPointFor = (row: number, column: number): CellPoint | null => {
    const candy = candyRefs.current[keyOf(row, column)];
    const boardElement = boardRef.current;
    if (!candy || !boardElement) return null;
    let left = 0;
    let top = 0;
    let current: HTMLElement | null = candy;
    while (current && current !== boardElement) {
      left += current.offsetLeft;
      top += current.offsetTop;
      current = current.offsetParent as HTMLElement | null;
    }
    if (current === boardElement) return { left, top };
    const candyRect = candy.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();
    return { left: candyRect.left - boardRect.left, top: candyRect.top - boardRect.top };
  };

  const measureBoardPoints = (rows: number, columns: number) => {
    const points = new Map<string, CellPoint>();
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const point = cellPointFor(row, column);
      if (point) points.set(keyOf(row, column), point);
    }
    return (row: number, column: number) => points.get(keyOf(row, column)) ?? null;
  };

  const waitForBoardAnimation = (selector: string, animationName: string, controller: AbortController) =>
    waitForAnimationPhase(
      () => boardRef.current?.querySelectorAll(selector) ?? [],
      animationName,
      { signal: controller.signal, reducedMotion: prefersReducedMotion() },
    );

  const clearBurstTimers = (clearVisuals = true) => {
    if (typeof window !== 'undefined') {
      for (const timeout of burstTimeouts.current) window.clearTimeout(timeout);
    }
    burstTimeouts.current.clear();
    if (clearVisuals) setJuiceBursts([]);
  };

  const triggerBurst = (keys: string[], kind: JuiceBurst['kind'], points = 0) => {
    if (!keys.length || typeof window === 'undefined') return;
    const cells = keys.map(key => posOf(key));
    const avgRow = cells.reduce((sum, cell) => sum + cell[0], 0) / cells.length;
    const avgColumn = cells.reduce((sum, cell) => sum + cell[1], 0) / cells.length;
    const maxOrigins = kind === 'match' ? 5 : kind === 'special' ? 11 : 8;
    const stride = Math.max(1, Math.ceil(cells.length / maxOrigins));
    const sampledCells = cells.filter((_, index) => index % stride === 0).slice(0, maxOrigins);
    const bursts: JuiceBurst[] = sampledCells.map(([row, column]) => ({
      id: ++burstSequence.current,
      x: ((column + 0.5) / 8) * 100,
      y: ((row + 0.5) / 8) * 100,
      kind,
      strength: Math.min(1.35, 0.72 + keys.length / 36),
    }));
    bursts.push({
      id: ++burstSequence.current,
      x: ((avgColumn + 0.5) / 8) * 100,
      y: ((avgRow + 0.5) / 8) * 100,
      kind,
      strength: Math.min(1.8, 1.02 + keys.length / 22),
      points,
    });
    const ids = new Set(bursts.map(burst => burst.id));
    setJuiceBursts(old => [...old, ...bursts].slice(-48));
    const timeout = window.setTimeout(() => {
      burstTimeouts.current.delete(timeout);
      setJuiceBursts(old => old.filter(burst => !ids.has(burst.id)));
    }, kind === 'special' ? 720 : kind === 'cascade' ? 650 : 540);
    burstTimeouts.current.add(timeout);
  };

  const isCurrentMotion = (runToken: number, controller: AbortController) =>
    motionRun.current === runToken && motionController.current === controller && !controller.signal.aborted;

  const cancelMotionRun = () => {
    motionRun.current += 1;
    motionController.current?.abort();
    motionController.current = null;
    inputLocked.current = false;
    setBusy(false);
    setSwapMotion({});
    setClearing([]);
    setFallMotion({});
  };

  useEffect(() => () => {
    motionRun.current += 1;
    motionController.current?.abort();
    motionController.current = null;
    inputLocked.current = false;
    if (typeof window !== 'undefined') {
      for (const timeout of burstTimeouts.current) window.clearTimeout(timeout);
    }
    burstTimeouts.current.clear();
  }, []);

  const reset = (id = prototypeId) => {
    cancelMotionRun();
    clearBurstTimers();
    setImpactPulse(0);
    const nextRound = makeRound(id);
    setRound(nextRound);
    setFocusedCell(firstPlayableCell(nextRound.board));
    setSelected(null);
  };

  const choosePrototype = (id: number) => {
    const boundedId = Math.max(1, Math.min(BOARD_SHAPE_PROTOTYPES.length, id));
    setPrototypeId(boundedId);
    reset(boundedId);
  };

  const resolveSwap = async (first: Pos, second: Pos) => {
    if (inputLocked.current || round.status !== 'playing') return;
    const startingRound = round;
    const originalBoard = clone(startingRound.board);
    const runToken = ++motionRun.current;
    const controller = new AbortController();
    motionController.current?.abort();
    motionController.current = controller;
    inputLocked.current = true;
    setBusy(true);
    setSelected(null);
    let plan: ResolutionPlan | null = null;

    try {
      const evaluation = evaluateSwap(originalBoard, first, second);
      const candyAtFirst = originalBoard[first[0]][first[1]];
      const candyAtSecond = originalBoard[second[0]][second[1]];
      const pointFirst = cellPointFor(first[0], first[1]);
      const pointSecond = cellPointFor(second[0], second[1]);
      const firstToOrigin = pointFirst && pointSecond ? translationBetween(pointSecond, pointFirst) : { x: 0, y: 0 };
      const secondToOrigin = pointFirst && pointSecond ? translationBetween(pointFirst, pointSecond) : { x: 0, y: 0 };
      const swapOffsets: Record<number, SwapMotion> = {
        [candyAtFirst.id]: firstToOrigin,
        [candyAtSecond.id]: secondToOrigin,
      };

      if (!evaluation.valid) {
        const attemptedBoard = clone(originalBoard);
        [attemptedBoard[first[0]][first[1]], attemptedBoard[second[0]][second[1]]] =
          [attemptedBoard[second[0]][second[1]], attemptedBoard[first[0]][first[1]]];
        setSwapMotion({
          [candyAtFirst.id]: { ...firstToOrigin, rejected: true },
          [candyAtSecond.id]: { ...secondToOrigin, rejected: true },
        });
        setRound({ ...startingRound, board: attemptedBoard, message: 'No match — try another swap.' });
        await waitForBoardAnimation('.candy.swap-rejected', 'candy-reject', controller);
        if (!isCurrentMotion(runToken, controller)) return;
        setRound({ ...startingRound, message: 'That swap does not make a match. Try another pair.' });
        setSwapMotion({});
        return;
      }

      setSwapMotion(swapOffsets);
      setRound({ ...startingRound, board: evaluation.board, message: 'Swapping candies…' });
      await waitForBoardAnimation('.candy.swap-motion', 'candy-swap', controller);
      if (!isCurrentMotion(runToken, controller)) return;
      setSwapMotion({});

      const workingBoard = clone(evaluation.board);
      const matches = new Set(evaluation.matches);
      let activationMessage = '';
      if (evaluation.activatesSpecial) {
        activationMessage = applySpecialSwap(workingBoard, first, second, matches).message;
      } else {
        buildSwapSpecial(workingBoard, matches, first, second);
      }
      setRound({ ...startingRound, board: workingBoard, message: activationMessage || 'Resolving match…' });
      plan = buildResolutionPlan({
        level: prototype.level,
        board: workingBoard,
        matches,
        score: startingRound.score,
        goalProgress: 0,
        jelly: new Set(),
        bossHealth: 0,
        sugarShells: new Map(),
        shellsCleared: 0,
      }, startingRound.random);

      for (const step of plan.steps) {
        if (!isCurrentMotion(runToken, controller)) return;
        const burstKind: JuiceBurst['kind'] = step.cascade > 1
          ? 'cascade'
          : step.clearCells.length >= 5 ? 'special' : 'match';
        setClearing(step.clearCells);
        setFallMotion({});
        setImpactPulse(value => value + 1);
        setRound(current => ({
          ...current,
          score: step.score,
          bestCascade: Math.max(current.bestCascade, step.cascade),
          message: step.cascade > 1 ? `Cascade ×${step.cascade} · ${step.clearCells.length} cells clearing.` : 'Match clearing…',
        }));
        triggerBurst(step.clearCells, burstKind, step.points);
        await waitForBoardAnimation('.candy.clearing', 'candy-pop', controller);
        if (!isCurrentMotion(runToken, controller)) return;

        const getCellPoint = measureBoardPoints(step.boardForFallAnimation.length, step.boardForFallAnimation[0]?.length ?? 0);
        const offsets = calculateFallOffsets(step.boardForFallAnimation, step.fallDistances, getCellPoint);
        const nextFallMotion = Object.fromEntries(Object.entries(offsets).map(([id, offset]) => [
          id,
          { ...offset, distance: step.fallDistances[Number(id)] ?? 0 },
        ]));
        setRound(current => ({ ...current, board: step.boardForFallAnimation }));
        setClearing([]);
        setFallMotion(nextFallMotion);
        if (Object.keys(nextFallMotion).length) {
          await waitForBoardAnimation('.candy.falling', 'candy-fall', controller);
          if (!isCurrentMotion(runToken, controller)) return;
        }
        setFallMotion({});
        if (step.ingredientsDeliveredThisWave > 0) {
          setRound(current => ({ ...current, board: step.boardAfterDrop }));
        }
      }

      if (!isCurrentMotion(runToken, controller)) return;
      const moves = Math.max(0, startingRound.moves - 1);
      const bestCascade = Math.max(startingRound.bestCascade, plan.maxCascade);
      const won = objectivesComplete(
        prototype.level,
        plan.score,
        0,
        plan.jelly.size,
        plan.bossHealth,
        plan.shellsCleared,
        plan.specialsActivated,
        plan.ingredientsDelivered,
        bestCascade,
      );
      const status: RoundStatus = won ? 'won' : moves <= 0 ? 'out' : 'playing';
      const message = won
        ? 'Score goal reached. Try another shape or replay this board.'
        : status === 'out'
          ? 'Move budget used. Replay this shape or compare another layout.'
          : plan.reshuffleReason
            ? 'Board reshuffled for a fresh move.'
            : activationMessage || `${plan.maxCascade > 1 ? `${plan.maxCascade}-wave cascade` : 'Nice match'} · ${plan.totalCleared} cells cleared.`;
      setRound({
        ...startingRound,
        board: plan.board,
        moves,
        score: plan.score,
        bestCascade,
        status,
        message,
      });
      setSelected(null);
      setSwapMotion({});
      setClearing([]);
      setFallMotion({});
    } catch {
      if (isCurrentMotion(runToken, controller)) {
        setSwapMotion({});
        setClearing([]);
        setFallMotion({});
        if (plan) {
          const moves = Math.max(0, startingRound.moves - 1);
          const bestCascade = Math.max(startingRound.bestCascade, plan.maxCascade);
          const won = objectivesComplete(
            prototype.level,
            plan.score,
            0,
            plan.jelly.size,
            plan.bossHealth,
            plan.shellsCleared,
            plan.specialsActivated,
            plan.ingredientsDelivered,
            bestCascade,
          );
          setRound({
            ...startingRound,
            board: plan.board,
            moves,
            score: plan.score,
            bestCascade,
            status: won ? 'won' : moves <= 0 ? 'out' : 'playing',
            message: 'Move completed after a visual hiccup.',
          });
        } else {
          setRound({ ...startingRound, board: originalBoard, message: 'Recovered from a puzzle hiccup. Try that move again.' });
        }
      }
    } finally {
      if (isCurrentMotion(runToken, controller)) {
        motionController.current = null;
        inputLocked.current = false;
        setBusy(false);
        setSwapMotion({});
        setClearing([]);
        setFallMotion({});
      }
    }
  };

  const handleCellKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, row: number, column: number) => {
    const directions: Record<string, Pos> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    if (busy) return;
    const next = nextPlayableCell(round.board, [row, column], delta);
    if (!next) return;
    setFocusedCell(next);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => document.getElementById(`shape-cell-${next[0]}-${next[1]}`)?.focus());
    }
  };

  const chooseCell = (row: number, column: number) => {
    if (busy || inputLocked.current || round.status !== 'playing') return;
    const candy = round.board[row][column];
    if (candy.kind === 'void') return;
    const next: Pos = [row, column];
    if (!selected) {
      setSelected(next);
      return;
    }
    if (selected[0] === row && selected[1] === column) {
      setSelected(null);
      return;
    }
    if (isNeighbor(selected, next)) {
      resolveSwap(selected, next);
      return;
    }
    setSelected(next);
  };

  const recordFeedback = () => {
    if (!feedbackOutcome || typeof funRating !== 'number' || typeof challengeRating !== 'number') {
      setFeedbackNotice('Choose the real outcome and both ratings before recording this attempt.');
      return;
    }
    const entry: ShapeFeedbackEntry = {
      prototypeId,
      prototypeName: prototype.name,
      outcome: feedbackOutcome,
      funRating,
      challengeRating,
      note: feedbackNote.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextEntries = [...feedbackEntries, entry].slice(-100);
    setFeedbackEntries(nextEntries);
    try {
      if (typeof window !== 'undefined') window.sessionStorage.setItem(FEEDBACK_SESSION_KEY, JSON.stringify(nextEntries));
      setFeedbackNotice('Saved in this browser session only. Export the notes before closing if you want to share them.');
    } catch {
      setFeedbackNotice('Session storage is unavailable. You can still download the notes from this page.');
    }
  };

  const downloadFeedback = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), feedback: feedbackEntries }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'jam-shift-shape-lab-feedback.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exitLab = () => {
    cancelMotionRun();
    clearBurstTimers();
    if (typeof window !== 'undefined') window.location.replace(window.location.pathname);
  };

  const boardImpact = boardImpactClass(impactPulse);
  const boardStyle = {
    '--board-rows': round.board.length,
    '--board-columns': round.board[0]?.length ?? 8,
    '--swap-duration': `${GAME_MOTION.swapAnimationMs}ms`,
    '--reject-duration': `${GAME_MOTION.rejectAnimationMs}ms`,
    '--clear-duration': `${GAME_MOTION.clearAnimationMs}ms`,
    '--impact-duration': `${GAME_MOTION.clearAnimationMs}ms`,
  } as CSSProperties;

  return (
    <main className="app-shell shape-lab-app">
      <header className="shape-lab-header">
        <a className="shape-lab-brand" href="/" aria-label="Jam Shift home">Jam Shift</a>
        <span className="shape-lab-dev-label">DEVELOPMENT ONLY</span>
        <button className="shape-lab-exit" type="button" onClick={exitLab}>
          <X size={16} /> Exit lab
        </button>
      </header>

      <section className="shape-lab-intro" aria-labelledby="shape-lab-title">
        <p className="shape-lab-eyebrow">EXPERIMENTAL BOARD STUDY · CAMPAIGN DATA UNCHANGED</p>
        <h1 id="shape-lab-title">Board Shape Lab</h1>
        <p className="shape-lab-description">
          Six original silhouettes, one shared 8 × 8 frame and the same seeded opening on every shared cell.
          All use the level-one score goal, four-color spawn mix and move budget; no progress is saved. Swaps,
          clears, cascades and gravity now use the campaign's motion timing and respect reduced-motion settings.
        </p>
      </section>

      <section className="shape-lab-workbench" aria-label={`${prototype.name} prototype`}>
        <div className="shape-lab-side-panel">
          <div className="shape-lab-prototype-picker">
            <button
              className="shape-lab-nav-button"
              type="button"
              onClick={() => choosePrototype(prototypeId - 1)}
              disabled={prototypeId === 1}
              aria-label="Previous board shape"
            >
              <ArrowLeft size={17} />
            </button>
            <label className="shape-lab-select-wrap">
              <span>Prototype {String(prototypeId).padStart(2, '0')} / {BOARD_SHAPE_PROTOTYPES.length}</span>
              <select
                value={prototypeId}
                onChange={event => choosePrototype(Number(event.target.value))}
                aria-label="Choose board shape prototype"
              >
                {BOARD_SHAPE_PROTOTYPES.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </label>
            <button
              className="shape-lab-nav-button"
              type="button"
              onClick={() => choosePrototype(prototypeId + 1)}
              disabled={prototypeId === BOARD_SHAPE_PROTOTYPES.length}
              aria-label="Next board shape"
            >
              <ArrowRight size={17} />
            </button>
          </div>

          <div className="shape-lab-prototype-copy">
            <h2>{prototype.name}</h2>
            <p>{prototype.description}</p>
            <span className="shape-lab-cell-count">{prototype.playableCellCount} playable cells · 64-cell frame</span>
          </div>

          <div className="shape-lab-goal-card">
            <div className="shape-lab-stat"><span>Score goal</span><strong>{prototype.level.target.toLocaleString()}</strong></div>
            <div className="shape-lab-stat"><span>Moves</span><strong>{round.moves}<small> / {prototype.level.moves}</small></strong></div>
            <div className="shape-lab-progress" role="progressbar" aria-label="Score goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="shape-lab-stat shape-lab-score"><span>Score</span><strong>{round.score.toLocaleString()}</strong></div>
          </div>

          <p className={`shape-lab-status shape-lab-status-${round.status}`} aria-live="polite">{round.message}</p>
          <section className="shape-lab-feedback" aria-labelledby="shape-feedback-title">
            <h3 id="shape-feedback-title">Quick playtest note</h3>
            <p>Record your real outcome and impression. Notes stay in this browser session; nothing is uploaded.</p>
            <label>Outcome
              <select value={feedbackOutcome} onChange={event => setFeedbackOutcome(event.target.value as TestOutcome | '')}>
                <option value="" disabled>Choose the actual result</option>
                <option value="goal-reached">Reached the score goal</option>
                <option value="out-of-moves">Ran out of moves</option>
                <option value="stopped-early">Stopped before finishing</option>
              </select>
            </label>
            <div className="shape-lab-rating-row">
              <label>Fun · 1 low, 5 high
                <select aria-label="Fun rating, from 1 low to 5 high" value={funRating} onChange={event => setFunRating(event.target.value ? Number(event.target.value) : '')}>
                  <option value="" disabled>Choose</option>
                  {[1, 2, 3, 4, 5].map(rating => <option key={rating} value={rating}>{rating}</option>)}
                </select>
              </label>
              <label>Challenge · 1 easy, 5 hard
                <select aria-label="Challenge rating, from 1 easy to 5 hard" value={challengeRating} onChange={event => setChallengeRating(event.target.value ? Number(event.target.value) : '')}>
                  <option value="" disabled>Choose</option>
                  {[1, 2, 3, 4, 5].map(rating => <option key={rating} value={rating}>{rating}</option>)}
                </select>
              </label>
            </div>
            <label>What stood out?
              <textarea value={feedbackNote} maxLength={500} rows={3} onChange={event => setFeedbackNote(event.target.value)} placeholder="Shape readability, satisfying matches, awkward gaps…" />
            </label>
            <button className="shape-lab-save-feedback" type="button" onClick={recordFeedback} disabled={!feedbackOutcome || typeof funRating !== 'number' || typeof challengeRating !== 'number'}><Save size={15} /> Record attempt</button>
            <div className="shape-lab-feedback-export">
              <span>{feedbackEntries.length} local {feedbackEntries.length === 1 ? 'note' : 'notes'}</span>
              <button type="button" onClick={downloadFeedback} disabled={!feedbackEntries.length}><Download size={14} /> Download JSON</button>
            </div>
            <p className="shape-lab-feedback-notice" aria-live="polite">{feedbackNotice}</p>
          </section>
          <button className="shape-lab-reset" type="button" onClick={() => reset()}>
            <RotateCcw size={16} /> Replay this shape
          </button>
          <p className="shape-lab-test-note">The campaign, chapters, Moon Mix, boosters and saved progress are not changed by this playtest.</p>
        </div>

        <div className="shape-lab-board-column">
          <div className="shape-lab-board-caption"><span>SHARED BOARD FRAME</span><span>8 × 8</span></div>
          <div className="game-board-wrap shape-lab-board-wrap">
            <div
              ref={boardRef}
              className={`candy-board shape-lab-board${busy ? ' resolving' : ''}${boardImpact ? ` ${boardImpact}` : ''}`}
              style={boardStyle}
              role="grid"
              aria-label={`${prototype.name} match-three board`}
              aria-busy={busy}
            >
              <JuiceBurstLayer effects={juiceBursts} />
              {round.board.map((boardRow, row) => (
                <div className="candy-row" key={`row-${row}`} role="row">
                  {boardRow.map((candy, column) => {
                    if (candy.kind === 'void') {
                      return <span className="shape-lab-void" key={candy.id} aria-hidden="true" />;
                    }
                    const cellKey = keyOf(row, column);
                    const isSelected = selected?.[0] === row && selected?.[1] === column;
                    const fallMove = fallMotion[candy.id];
                    const className = [
                      'candy',
                      COLORS[candy.color] ?? '',
                      candy.special ?? '',
                      swapMotion[candy.id]?.rejected ? 'swap-rejected' : swapMotion[candy.id] ? 'swap-motion' : '',
                      isSelected ? 'chosen' : '',
                      clearing.includes(cellKey) ? 'clearing' : '',
                      fallMove?.distance ? 'falling' : '',
                    ].filter(Boolean).join(' ');
                    const candyStyle = {
                      '--idle-delay': `${-((row * 5 + column * 7) % 17) * 0.19}s`,
                      ...(swapMotion[candy.id] ? {
                        '--swap-x': `${swapMotion[candy.id].x}px`,
                        '--swap-y': `${swapMotion[candy.id].y}px`,
                      } : {}),
                      ...(fallMove ? {
                        '--fall-x': `${fallMove.x}px`,
                        '--fall-y': `${fallMove.y}px`,
                        '--fall-duration': `${fallAnimationDuration(fallMove.distance)}ms`,
                      } : {}),
                    } as CSSProperties;
                    return (
                      <button
                        ref={element => {
                          if (element) candyRefs.current[cellKey] = element;
                          else delete candyRefs.current[cellKey];
                        }}
                        className={className}
                        type="button"
                        key={candy.id}
                        id={`shape-cell-${row}-${column}`}
                        style={candyStyle}
                        onClick={() => chooseCell(row, column)}
                        onFocus={() => setFocusedCell([row, column])}
                        onKeyDown={event => handleCellKeyDown(event, row, column)}
                        tabIndex={focusedCell[0] === row && focusedCell[1] === column ? 0 : -1}
                        disabled={round.status !== 'playing'}
                        aria-label={`Row ${row + 1}, column ${column + 1}: ${cellLabel(candy)}`}
                        aria-pressed={isSelected}
                        role="gridcell"
                      >
                        <CandyArt color={candy.color} special={candy.special} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="shape-lab-board-hint">Tap two neighboring candies to swap · voids are empty space, not blockers.</p>
        </div>
      </section>
    </main>
  );
}
