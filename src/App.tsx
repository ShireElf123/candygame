import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  Lightbulb,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import CandyArt from './components/CandyArt';
import CharacterArt from './components/CharacterArt';
import JuiceBurstLayer, { type JuiceBurst } from './components/JuiceBurstLayer';
import WorldScene from './components/WorldScene';
import {
  applySpecialSwap,
  buildSwapSpecial,
  clone,
  COLORS,
  createJelly,
  createLevelBoard,
  createSugarShells,
  findBestMove,
  findMatches,
  freshBoard,
  GLYPHS,
  goalsForLevel,
  hasGoal,
  objectiveProgressPercent,
  objectivesComplete,
  keyOf,
  LEVEL_COUNT,
  LEVELS,
  posOf,
  SIZE,
  sleep,
  type Booster,
  type Candy,
  type GoalType,
  type Pos,
  type Screen,
} from './game/engine';
import { buildResolutionPlan } from './game/resolution';
import { starsForCampaign, starsForScore } from './game/progress';
import { readSave, writeSave } from './game/save';

const HINT_IDLE_DELAY_MS = 6500;
const SWAP_SETTLE_MS = 128;
const REJECT_SETTLE_MS = 160;
const CLEAR_SETTLE_MS = 160;
const FALL_DURATION_MAX_MS = 340;
const fallAnimationDuration = (distance: number) => Math.min(FALL_DURATION_MAX_MS, 145 + distance * 25);

const BOOSTERS: { id: Booster; icon: string; label: string; shortName: string; description: string }[] = [
  { id: 'hammer', icon: '🔨', label: 'Sugar hammer', shortName: 'Hammer', description: 'Clear one candy' },
  { id: 'line', icon: '💥', label: 'Row blast', shortName: 'Row blast', description: 'Clear an entire row' },
  { id: 'rainbow', icon: '🌈', label: 'Color pop', shortName: 'Color pop', description: 'Clear one color' },
];

const CHARACTER_PALETTES = [
  { color: '#a866d5', accent: '#603489' },
  { color: '#f4d158', accent: '#b47c26' },
  { color: '#ef639a', accent: '#982c60' },
  { color: '#72d17e', accent: '#33864f' },
  { color: '#64b9e9', accent: '#315ca3' },
  { color: '#f3914e', accent: '#ac4939' },
];

const HELP_STEPS = [
  { title: 'Swap neighbours.', detail: 'Tap one candy, then an adjacent candy — or swipe to move it. Use the arrow keys to explore the board.' },
  { title: 'Match three or more.', detail: 'Four in a row makes a stripe; five makes a color candy. T and L shapes can make a wrapped candy.' },
  { title: 'Play every objective.', detail: 'Score points, collect the target color, clear jelly, crack sugar shells, or outmatch a chapter boss. Some later puzzles pair two goals, so finish both before moves run out.' },
  { title: 'Save a power-up for the right moment.', detail: 'Choose a power-up, then tap a candy. Each use costs one move and one charge.' },
];

function goalDescription(levelNumber: number) {
  const config = LEVELS[levelNumber - 1];
  return goalsForLevel(config).map(goalType => {
    if (goalType === 'score') return `${config.target.toLocaleString()} points`;
    if (goalType === 'collect') return `Collect ${config.goalCount} ${COLORS[config.goalColor]} candies`;
    if (goalType === 'jelly') return `Clear ${createJelly(levelNumber).size} jelly tiles`;
    if (goalType === 'shell') return `Crack ${config.shellCount ?? 0} sugar shells`;
    return `Defeat ${config.boss?.name ?? 'the chapter boss'}`;
  }).join(' + ');
}

function goalGlyph(goalType: GoalType, levelNumber: number) {
  const config = LEVELS[levelNumber - 1];
  if (goalType === 'jelly') return '▧';
  if (goalType === 'collect') return GLYPHS[config.goalColor];
  if (goalType === 'shell') return '✧';
  return '✦';
}

function goalHeadline(goalType: GoalType, levelNumber: number, score: number, collected: number, jellyLeft: number, bossHealthLeft = 0, shellsCleared = 0) {
  const config = LEVELS[levelNumber - 1];
  if (goalType === 'score') return score >= config.target ? 'Score target reached' : `Reach ${config.target.toLocaleString()} points`;
  if (goalType === 'collect') {
    return collected >= config.goalCount
      ? `All ${config.goalCount} ${COLORS[config.goalColor]} candies collected`
      : `Collect ${config.goalCount - collected} ${COLORS[config.goalColor]} candies`;
  }
  if (goalType === 'jelly') return jellyLeft === 0 ? 'All jelly cleared' : `Clear ${jellyLeft} jelly tiles`;
  if (goalType === 'shell') {
    const left = Math.max(0, (config.shellCount ?? 0) - shellsCleared);
    return left === 0 ? 'All sugar shells cracked' : `Crack ${left} sugar shells`;
  }
  const boss = config.boss;
  return bossHealthLeft <= 0 ? `${boss?.name ?? 'The boss'} defeated!` : `Outmatch ${boss?.name ?? 'the boss'}`;
}

function goalCounter(goalType: GoalType, levelNumber: number, score: number, collected: number, jellyLeft: number, bossHealthLeft = 0, shellsCleared = 0) {
  const config = LEVELS[levelNumber - 1];
  if (goalType === 'score') return `${Math.min(score, config.target).toLocaleString()} / ${config.target.toLocaleString()} points`;
  if (goalType === 'collect') return `${Math.min(collected, config.goalCount)} / ${config.goalCount} collected`;
  if (goalType === 'jelly') {
    const total = createJelly(levelNumber).size;
    return `${total - jellyLeft} / ${total} cleared`;
  }
  if (goalType === 'shell') return `${Math.min(shellsCleared, config.shellCount ?? 0)} / ${config.shellCount ?? 0} cracked`;
  const total = config.boss?.maxHealth ?? 0;
  return `${Math.max(0, total - bossHealthLeft)} / ${total} power drained`;
}

function objectiveProgress(levelNumber: number, score: number, collected: number, jellyLeft: number, bossHealthLeft: number, shellsCleared: number) {
  const config = LEVELS[levelNumber - 1];
  const totalJelly = hasGoal(config, 'jelly') ? createJelly(levelNumber).size : 0;
  return objectiveProgressPercent(config, score, collected, jellyLeft, totalJelly, bossHealthLeft, shellsCleared);
}

function trapDialogFocus(event: ReactKeyboardEvent<HTMLElement>, onEscape?: () => void) {
  if (event.key === 'Escape' && onEscape) {
    event.preventDefault();
    onEscape();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ));
  if (!controls.length) {
    event.preventDefault();
    return;
  }
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function HelpDialog({
  open,
  onClose,
  firstRun,
  actionRef,
}: {
  open: boolean;
  onClose: () => void;
  firstRun: boolean;
  actionRef: RefObject<HTMLButtonElement | null>;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card help-card" role="dialog" aria-modal="true" aria-labelledby="help-title" onKeyDown={event => trapDialogFocus(event, onClose)}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close guide"><X size={19} /></button>
        <div className="modal-icon"><BookOpen size={25} /></div>
        <span className="eyebrow">QUICK GUIDE</span>
        <h2 id="help-title">A sweeter kind of strategy.</h2>
        <p className="modal-intro">Everything you need to find your rhythm and start making big matches.</p>
        <ol className="help-steps">
          {HELP_STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="step-index">0{index + 1}</span>
              <div><b>{step.title}</b><span>{step.detail}</span></div>
            </li>
          ))}
        </ol>
        <button className="primary-button modal-action" ref={actionRef} type="button" onClick={onClose}>
          {firstRun ? "Got it — let's play!" : 'Back to the puzzle'} <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}

function App() {
  const [save] = useState(readSave);
  const [level, setLevel] = useState(save.level);
  const [unlocked, setUnlocked] = useState(save.unlocked);
  const [bestScores, setBestScores] = useState<Record<string, number>>(save.bestScores);
  const [bestWinScores, setBestWinScores] = useState<Record<string, number>>(save.bestWinScores);
  const [completedLevels, setCompletedLevels] = useState<Record<string, boolean>>(save.completedLevels);
  const [tutorialSeen, setTutorialSeen] = useState(save.tutorialSeen);
  const [mapChapter, setMapChapter] = useState(Math.floor((save.level - 1) / 10));
  const [mapSelectedLevel, setMapSelectedLevel] = useState<number | null>(save.level);
  const [showHelp, setShowHelp] = useState(false);
  const [guideFirstRun, setGuideFirstRun] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [focusBoard, setFocusBoard] = useState(false);
  const [sound, setSound] = useState(save.sound);
  const [board, setBoard] = useState<Candy[][]>(() => freshBoard());
  const [screen, setScreen] = useState<Screen>('intro');
  const [moves, setMoves] = useState(LEVELS[save.level - 1].moves);
  const [score, setScore] = useState(0);
  const [goalProgress, setGoalProgress] = useState(0);
  const [bossHealth, setBossHealth] = useState(LEVELS[save.level - 1].boss?.maxHealth ?? 0);
  const [sugarShells, setSugarShells] = useState<Map<string, number>>(() => new Map());
  const [shellsCleared, setShellsCleared] = useState(0);
  const [jelly, setJelly] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [focusedCell, setFocusedCell] = useState<Pos>([0, 0]);
  const [hinted, setHinted] = useState<Pos[]>([]);
  const [activityRevision, setActivityRevision] = useState(0);
  const [message, setMessage] = useState('Make a match of 3 or more');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState<string[]>([]);
  const [fallDistances, setFallDistances] = useState<Record<number, number>>({});
  const [shellHitCells, setShellHitCells] = useState<string[]>([]);
  const shellHitTimeout = useRef<number | null>(null);
  const [juiceBursts, setJuiceBursts] = useState<JuiceBurst[]>([]);
  const burstSequence = useRef(0);
  const [impactPulse, setImpactPulse] = useState(0);
  const [swapMotion, setSwapMotion] = useState<Record<number, { x: number; y: number; rejected?: boolean }>>({});
  const [boosterCounts, setBoosterCounts] = useState<Record<Booster, number>>(save.boosterCounts);
  const [armed, setArmed] = useState<Booster | null>(null);
  const [introBoosters, setIntroBoosters] = useState<Booster[]>(['hammer', 'line', 'rainbow']);
  const [equippedBoosters, setEquippedBoosters] = useState<Booster[]>(['hammer', 'line', 'rainbow']);
  const inputLock = useRef(false);
  const gameRun = useRef(0);
  const pointerStart = useRef<{ r: number; c: number; x: number; y: number } | null>(null);
  const suppressTap = useRef(false);
  const candyRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const helpActionRef = useRef<HTMLButtonElement>(null);
  const resultActionRef = useRef<HTMLButtonElement>(null);
  const confirmActionRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const playCue = useCallback((kind: 'match' | 'cascade' | 'invalid' | 'win' | 'lose' | 'special', enabled = sound, cascade = 1) => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContext.current ?? new AudioContextClass();
      audioContext.current = context;
      if (context.state === 'suspended') void context.resume();
      const notes: Record<typeof kind, number[]> = {
        match: [523, 659],
        cascade: [523, 659, 784],
        invalid: [180],
        win: [523, 659, 784, 1047],
        lose: [330, 247],
        special: [659, 784, 988],
      };
      notes[kind].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind === 'invalid' || kind === 'lose' ? 'triangle' : 'sine';
        const cascadeLift = kind === 'cascade'
          ? Math.min(1.42, 1 + Math.max(0, cascade - 1) * 0.105)
          : kind === 'special' ? 1.08 : 1;
        oscillator.frequency.value = frequency * cascadeLift;
        const startAt = context.currentTime + index * (kind === 'win' || kind === 'cascade' || kind === 'special' ? 0.075 : 0.025);
        const peak = kind === 'invalid' ? 0.035 : 0.055;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + (kind === 'win' ? 0.24 : 0.14));
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + (kind === 'win' ? 0.25 : 0.15));
      });
    } catch {
      // Sound is an enhancement; gameplay stays available if audio is blocked.
    }
  }, [sound]);

  const registerBoardActivity = useCallback(() => setActivityRevision(revision => revision + 1), []);

  const triggerBurst = useCallback((keys: string[], kind: JuiceBurst['kind'], points = 0, rows = SIZE, columns = SIZE) => {
    if (!keys.length) return;
    const cells = keys.map(key => posOf(key));
    const avgRow = cells.reduce((sum, cell) => sum + cell[0], 0) / cells.length;
    const avgCol = cells.reduce((sum, cell) => sum + cell[1], 0) / cells.length;
    const maxOrigins = kind === 'match' ? 5 : kind === 'special' ? 11 : 8;
    const stride = Math.max(1, Math.ceil(cells.length / maxOrigins));
    const sampledCells = cells.filter((_, index) => index % stride === 0).slice(0, maxOrigins);
    const bursts: JuiceBurst[] = sampledCells.map(([row, col]) => ({
      id: ++burstSequence.current,
      x: ((col + 0.5) / columns) * 100,
      y: ((row + 0.5) / rows) * 100,
      kind,
      strength: Math.min(1.35, 0.72 + keys.length / 36),
    }));
    bursts.push({
      id: ++burstSequence.current,
      x: ((avgCol + 0.5) / columns) * 100,
      y: ((avgRow + 0.5) / rows) * 100,
      kind,
      strength: Math.min(1.8, 1.02 + keys.length / 22),
      points,
    });
    const burstIds = new Set(bursts.map(burst => burst.id));
    setJuiceBursts(old => [...old, ...bursts].slice(-48));
    window.setTimeout(() => setJuiceBursts(old => old.filter(item => !burstIds.has(item.id))), kind === 'special' ? 720 : kind === 'cascade' ? 650 : 540);
  }, []);

  const levelData = LEVELS[level - 1];
  const target = levelData.target;
  const currentBossPalette = CHARACTER_PALETTES[levelData.boss?.color ?? 3];
  const progress = Math.min(100, score / target * 100);
  const stars = starsForScore(score, target);
  const objectivePercent = objectiveProgress(level, score, goalProgress, jelly.size, bossHealth, shellsCleared);
  const best = bestScores[String(level)] || 0;
  const completedCount = Object.values(completedLevels).filter(Boolean).length;
  const totalStars = useMemo(() => starsForCampaign(bestWinScores), [bestWinScores]);

  useEffect(() => {
    writeSave({ level, unlocked, bestScores, bestWinScores, completedLevels, tutorialSeen, sound, boosterCounts });
  }, [level, unlocked, bestScores, bestWinScores, completedLevels, tutorialSeen, sound, boosterCounts]);

  useEffect(() => () => {
    if (shellHitTimeout.current !== null) window.clearTimeout(shellHitTimeout.current);
  }, []);

  useEffect(() => {
    if (screen !== 'play' || busy || showHelp || showLeaveConfirm || showRestartConfirm || hinted.length > 0) return;
    const timer = window.setTimeout(() => {
      const move = findBestMove(board, levelData.goalType, levelData.goalColor, jelly, levelData.secondaryGoalType, sugarShells);
      if (!move) return;
      setHinted(move);
      setSelected(null);
      setArmed(null);
      setMessage('A little nudge: swap the two glowing candies.');
    }, HINT_IDLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activityRevision, board, busy, hinted.length, jelly, levelData, screen, showHelp, showLeaveConfirm, showRestartConfirm, sugarShells]);

  useEffect(() => {
    if (showHelp) helpActionRef.current?.focus();
    else if (showLeaveConfirm || showRestartConfirm) confirmActionRef.current?.focus();
    else if (screen === 'win' || screen === 'lose') resultActionRef.current?.focus();
    else if (screen === 'play' && focusBoard) {
      const frame = window.requestAnimationFrame(() => {
        candyRefs.current[keyOf(0, 0)]?.focus();
        setFocusBoard(false);
      });
      return () => window.cancelAnimationFrame(frame);
    } else if (restoreFocusRef.current?.isConnected) {
      restoreFocusRef.current.focus();
      restoreFocusRef.current = null;
    }
  }, [showHelp, showLeaveConfirm, showRestartConfirm, screen, focusBoard]);

  useEffect(() => () => {
    if (audioContext.current && audioContext.current.state !== 'closed') void audioContext.current.close();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && screen === 'play' && !showHelp && !showLeaveConfirm && !showRestartConfirm) {
        setSelected(null);
        setHinted([]);
        setArmed(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, showHelp, showLeaveConfirm, showRestartConfirm]);

  const openGuide = (firstRun = false) => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setGuideFirstRun(firstRun);
    setShowHelp(true);
  };

  const openLeaveDialog = () => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowLeaveConfirm(true);
  };

  const openRestartDialog = () => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowRestartConfirm(true);
  };

  const closeHelp = () => {
    setShowHelp(false);
    setGuideFirstRun(false);
  };

  const startLevel = useCallback((requested = level, bonusMoves = 0) => {
    gameRun.current += 1;
    inputLock.current = false;
    suppressTap.current = false;
    pointerStart.current = null;
    const safeLevel = Math.max(1, Math.min(unlocked, LEVEL_COUNT, Math.floor(requested)));
    const levelConfig = LEVELS[safeLevel - 1];
    const levelStart = createLevelBoard(levelConfig);
    setLevel(safeLevel);
    setMapSelectedLevel(safeLevel);
    setBoard(levelStart.board);
    setMoves(levelConfig.moves + Math.max(0, bonusMoves));
    setScore(0);
    setGoalProgress(0);
    setBossHealth(levelConfig.boss?.maxHealth ?? 0);
    setSugarShells(createSugarShells(safeLevel));
    setShellsCleared(0);
    setJelly(levelStart.jelly);
    setSelected(null);
    setFocusedCell([0, 0]);
    setHinted([]);
    setClearing([]);
    setFallDistances({});
    setShellHitCells([]);
    if (shellHitTimeout.current !== null) window.clearTimeout(shellHitTimeout.current);
    setJuiceBursts([]);
    setSwapMotion({});
    setImpactPulse(0);
    setArmed(null);
    setShowLeaveConfirm(false);
    setShowRestartConfirm(false);
    setFocusBoard(true);
    const needsGuide = safeLevel === 1 && !tutorialSeen;
    setGuideFirstRun(needsGuide);
    setShowHelp(needsGuide);
    if (needsGuide) setTutorialSeen(true);
    setMessage(safeLevel === 1 ? 'Welcome! Swap neighbours to match 3 or more.' : safeLevel <= 4 ? 'Warm-up level: explore matches and cascades.' : 'Make a match of 3 or more');
    setBusy(false);
    setScreen('play');
    setEquippedBoosters([...introBoosters]);
  }, [level, unlocked, introBoosters, tutorialSeen]);

  const finishMove = (nextScore: number, nextMoves: number, levelAtMove: number, nextGoalProgress: number, nextJelly: Set<string>, nextBossHealth: number, nextShellsCleared: number) => {
    const config = LEVELS[levelAtMove - 1];
    const goalComplete = objectivesComplete(config, nextScore, nextGoalProgress, nextJelly.size, nextBossHealth, nextShellsCleared);
    const finalScore = goalComplete ? nextScore + Math.max(0, nextMoves) * 100 : nextScore;
    const levelKey = String(levelAtMove);

    setScore(finalScore);
    setMoves(nextMoves);
    setGoalProgress(nextGoalProgress);
    setBossHealth(nextBossHealth);
    setShellsCleared(nextShellsCleared);
    setJelly(new Set(nextJelly));
    setBestScores(old => ({ ...old, [levelKey]: Math.max(old[levelKey] || 0, finalScore) }));

    if (goalComplete) {
      playCue('win');
      setBestWinScores(old => ({ ...old, [levelKey]: Math.max(old[levelKey] || 0, finalScore) }));
      setScreen('win');
      setUnlocked(old => Math.max(old, Math.min(LEVEL_COUNT, levelAtMove + 1)));
      setCompletedLevels(old => ({ ...old, [levelKey]: true }));
      setMessage(config.boss
        ? `${config.boss.name} defeated! Chapter ${config.chapter} cleared.`
        : nextMoves > 0
          ? `Level clear! +${(nextMoves * 100).toLocaleString()} move bonus!`
          : 'Level complete! Beautifully played.');
    } else if (nextMoves <= 0) {
      playCue('lose');
      setScreen('lose');
      setMessage('Out of moves. Try a new strategy.');
    }
  };

  const resolveAnimated = async (
    startingBoard: Candy[][],
    initialMatches: Set<string>,
    startingScore: number,
    nextMoves: number,
    levelAtMove: number,
    startingBossHealth: number,
    startingSugarShells: Map<string, number>,
    startingShellsCleared: number,
    startingShellImpactCells: Set<string> = new Set(),
    runToken = gameRun.current,
  ) => {
    const config = LEVELS[levelAtMove - 1];
    const plan = buildResolutionPlan({
      level: config,
      board: startingBoard,
      matches: initialMatches,
      score: startingScore,
      goalProgress,
      jelly,
      bossHealth: startingBossHealth,
      sugarShells: startingSugarShells,
      shellsCleared: startingShellsCleared,
      startingShellImpactCells,
    });

    for (const step of plan.steps) {
      if (runToken !== gameRun.current) return;
      if (config.boss) setBossHealth(step.bossHealth);
      if (step.shellsHit > 0) {
        setShellHitCells(step.shellHitCells);
        if (shellHitTimeout.current !== null) window.clearTimeout(shellHitTimeout.current);
        shellHitTimeout.current = window.setTimeout(() => {
          setShellHitCells([]);
          shellHitTimeout.current = null;
        }, 360);
        setSugarShells(new Map(step.sugarShells));
        setShellsCleared(step.shellsCleared);
      }
      setGoalProgress(step.goalProgress);
      setJelly(new Set(step.jelly));
      setClearing(step.clearCells);
      setImpactPulse(value => value + 1);
      setScore(step.score);
      setMessage(config.boss
        ? step.bossHealth <= 0 ? `${config.boss.name} is down!` : `${config.boss.name} has ${step.bossHealth} power left.`
        : step.shellsHit > 0
          ? `${step.shellsHit} sugar shell${step.shellsHit === 1 ? '' : 's'} cracked!`
          : step.cascade > 1
            ? ['Sweet cascade!', 'Tasty chain!', 'Sugar rush!', 'Unstoppable!'][Math.min(3, step.cascade - 2)]
            : step.clearCells.length >= 5 ? 'Sugar rush!' : 'Nice match!');
      const burstKind: JuiceBurst['kind'] = step.cascade > 1 ? 'cascade' : step.clearCells.length >= 5 ? 'special' : 'match';
      triggerBurst(step.clearCells, burstKind, step.points, config.rows, config.columns);
      playCue(step.cascade > 1 ? 'cascade' : step.clearCells.length >= 5 ? 'special' : 'match', sound, step.cascade);
      await sleep(CLEAR_SETTLE_MS);
      if (runToken !== gameRun.current) return;

      setBoard(step.boardAfterDrop);
      setClearing([]);
      setFallDistances(step.fallDistances);
      const fallDuration = Math.max(170, ...Object.values(step.fallDistances).map(fallAnimationDuration));
      await sleep(fallDuration + 18);
      if (runToken !== gameRun.current) return;
      setFallDistances({});
    }

    if (runToken !== gameRun.current) return;
    if (plan.reshuffleReason === 'cascade-limit') {
      setMessage('Board reshuffled for a fair move');
    } else if (plan.reshuffleReason === 'no-valid-moves') {
      setMessage('Shuffling for a new move…');
      await sleep(180);
      if (runToken !== gameRun.current) return;
    }

    setBoard(plan.board);
    setClearing([]);
    setFallDistances({});
    setSelected(null);
    const objectiveMet = objectivesComplete(config, plan.score, plan.goalProgress, plan.jelly.size, plan.bossHealth, plan.shellsCleared);
    finishMove(plan.score, nextMoves, levelAtMove, plan.goalProgress, plan.jelly, plan.bossHealth, plan.shellsCleared);
    if (plan.totalCleared > 0 && nextMoves > 0 && !objectiveMet && !config.boss) {
      const pointSummary = `+${(plan.score - startingScore).toLocaleString()} points`;
      setMessage(plan.totalShellsHit > 0
        ? `Sugar shells cracked · ${pointSummary}`
        : plan.steps.length > 1 ? `Cascade ×${plan.steps.length} · ${pointSummary}` : pointSummary);
    }
    setBusy(false);
    inputLock.current = false;
  };

  const swap = async (a: Pos, b: Pos) => {
    if (inputLock.current || screen !== 'play' || showHelp || showLeaveConfirm || showRestartConfirm || Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return;
    inputLock.current = true;
    setHinted([]);
    const runToken = gameRun.current;
    const levelAtMove = level;
    const startScore = score;
    const startMoves = moves;
    const startBossHealth = bossHealth;
    const startSugarShells = new Map(sugarShells);
    const startShellsCleared = shellsCleared;
    const original = clone(board);
    const copy = clone(board);
    [copy[a[0]][a[1]], copy[b[0]][b[1]]] = [copy[b[0]][b[1]], copy[a[0]][a[1]]];
    const itemA = copy[a[0]][a[1]];
    const itemB = copy[b[0]][b[1]];
    let matches = findMatches(copy);
    const matchedCellsBeforeSpecial = new Set(matches);
    const specialSwap = Boolean(itemA.special || itemB.special);

    if (!matches.size && !specialSwap) {
      setBusy(true);
      setSelected(null);
      setMessage('No match — try another swap');
      playCue('invalid');
      setSwapMotion({
        [itemA.id]: { x: (b[1] - a[1]) * 100, y: (b[0] - a[0]) * 100, rejected: true },
        [itemB.id]: { x: (a[1] - b[1]) * 100, y: (a[0] - b[0]) * 100, rejected: true },
      });
      setBoard(copy);
      await sleep(REJECT_SETTLE_MS);
      if (runToken !== gameRun.current) return;
      setBoard(original);
      setSwapMotion({});
      setBusy(false);
      inputLock.current = false;
      return;
    }

    setBusy(true);
    setSelected(null);
    setSwapMotion({
      [itemA.id]: { x: (b[1] - a[1]) * 100, y: (b[0] - a[0]) * 100 },
      [itemB.id]: { x: (a[1] - b[1]) * 100, y: (a[0] - b[0]) * 100 },
    });
    setBoard(copy);
    await sleep(SWAP_SETTLE_MS);
    if (runToken !== gameRun.current) return;
    setSwapMotion({});
    if (specialSwap) {
      const effect = applySpecialSwap(copy, a, b, matches);
      matches = effect.matches;
      if (effect.message) setMessage(effect.message);
    } else {
      buildSwapSpecial(copy, matches, a, b);
    }
    setBoard(copy);
    await resolveAnimated(copy, matches, startScore, startMoves - 1, levelAtMove, startBossHealth, startSugarShells, startShellsCleared, matchedCellsBeforeSpecial, runToken).catch(() => {
      if (runToken === gameRun.current) {
        setBusy(false);
        inputLock.current = false;
        setMessage('Recovered from a puzzle hiccup. Try that move again.');
      }
    });
  };

  const tapCandy = (r: number, c: number) => {
    if (suppressTap.current) {
      suppressTap.current = false;
      return;
    }
    if (inputLock.current || busy || screen !== 'play' || showHelp || showLeaveConfirm || showRestartConfirm) return;
    setHinted([]);

    if (armed) {
      const booster = armed;
      if (!boosterCounts[booster] || !equippedBoosters.includes(booster)) {
        setArmed(null);
        return;
      }
      inputLock.current = true;
      const runToken = gameRun.current;
      setBusy(true);
      const working = clone(board);
      const chosen = working[r][c];
      const cleared = new Set<string>();
      if (booster === 'hammer') cleared.add(keyOf(r, c));
      if (booster === 'line') for (let x = 0; x < working[r].length; x++) cleared.add(keyOf(r, x));
      if (booster === 'rainbow') {
        for (let y = 0; y < working.length; y++) {
          for (let x = 0; x < working[y].length; x++) if (working[y][x].color === chosen.color) cleared.add(keyOf(y, x));
        }
      }
      setArmed(null);
      setBoosterCounts(old => ({ ...old, [booster]: Math.max(0, old[booster] - 1) }));
      void resolveAnimated(working, cleared, score, Math.max(0, moves - 1), level, bossHealth, new Map(sugarShells), shellsCleared, new Set(), runToken).catch(() => {
        if (runToken === gameRun.current) {
          setBusy(false);
          inputLock.current = false;
          setMessage('Recovered from a puzzle hiccup. Try that booster again.');
        }
      });
      return;
    }

    if (!selected) {
      setSelected([r, c]);
      return;
    }
    if (selected[0] === r && selected[1] === c) {
      setSelected(null);
      return;
    }
    if (Math.abs(selected[0] - r) + Math.abs(selected[1] - c) === 1) void swap(selected, [r, c]);
    else setSelected([r, c]);
  };

  const handleCandyKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
    const directions: Record<string, Pos> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    if (busy || inputLock.current || showHelp || showLeaveConfirm || showRestartConfirm) return;
    const nextRow = Math.max(0, Math.min(board.length - 1, row + delta[0]));
    const nextCol = Math.max(0, Math.min(board[nextRow].length - 1, col + delta[1]));
    setFocusedCell([nextRow, nextCol]);
    setHinted([]);
    candyRefs.current[keyOf(nextRow, nextCol)]?.focus();
  };

  const openMap = () => {
    if (screen === 'play') {
      openLeaveDialog();
      return;
    }
    setMapChapter(Math.floor((level - 1) / 10));
    setMapSelectedLevel(level);
    setScreen('map');
  };

  const leaveLevelForMap = () => {
    gameRun.current += 1;
    inputLock.current = false;
    pointerStart.current = null;
    suppressTap.current = false;
    setBusy(false);
    setClearing([]);
    setFallDistances({});
    setShellHitCells([]);
    if (shellHitTimeout.current !== null) window.clearTimeout(shellHitTimeout.current);
    setSelected(null);
    setHinted([]);
    setArmed(null);
    setShowHelp(false);
    setShowLeaveConfirm(false);
    setMapChapter(Math.floor((level - 1) / 10));
    setMapSelectedLevel(level);
    setScreen('map');
  };

  const changeChapter = (offset: number) => {
    const nextChapter = Math.max(0, Math.min(9, mapChapter + offset));
    setMapChapter(nextChapter);
    const firstLevel = nextChapter * 10 + 1;
    const lastLevel = firstLevel + 9;
    if (unlocked < firstLevel) {
      setMapSelectedLevel(null);
    } else {
      setMapSelectedLevel(Math.min(lastLevel, unlocked));
    }
  };

  const hintMove = () => {
    if (busy || inputLock.current || screen !== 'play') return;
    const move = findBestMove(board, levelData.goalType, levelData.goalColor, jelly, levelData.secondaryGoalType, sugarShells);
    if (!move) {
      setHinted([]);
      setMessage('No move found — the board will reshuffle after your next turn.');
      return;
    }
    setHinted(move);
    setSelected(null);
    setArmed(null);
    setMessage('Swap the two glowing candies to make a goal-focused move.');
  };

  const renderCandy = (item: Candy, row: number, col: number) => {
    const cellKey = keyOf(row, col);
    const shellLayers = sugarShells.get(cellKey) ?? 0;
    const fallDistance = fallDistances[item.id] ?? 0;
    const className = [
      'candy',
      COLORS[item.color],
      swapMotion[item.id]?.rejected ? 'swap-rejected' : swapMotion[item.id] ? 'swap-motion' : '',
      selected?.[0] === row && selected?.[1] === col ? 'chosen' : '',
      hinted.some(([hintRow, hintCol]) => hintRow === row && hintCol === col) ? 'hint-target' : '',
      clearing.includes(cellKey) ? 'clearing' : '',
      fallDistance > 0 ? 'falling' : '',
      shellHitCells.includes(cellKey) ? 'shell-hit' : '',
      jelly.has(cellKey) ? 'jelly' : '',
      shellLayers ? 'sugar-shelled' : '',
      item.special || '',
    ].filter(Boolean).join(' ');
    const candyName = `${COLORS[item.color]}${item.special ? ` ${item.special.replace('-', ' ')}` : ''} candy, row ${row + 1}, column ${col + 1}${jelly.has(cellKey) ? ', on jelly' : ''}${shellLayers ? `, in a sugar shell with ${shellLayers} layer${shellLayers === 1 ? '' : 's'} left` : ''}`;
    const candyStyle = {
      '--idle-delay': `${-((row * 5 + col * 7) % 17) * 0.19}s`,
      ...(swapMotion[item.id] ? {
        '--swap-x': `${swapMotion[item.id].x}%`,
        '--swap-y': `${swapMotion[item.id].y}%`,
        '--swap-angle': `${swapMotion[item.id].x ? 0 : 90}deg`,
      } : {}),
      ...(fallDistance > 0 ? {
        '--fall-offset': `${-fallDistance * 100}%`,
        '--fall-duration': `${fallAnimationDuration(fallDistance)}ms`,
      } : {}),
    } as CSSProperties;

    return (
      <button
        key={item.id}
        ref={element => { candyRefs.current[cellKey] = element; }}
        type="button"
        className={className}
        style={candyStyle}
        onPointerDown={event => { pointerStart.current = { r: row, c: col, x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { pointerStart.current = null; }}
        onPointerUp={event => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!start || busy || inputLock.current || screen !== 'play' || showHelp || showLeaveConfirm || showRestartConfirm) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
          const moveRow = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 1 : -1) : 0;
          const moveCol = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0;
          const nextRow = start.r + moveRow;
          const nextCol = start.c + moveCol;
          if (nextRow >= 0 && nextRow < board.length && nextCol >= 0 && nextCol < board[nextRow].length) {
            suppressTap.current = true;
            window.setTimeout(() => { suppressTap.current = false; }, 350);
            setSelected(null);
            void swap([start.r, start.c], [nextRow, nextCol]);
          }
        }}
        onClick={() => tapCandy(row, col)}
        onFocus={() => setFocusedCell([row, col])}
        onKeyDown={event => handleCandyKeyDown(event, row, col)}
        aria-label={candyName}
        aria-pressed={selected?.[0] === row && selected?.[1] === col}
        aria-describedby="board-instructions"
        tabIndex={focusedCell[0] === row && focusedCell[1] === col ? 0 : -1}
        disabled={busy}
      >
        {jelly.has(cellKey) && <span className="jelly-glaze" aria-hidden="true" />}
        {shellLayers > 0 && <span className={`sugar-shell${shellLayers > 1 ? ' has-layers' : ''}`} aria-hidden="true"><i>✧</i>{shellLayers > 1 && <b>{shellLayers}</b>}</span>}
        {shellHitCells.includes(cellKey) && <span className="shell-hit-ripple" aria-hidden="true"><i>✦</i></span>}
        <span className="candy-face" aria-hidden="true">
          <CandyArt color={item.color} special={item.special} />
        </span>
      </button>
    );
  };

  const mapLevelNumber = mapSelectedLevel ?? mapChapter * 10 + 1;
  const mapLevelData = LEVELS[mapLevelNumber - 1];
  const mapBossPalette = CHARACTER_PALETTES[mapLevelData.boss?.color ?? 3];
  const mapLevelUnlocked = mapSelectedLevel !== null && mapSelectedLevel <= unlocked;
  const selectedLevelBest = bestScores[String(mapLevelNumber)] || 0;
  const selectedLevelStars = starsForScore(bestWinScores[String(mapLevelNumber)] || 0, mapLevelData.target);
  const currentLevelProgress = Math.min(100, completedCount / LEVEL_COUNT * 100);

  return (
    <main className={`app-shell${screen === 'play' || screen === 'win' || screen === 'lose' ? ' is-playing' : ''}${screen === 'intro' ? ' is-intro' : ''}`}>
      <header className="game-header">
        <button className="brand-button" type="button" onClick={() => {
          if (screen === 'play') openLeaveDialog();
          else setScreen('intro');
        }} aria-label="Jam Shift home">
          <span className="brand-mark"><Sparkles size={21} strokeWidth={2.4} /></span>
          <span className="brand-copy">JAM SHIFT<small>PUZZLE CLUB</small></span>
        </button>
        <div className="header-note"><span className="status-dot" />A little play goes a long way</div>
        <div className="header-actions">
          <div className="header-star-count" aria-label={`${totalStars} campaign stars`}><Star size={16} fill="currentColor" /><b>{totalStars}</b><span>stars</span></div>
          <button className="header-link" type="button" onClick={() => {
            if (screen === 'play') openLeaveDialog();
            else if (screen === 'map') setScreen('intro');
            else openMap();
          }} aria-label={screen === 'map' ? 'Return home' : 'Open campaign map'}>
            {screen === 'map' ? <ArrowLeft size={16} /> : <MapIcon size={16} />}
            <span>{screen === 'map' ? 'Home' : 'World map'}</span>
          </button>
          <button className="sound-toggle" type="button" onClick={() => setSound(value => !value)} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound}>
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>SFX</span>
          </button>
        </div>
      </header>

      {screen === 'intro' && (
        <section className="home-view" aria-labelledby="home-title">
          <div className="intro-topline">
            <div className="intro-wordmark" aria-label="Jam Shift Puzzle Club">
              <span className="brand-mark"><Sparkles size={21} strokeWidth={2.4} /></span>
              <span>JAM SHIFT<small>PUZZLE CLUB</small></span>
            </div>
            <div className="intro-quick-actions">
              <span className="intro-stars" aria-label={`${totalStars} campaign stars`}><Star size={16} fill="currentColor" /><b>{totalStars}</b></span>
              <button className="intro-icon-button" type="button" onClick={openMap} aria-label="Open campaign map"><MapIcon size={18} /></button>
              <button className="intro-icon-button" type="button" onClick={() => setSound(value => !value)} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound}>
                {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            </div>
          </div>
          <div className="page-kicker-row">
            <span className="eyebrow"><span className="eyebrow-mark">✦</span> A CANDY WORLD TO EXPLORE</span>
            <span className="save-indicator"><span className="status-dot" />Progress saved on this device</span>
          </div>
          <div className="home-grid">
            <section className="hero-card">
              <div className="hero-art" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <div className="hero-preview-board">
                  <div className="hero-preview-top"><span>LEVEL {String(level).padStart(2, '0')}</span><Sparkles size={15} /></div>
                  <div className="hero-preview-grid">
                    {board.slice(0, 6).map((row, rowIndex) => (
                      <div className="hero-preview-row" key={rowIndex}>
                        {row.slice(0, 6).map((item, colIndex) => (
                          <span className={`hero-preview-candy ${COLORS[item.color]}`} key={`${rowIndex}-${colIndex}`}>
                            <CandyArt color={item.color} special={item.special} />
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <span className="hero-buddy"><CharacterArt color="#78d68b" accent="#308d5a" /></span>
                <span className="hero-spark hero-spark-one">✦</span>
                <span className="hero-spark hero-spark-two">✧</span>
              </div>
              <div className="hero-copy">
                <span className="chapter-pill"><Sparkles size={14} /> CHAPTER {String(levelData.chapter).padStart(2, '0')} <i /> {levelData.chapterName}</span>
                <h1 id="home-title">Make a little<br /><em>match magic.</em></h1>
                <p>Swap bright candies, chase satisfying cascades, and find your own sweet rhythm across 100 playful puzzles.</p>
                <div className="hero-actions">
                  <button className="primary-button" type="button" onClick={() => startLevel()}>
                    Play level {String(level).padStart(2, '0')} <ArrowRight size={18} />
                  </button>
                  <button className="text-button" type="button" onClick={() => openGuide(false)}><CircleHelp size={17} /> How to play</button>
                </div>
                <div className="hero-caption"><span>YOUR NEXT PUZZLE</span><b>Level {String(level).padStart(2, '0')}</b><i />{goalDescription(level)}</div>
              </div>
              <div className="hero-stamp" aria-hidden="true"><span>MADE FOR</span><strong>JOY</strong><Sparkles size={18} /></div>
              <div className="hero-decoration" aria-hidden="true"><div className="decoration-ring" /><div className="decoration-glow" /></div>
            </section>

            <aside className="home-rail">
              <section className="journey-card">
                <div className="card-heading"><span>YOUR JOURNEY</span><Compass size={18} /></div>
                <div className="journey-summary">
                  <div className="journey-number"><strong>{String(level).padStart(2, '0')}</strong><span>of {LEVEL_COUNT}</span></div>
                  <div className="journey-copy"><b>{levelData.chapterName}</b><span>Chapter {levelData.chapter} · Level {level}</span></div>
                </div>
                <div className="journey-track" role="progressbar" aria-label="Campaign levels completed" aria-valuemin={0} aria-valuemax={LEVEL_COUNT} aria-valuenow={completedCount}><span style={{ width: `${currentLevelProgress}%` }} /></div>
                <div className="journey-stats">
                  <div><Star size={15} fill="currentColor" /><b>{totalStars}</b><span>stars earned</span></div>
                  <div><Check size={15} /><b>{completedCount}</b><span>levels cleared</span></div>
                </div>
              </section>

              <section className="loadout-card">
                <div className="card-heading"><span>PREP YOUR POWER-UPS</span><Sparkles size={18} /></div>
                <p className="card-subcopy">Choose the helpers you want to bring along.</p>
                <div className="loadout-list">
                  {BOOSTERS.map(booster => {
                    const equipped = introBoosters.includes(booster.id);
                    const available = boosterCounts[booster.id] > 0;
                    return (
                      <button
                        key={booster.id}
                        className={`loadout-item ${equipped ? 'is-equipped' : ''}`}
                        type="button"
                        aria-label={`${booster.label}, ${boosterCounts[booster.id]} charges${equipped ? ', equipped' : ''}`}
                        aria-pressed={equipped}
                        disabled={!available}
                        onClick={() => setIntroBoosters(old => old.includes(booster.id) ? old.filter(item => item !== booster.id) : [...old, booster.id])}
                      >
                        <span className="loadout-emoji" aria-hidden="true">{booster.icon}</span>
                        <span className="loadout-name"><b>{booster.shortName}</b><small>{booster.description}</small></span>
                        <span className="loadout-quantity">{available ? `${boosterCounts[booster.id]} left` : 'Empty'}</span>
                        <span className="loadout-check">{equipped && available ? <Check size={13} /> : null}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="loadout-note"><Heart size={14} /> Each power-up use costs one move and one charge.</div>
              </section>

              <button className="map-card-link" type="button" onClick={openMap}>
                <span className="map-link-icon"><MapIcon size={19} /></span>
                <span><b>Explore the world map</b><small>10 worlds · 100 levels</small></span>
                <ArrowRight size={17} />
              </button>
            </aside>
          </div>
          <div className="home-footnote"><span>NO ACCOUNT NEEDED</span><i />PLAY AT YOUR OWN PACE<i />PROGRESS STAYS ON THIS DEVICE</div>
        </section>
      )}

      {screen === 'map' && (
        <section className="map-view" aria-labelledby="map-title">
          <div className="page-kicker-row">
            <span className="eyebrow"><span className="eyebrow-mark">✦</span> CAMPAIGN · 100 LEVELS</span>
            <span className="save-indicator"><Star size={15} fill="currentColor" /> {totalStars} / 300 stars</span>
          </div>
          <div className="map-intro-row">
            <div><h1 id="map-title">Choose your <em>next puzzle.</em></h1><p>Ten little worlds, one hundred chances to make a match.</p></div>
            <div className="map-overview-stats"><div><b>{completedCount}</b><span>levels cleared</span></div><div><b>{unlocked}</b><span>level unlocked</span></div></div>
          </div>
          <div className="map-layout">
            <section className="world-panel" aria-labelledby="world-title">
              <div className="world-panel-heading">
                <div className="world-index">WORLD {String(mapChapter + 1).padStart(2, '0')} <span>· 10 LEVELS</span></div>
                <h2 id="world-title">{LEVELS[mapChapter * 10].chapterName}</h2>
                <p>Every great run starts with one good move.</p>
                <div className="world-controls">
                  <span>{Object.keys(completedLevels).filter(number => Number(number) > mapChapter * 10 && Number(number) <= mapChapter * 10 + 10).length} of 10 cleared</span>
                  <div>
                    <button type="button" className="chapter-arrow" aria-label="Previous world" disabled={mapChapter === 0} onClick={() => changeChapter(-1)}><ChevronLeft size={19} /></button>
                    <button type="button" className="chapter-arrow" aria-label="Next world" disabled={mapChapter === 9} onClick={() => changeChapter(1)}><ChevronRight size={19} /></button>
                  </div>
                </div>
              </div>
              <WorldScene key={mapChapter} chapter={mapChapter} />
              <div className="level-map-grid" aria-label={`${LEVELS[mapChapter * 10].chapterName} levels`}>
                {Array.from({ length: 10 }, (_, index) => mapChapter * 10 + index + 1).map(number => {
                  const isLocked = number > unlocked;
                  const isComplete = Boolean(completedLevels[String(number)]);
                  const levelStars = starsForScore(bestWinScores[String(number)] || 0, LEVELS[number - 1].target);
                  const label = isLocked ? `Level ${number}, locked` : `Level ${number}${LEVELS[number - 1].boss ? ', chapter boss finale' : ''}${isComplete ? `, completed with ${levelStars} stars` : ''}`;
                  return (
                    <button
                      key={number}
                      type="button"
                      className={`map-level ${number === mapSelectedLevel ? 'is-selected' : ''} ${isComplete ? 'is-complete' : ''} ${isLocked ? 'is-locked' : ''} ${LEVELS[number - 1].boss ? 'is-boss-level' : ''}`}
                      disabled={isLocked}
                      aria-label={label}
                      aria-pressed={number === mapSelectedLevel}
                      onClick={() => setMapSelectedLevel(number)}
                    >
                      <span className="map-level-number">{isLocked ? <span className="lock-symbol">⌑</span> : String(number).padStart(2, '0')}</span>
                      {isComplete && <span className="map-level-star" aria-hidden="true">★</span>}
                      {number === level && !isComplete && <span className="map-level-current" aria-hidden="true">YOU</span>}
                      {LEVELS[number - 1].boss && <span className="map-boss-marker" aria-hidden="true">✦ BOSS</span>}
                      {isComplete && <span className="map-node-stars" aria-label={`${levelStars} stars`}>{[1, 2, 3].map(star => <i key={star} className={levelStars >= star ? 'on' : ''} />)}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="map-legend"><span><i className="legend-current" />Current</span><span><i className="legend-complete">★</i>Complete</span><span><i className="legend-locked">⌑</i>Locked</span></div>
            </section>

            <aside key={mapLevelNumber} className="map-detail-card" aria-label="Selected level details">
              {mapLevelUnlocked ? <>
                <span className="detail-kicker">{mapSelectedLevel === level ? 'YOUR NEXT LEVEL' : 'LEVEL PREVIEW'}</span>
                <div className="detail-level-number">{String(mapLevelNumber).padStart(2, '0')}<span>/{LEVEL_COUNT}</span></div>
                <h2>{mapLevelData.chapterName}</h2>
                <div className="detail-stars" aria-label={`${selectedLevelStars} of 3 stars`}>
                  {[1, 2, 3].map(star => <Star key={star} size={21} fill="currentColor" className={selectedLevelStars >= star ? 'is-earned' : ''} />)}
                  <span>{completedLevels[String(mapLevelNumber)] ? `${selectedLevelStars} earned` : 'Not played yet'}</span>
                </div>
                <div className="detail-objective">
                  <span className="detail-objective-icon">{goalGlyph(mapLevelData.goalType, mapLevelNumber)}</span>
                  <div><small>{mapLevelData.boss ? 'CHAPTER BOSS' : mapLevelData.secondaryGoalType ? 'LEVEL OBJECTIVES' : 'LEVEL OBJECTIVE'}</small><b>{goalDescription(mapLevelNumber)}</b></div>
                </div>
                {mapLevelData.boss && <div className="map-boss-preview">
                  <CharacterArt kind="boss" color={mapBossPalette.color} accent={mapBossPalette.accent} />
                  <div><small>CHAPTER FINALE</small><b>{mapLevelData.boss.name}</b><span>{mapLevelData.boss.epithet}</span></div>
                  <span className="boss-health-chip">{mapLevelData.boss.maxHealth} HP</span>
                </div>}
                <div className="detail-meta"><span>Moves available</span><b>{mapLevelData.moves}</b></div>
                <div className="detail-meta"><span>Personal best</span><b>{selectedLevelBest.toLocaleString()}</b></div>
                <button className="primary-button detail-play" type="button" onClick={() => startLevel(mapLevelNumber)}>
                  Play level {mapLevelNumber} <ArrowRight size={18} />
                </button>
              </> : <div className="locked-world-detail">
                <span className="locked-icon"><span>⌑</span></span>
                <span className="detail-kicker">WORLD {String(mapChapter + 1).padStart(2, '0')}</span>
                <h2>More sweet things ahead.</h2>
                <p>Clear the previous levels to open this part of the map. Your next available level is {unlocked}.</p>
                <button className="secondary-button" type="button" onClick={() => { setMapChapter(Math.floor((unlocked - 1) / 10)); setMapSelectedLevel(unlocked); }}>
                  Go to level {unlocked} <ArrowRight size={17} />
                </button>
              </div>}
              <div className="detail-footer"><span className="status-dot" />No timers. No pressure. Just puzzles.</div>
            </aside>
          </div>
        </section>
      )}

      {screen === 'play' && (
        <section className="play-view" aria-label={`Level ${level} game`}>
          <div className="play-topline">
            <button className="back-link" type="button" onClick={openLeaveDialog} aria-label="Exit level to campaign map"><ArrowLeft size={17} /><span>Exit</span></button>
            <span className="play-world-label">WORLD {String(levelData.chapter).padStart(2, '0')} <i /> {levelData.chapterName}</span>
            <div className="play-topline-actions">
              <button className="play-icon-button" type="button" onClick={() => setSound(value => !value)} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound}>
                {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button className="play-icon-button" type="button" onClick={() => openGuide(false)} aria-label="How to play"><CircleHelp size={19} /></button>
            </div>
          </div>
          <div className={`level-hud${levelData.boss ? ' is-boss-level' : ''}`}>
            <div className="level-hud-main">
              <div className={`level-hud-character${levelData.boss && impactPulse > 0 ? ` boss-hit-${impactPulse % 2 ? 'b' : 'a'}` : ''}`}>
                {levelData.boss
                  ? <CharacterArt kind="boss" mood="determined" color={currentBossPalette.color} accent={currentBossPalette.accent} />
                  : <CharacterArt color="#78d68b" accent="#308d5a" />}
              </div>
              <div className="level-hud-copy">
                <span className="level-hud-kicker">{levelData.boss ? `CHAPTER BOSS · LEVEL ${String(level).padStart(2, '0')}` : `LEVEL ${String(level).padStart(2, '0')} · ${levelData.chapterName}`}</span>
                <b>{levelData.boss?.name ?? goalHeadline(levelData.goalType, level, score, goalProgress, jelly.size, bossHealth, shellsCleared)}</b>
                {levelData.boss && <small className="level-boss-epithet">{levelData.boss.epithet} · “{levelData.boss.taunt}”</small>}
                {levelData.boss
                  ? <div className="boss-health-track" role="progressbar" aria-label={`${levelData.boss.name} remaining power`} aria-valuemin={0} aria-valuemax={levelData.boss.maxHealth} aria-valuenow={bossHealth}>
                    <span style={{ width: `${Math.max(0, bossHealth / levelData.boss.maxHealth * 100)}%` }} />
                  </div>
                  : <div className="level-objective-track" role="progressbar" aria-label="Level objective progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(objectivePercent)}><span style={{ width: `${objectivePercent}%` }} /></div>}
                <div className="level-hud-subline">
                  <span>{levelData.boss
                    ? `${bossHealth} / ${levelData.boss.maxHealth} power`
                    : [
                      goalCounter(levelData.goalType, level, score, goalProgress, jelly.size, bossHealth, shellsCleared),
                      ...(levelData.secondaryGoalType ? [goalCounter(levelData.secondaryGoalType, level, score, goalProgress, jelly.size, bossHealth, shellsCleared)] : []),
                    ].join(' · ')}</span>
                  <span key={score} className="score-live" aria-label={`${score.toLocaleString()} of ${target.toLocaleString()} target points`}>{score.toLocaleString()} / {target.toLocaleString()}</span>
                  <span className="hud-star-count" aria-label={`${stars} of 3 stars`}><Star size={11} fill="currentColor" /><b>{stars}/3</b></span>
                </div>
              </div>
              <div className="level-hud-moves"><small>MOVES</small><b key={moves} className="move-tick">{moves}</b></div>
            </div>
          </div>
          <div className="play-layout" onPointerDown={registerBoardActivity} onKeyDown={registerBoardActivity}>
            <aside className="play-rail-left">
              <section className="mission-card">
                <div className="mission-card-head"><span>LEVEL {String(level).padStart(2, '0')}</span><Sparkles size={16} /></div>
                <h1>{levelData.chapterName}</h1>
                <p className="mission-subtitle">A new little challenge</p>
                {levelData.boss && <div className={`desktop-boss-card${impactPulse > 0 ? ` boss-hit-${impactPulse % 2 ? 'b' : 'a'}` : ''}`}>
                  <CharacterArt kind="boss" mood="determined" color={currentBossPalette.color} accent={currentBossPalette.accent} />
                  <div className="boss-card-copy">
                    <span>CHAPTER BOSS</span>
                    <b>{levelData.boss.name}</b>
                    <small className="boss-card-epithet">{levelData.boss.epithet} · “{levelData.boss.taunt}”</small>
                    <div className="boss-health-track" role="progressbar" aria-label={`${levelData.boss.name} remaining power`} aria-valuemin={0} aria-valuemax={levelData.boss.maxHealth} aria-valuenow={bossHealth}>
                      <span style={{ width: `${Math.max(0, bossHealth / levelData.boss.maxHealth * 100)}%` }} />
                    </div>
                    <small>{bossHealth} / {levelData.boss.maxHealth} power</small>
                  </div>
                </div>}
                <div className="score-display">
                  <div><span>YOUR SCORE</span><strong key={score} className="score-tick">{score.toLocaleString()}</strong></div>
                  <span className="score-target">{levelData.boss ? 'STAR GOAL' : 'TARGET'}<br /><b>{target.toLocaleString()}</b></span>
                </div>
                <div className="score-progress" role="progressbar" aria-label={levelData.boss ? 'Bonus score toward the star goal' : 'Score toward level target'} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(score, target)}><span style={{ width: `${progress}%` }} /></div>
                <div className="score-stars" aria-label={`${stars} stars earned this round`}>
                  {[1, 2, 3].map(star => <Star key={star} size={19} fill="currentColor" className={stars >= star ? 'is-earned' : ''} />)}
                  <span>{stars} / 3</span>
                </div>
                <div className="mission-divider" />
                <div className="objective-heading"><span>{levelData.boss ? 'CHAPTER BOSS' : levelData.secondaryGoalType ? 'BOTH GOALS REQUIRED' : "THIS LEVEL'S GOAL"}</span><TargetMark /></div>
                <div className="objective-copy">
                  <span className="objective-glyph">{goalGlyph(levelData.goalType, level)}</span>
                  <div>
                    <b>{goalHeadline(levelData.goalType, level, score, goalProgress, jelly.size, bossHealth, shellsCleared)}</b>
                    <small>{goalCounter(levelData.goalType, level, score, goalProgress, jelly.size, bossHealth, shellsCleared)}</small>
                  </div>
                </div>
                {levelData.secondaryGoalType && <div className="objective-secondary">
                  <span className="objective-secondary-icon" aria-hidden="true">{goalGlyph(levelData.secondaryGoalType, level)}</span>
                  <div>
                    <b>{goalHeadline(levelData.secondaryGoalType, level, score, goalProgress, jelly.size, bossHealth, shellsCleared)}</b>
                    <small>{goalCounter(levelData.secondaryGoalType, level, score, goalProgress, jelly.size, bossHealth, shellsCleared)}</small>
                  </div>
                </div>}
                <div className="objective-track" role="progressbar" aria-label={levelData.boss ? `${levelData.boss.name} power drained` : levelData.secondaryGoalType ? 'Both level objectives progress' : 'Level objective progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(objectivePercent)}><span style={{ width: `${objectivePercent}%` }} /></div>
                <div className="objective-track-label"><span>{levelData.boss ? 'BOSS POWER DRAINED' : levelData.secondaryGoalType ? 'BOTH GOALS · LEAST COMPLETE' : 'OBJECTIVE PROGRESS'}</span><b>{Math.round(objectivePercent)}%</b></div>
                <div className="moves-display"><span className="moves-icon">↗</span><div><small>MOVES LEFT</small><b key={moves} className="move-tick">{moves}</b></div><span className="moves-hint">Plan a<br />good one.</span></div>
              </section>
            </aside>

            <section className="play-board-column" aria-labelledby="board-title">
              <div className="board-title-row">
                <div><span className="eyebrow"><i className="board-live-dot" /> LEVEL IN PLAY</span><h2 id="board-title">Make your next move count.</h2></div>
                <button className="icon-action" type="button" onClick={() => openGuide(false)} aria-label="How to play"><CircleHelp size={19} /></button>
              </div>
              <div className="game-board-wrap" style={{ '--board-fit-width': `${54 * levelData.columns / levelData.rows}svh`, '--board-aspect-ratio': `${levelData.columns} / ${levelData.rows}` } as CSSProperties}>
                <div className="board-top"><span>LEVEL {String(level).padStart(2, '0')}</span><span>{busy ? 'SWEET THINGS IN MOTION' : 'SWAP TO MATCH'}</span></div>
                <JuiceBurstLayer effects={juiceBursts} />
                <div className={`candy-board${busy ? ' resolving' : ''}${impactPulse % 2 ? ' juice-impact-a' : ' juice-impact-b'}`} style={{ '--board-columns': levelData.columns, '--board-rows': levelData.rows, '--board-ratio': levelData.columns / levelData.rows } as CSSProperties} role="group" aria-label="Candy puzzle board">
                  <span id="board-instructions" className="visually-hidden">Choose a candy and an adjacent candy to swap, or swipe a candy. Use arrow keys to move around the board.</span>
                  {board.map((row, rowIndex) => <div className="candy-row" key={rowIndex} role="presentation">{row.map((item, colIndex) => renderCandy(item, rowIndex, colIndex))}</div>)}
                </div>
                <div className="board-bottom"><span><span className="board-spark">✦</span> Match 3 or more</span><span>{levelData.columns} × {levelData.rows} puzzle</span></div>
              </div>
              <div className="status-message" role="status" aria-live="polite"><span className="status-message-indicator" /><span key={message} className="status-copy">{message}</span></div>
              <div className="board-footnote"><span>TIP: LOOK FOR A MOVE THAT HELPS YOUR GOAL</span><span>{busy ? 'PLEASE WAIT' : 'NO TIMER · PLAY AT YOUR PACE'}</span></div>
            </section>

            <aside className="play-rail-right">
              <section className="powerups-card">
                <div className="card-heading"><span>POWER-UPS</span><Sparkles size={17} /></div>
                <p className="card-subcopy">Tap one, then pick a candy on the board.</p>
                <div className="powerup-list">
                  {BOOSTERS.map(booster => {
                    const available = boosterCounts[booster.id] > 0 && equippedBoosters.includes(booster.id);
                    return (
                      <button
                        key={booster.id}
                        type="button"
                        className={`power-button ${armed === booster.id ? 'is-armed' : ''}`}
                        aria-label={`${booster.label}, ${boosterCounts[booster.id]} charges`}
                        aria-pressed={armed === booster.id}
                        disabled={!available || busy}
                        onClick={() => {
                          setArmed(current => current === booster.id ? null : booster.id);
                          setSelected(null);
                          setMessage(`Tap a candy to use ${booster.shortName.toLowerCase()}.`);
                        }}
                      >
                        <span className="powerup-emoji" aria-hidden="true">{booster.icon}</span>
                        <span className="powerup-label"><b>{booster.shortName}</b><small>{booster.description}</small></span>
                        <span className="powerup-count">{boosterCounts[booster.id]}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="powerup-cost"><span>MOVE COST</span><b>1 move</b><i /> <span>CHARGE COST</span><b>1 charge</b></div>
              </section>

              <div className="personal-best"><span>PERSONAL BEST</span><b>{best.toLocaleString()}</b><small>Saved on this device</small></div>

              <section className="tool-card">
                <div className="card-heading"><span>NEED A NUDGE?</span><Lightbulb size={17} /></div>
                <p className="card-subcopy">A goal-focused nudge appears here if you pause for a few seconds.</p>
                <button className="utility-button" type="button" onClick={hintMove} disabled={busy}><Lightbulb size={17} /> Show me a move <ArrowRight size={15} /></button>
                <button className="utility-button utility-secondary" type="button" onClick={openRestartDialog} disabled={busy}><RotateCcw size={16} /> Restart level</button>
              </section>

              <section className="tip-card"><span className="tip-icon"><Sparkles size={18} /></span><div><b>Sweet strategy</b><p>Matches near the bottom often create cascades when fresh candies fall into place.</p></div></section>
            </aside>
          </div>
        </section>
      )}

      {(screen === 'win' || screen === 'lose') && (
        <div className="result-overlay">
          <section className={`result-card ${screen === 'lose' ? 'result-card-lose' : ''}`} role="dialog" aria-modal="true" aria-labelledby="result-title" onKeyDown={event => trapDialogFocus(event)}>
            {screen === 'win' ? <>
              <div className="result-art result-art-win" aria-hidden="true">{levelData.boss
                ? <CharacterArt kind="boss" mood="dazed" color={currentBossPalette.color} accent={currentBossPalette.accent} />
                : <><span>✿</span><i>✦</i></>}</div>
              <span className="eyebrow">{levelData.boss ? 'CHAPTER BOSS DEFEATED' : 'LEVEL COMPLETE'}</span>
              <h2 id="result-title">{levelData.boss ? 'Boss beaten!' : 'Sweet victory.'}</h2>
              <p>{levelData.boss
                ? `You outmatched ${levelData.boss.name} and cleared ${levelData.chapterName}. `
                : 'You scored ' }{levelData.boss && <>You scored </>}<b>{score.toLocaleString()}</b> points. {levelData.boss ? 'What a finish!' : 'That was a lovely bit of strategy.'}</p>
              <div className="result-stars" aria-label={`${stars} stars earned`}>
                {[1, 2, 3].map(star => <Star key={star} size={34} fill="currentColor" style={{ '--star-delay': `${(star - 1) * 100}ms` } as CSSProperties} className={stars >= star ? 'is-earned' : ''} />)}
              </div>
              <div className="result-reward"><span>CAMPAIGN PROGRESS</span><b>{Math.min(LEVEL_COUNT, completedCount)} / {LEVEL_COUNT} levels cleared</b></div>
              <button className="primary-button result-action" type="button" ref={resultActionRef} onClick={() => level < LEVEL_COUNT ? startLevel(level + 1) : setScreen('map')}>
                {level < LEVEL_COUNT ? 'Next level' : 'Explore the map'} <ArrowRight size={18} />
              </button>
              <button className="text-button result-secondary" type="button" onClick={() => { setMapChapter(Math.floor((level - 1) / 10)); setMapSelectedLevel(level); setScreen('map'); }}><MapIcon size={16} /> Campaign map</button>
            </> : <>
              <div className="result-art result-art-lose" aria-hidden="true">{levelData.boss
                ? <CharacterArt kind="boss" color={currentBossPalette.color} accent={currentBossPalette.accent} />
                : <><span>◌</span><i>·</i></>}</div>
              <span className="eyebrow">{levelData.boss ? 'BOSS ROUND · ONE MORE TRY?' : 'ONE MORE TRY?'}</span>
              <h2 id="result-title">{levelData.boss ? `${levelData.boss.name} held on.` : 'The next move is yours.'}</h2>
              <p>{levelData.boss
                ? `${levelData.boss.name} has ${bossHealth} power left. You scored `
                : 'You scored '}<b>{score.toLocaleString()}</b> points. Take a breath, then give this puzzle another go.</p>
              <div className="result-reward"><span>YOUR OBJECTIVE</span><b>{goalDescription(level)}</b></div>
              <button className="primary-button result-action" type="button" ref={resultActionRef} onClick={() => startLevel(level, 3)}>
                Retry with +3 moves <RotateCcw size={17} />
              </button>
              <button className="text-button result-secondary" type="button" onClick={() => { setMapChapter(Math.floor((level - 1) / 10)); setMapSelectedLevel(level); setScreen('map'); }}><MapIcon size={16} /> Campaign map</button>
            </>}
          </section>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="modal-backdrop">
          <section className="modal-card confirm-card" role="dialog" aria-modal="true" aria-labelledby="leave-title" onKeyDown={event => trapDialogFocus(event, () => setShowLeaveConfirm(false))}>
            <button className="modal-close" type="button" onClick={() => setShowLeaveConfirm(false)} aria-label="Stay in the level"><X size={19} /></button>
            <div className="modal-icon"><MapIcon size={24} /></div>
            <span className="eyebrow">PAUSE FOR A MOMENT</span>
            <h2 id="leave-title">Leave this puzzle?</h2>
            <p>Your current round will end, but your campaign progress and boosters are safe.</p>
            <div className="confirm-actions"><button className="text-button" ref={confirmActionRef} type="button" onClick={() => setShowLeaveConfirm(false)}>Keep playing</button><button className="primary-button" type="button" onClick={leaveLevelForMap}>Open world map <ArrowRight size={17} /></button></div>
          </section>
        </div>
      )}

      {showRestartConfirm && (
        <div className="modal-backdrop">
          <section className="modal-card confirm-card" role="dialog" aria-modal="true" aria-labelledby="restart-title" onKeyDown={event => trapDialogFocus(event, () => setShowRestartConfirm(false))}>
            <button className="modal-close" type="button" onClick={() => setShowRestartConfirm(false)} aria-label="Keep playing"><X size={19} /></button>
            <div className="modal-icon"><RotateCcw size={23} /></div>
            <span className="eyebrow">FRESH START</span>
            <h2 id="restart-title">Restart level {level}?</h2>
            <p>This round's score and moves will reset. Any power-ups already used will stay spent.</p>
            <div className="confirm-actions"><button className="text-button" ref={confirmActionRef} type="button" onClick={() => setShowRestartConfirm(false)}>Keep playing</button><button className="primary-button" type="button" onClick={() => { setShowRestartConfirm(false); startLevel(); }}>Restart level <RotateCcw size={16} /></button></div>
          </section>
        </div>
      )}

      <HelpDialog open={showHelp} onClose={closeHelp} firstRun={guideFirstRun} actionRef={helpActionRef} />

      <footer className="site-footer">
        <span><b>JAM SHIFT</b><i />A match-3 puzzle club</span>
        <span><Check size={14} /> Progress saved on this device</span>
        <span>Offline friendly <i /> Made for happy brains</span>
      </footer>
    </main>
  );
}

function TargetMark() {
  return <span className="target-mark" aria-hidden="true">◎</span>;
}

export default App;
