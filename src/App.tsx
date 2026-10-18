import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JuiceBurstLayer, { type JuiceBurst } from './components/JuiceBurstLayer';
import {
  applySpecialSwap, buildSwapSpecial, clone, COLORS, createJelly, dropMatches, expandSpecials,
  findBestMove, findMatches, freshBoard, GLYPHS, hasMove, keyOf, LEVEL_COUNT, LEVELS,
  posOf, Screen, shuffleBoard, SIZE, sleep, Booster, Candy, Pos
} from './game/engine';

function readSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem('jamshift-save') || '{}');
    return {
      level: Math.max(1, Math.min(LEVEL_COUNT, Number(parsed.level) || 1)),
      unlocked: Math.max(1, Math.min(LEVEL_COUNT, Number(parsed.unlocked) || 1)),
      bestScores: parsed.bestScores && typeof parsed.bestScores === 'object' ? parsed.bestScores as Record<string, number> : {},
      completedLevels: parsed.completedLevels && typeof parsed.completedLevels === 'object' ? parsed.completedLevels as Record<string, boolean> : {},
      tutorialSeen: parsed.tutorialSeen === true,
      sound: parsed.sound !== false,
      boosterCounts: parsed.boosterCounts && typeof parsed.boosterCounts === 'object' ? parsed.boosterCounts as Record<Booster, number> : { hammer: 3, line: 2, rainbow: 1 },
    };
  } catch {
    return { level: 1, unlocked: 1, bestScores: {} as Record<string, number>, completedLevels: {} as Record<string, boolean>, tutorialSeen: false, sound: true, boosterCounts: { hammer: 3, line: 2, rainbow: 1 } };
  }
}

function App() {
  const [save] = useState(readSave);
  const [level, setLevel] = useState(save.level);
  const [unlocked, setUnlocked] = useState(save.unlocked);
  const [bestScores, setBestScores] = useState<Record<string, number>>(save.bestScores);
  const [completedLevels, setCompletedLevels] = useState<Record<string, boolean>>(save.completedLevels);
  const [tutorialSeen, setTutorialSeen] = useState(save.tutorialSeen);
  const [mapChapter, setMapChapter] = useState(Math.floor((save.level - 1) / 10));
  const [showHelp, setShowHelp] = useState(false);
  const [sound, setSound] = useState(save.sound);
  const [board, setBoard] = useState<Candy[][]>(() => freshBoard());
  const [screen, setScreen] = useState<Screen>('intro');
  const [moves, setMoves] = useState(LEVELS[save.level - 1].moves);
  const [score, setScore] = useState(0);
  const [goalProgress, setGoalProgress] = useState(0);
  const [jelly, setJelly] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [hinted, setHinted] = useState<Pos[]>([]);
  const [message, setMessage] = useState('Make a match of 3 or more');
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState<string[]>([]);
  const [freshIds, setFreshIds] = useState<number[]>([]);
  const [juiceBursts, setJuiceBursts] = useState<JuiceBurst[]>([]);
  const burstSequence = useRef(0);
  const [impactPulse, setImpactPulse] = useState(0);
  const [swapMotion, setSwapMotion] = useState<Record<number, { x: number; y: number }>>({});
  const [boosterCounts, setBoosterCounts] = useState<Record<Booster, number>>(save.boosterCounts);
  const [armed, setArmed] = useState<Booster | null>(null);
  const [introBoosters, setIntroBoosters] = useState<Booster[]>(['hammer', 'line', 'rainbow']);
  const [equippedBoosters, setEquippedBoosters] = useState<Booster[]>(['hammer', 'line', 'rainbow']);
  const inputLock = useRef(false);
  const gameRun = useRef(0);
  const pointerStart = useRef<{ r: number; c: number; x: number; y: number } | null>(null);
  const suppressTap = useRef(false);
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
        match: [523, 659], cascade: [523, 659, 784], invalid: [180], win: [523, 659, 784, 1047], lose: [330, 247], special: [659, 784, 988]
      };
      notes[kind].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind === 'invalid' || kind === 'lose' ? 'triangle' : 'sine';
        const cascadeLift = kind === 'cascade' ? Math.min(1.42, 1 + Math.max(0, cascade - 1) * 0.105) : kind === 'special' ? 1.08 : 1;
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
    } catch { /* Audio is optional; gameplay must never depend on it. */ }
  }, [sound]);
  const triggerBurst = useCallback((keys: string[], kind: JuiceBurst['kind']) => {
    if (!keys.length) return;
    const cells = keys.map(key => posOf(key));
    const avgRow = cells.reduce((sum, cell) => sum + cell[0], 0) / cells.length;
    const avgCol = cells.reduce((sum, cell) => sum + cell[1], 0) / cells.length;
    const burst: JuiceBurst = {
      id: ++burstSequence.current,
      x: ((avgCol + 0.5) / SIZE) * 100,
      y: ((avgRow + 0.5) / SIZE) * 100,
      kind,
      strength: Math.min(1.7, 0.8 + keys.length / 10),
    };
    setJuiceBursts(old => [...old, burst]);
    window.setTimeout(() => setJuiceBursts(old => old.filter(item => item.id !== burst.id)), 560);
  }, []);

  const levelData = LEVELS[level - 1];
  const target = levelData.target;
  const progress = Math.min(100, score / target * 100);
  const stars = score >= target * 2.35 ? 3 : score >= target * 1.55 ? 2 : score >= target ? 1 : 0;
  const count = useMemo(() => board.flat().filter(Boolean).length, [board]);
  const best = bestScores[String(level)] || 0;
  const totalStars = useMemo(() => Object.entries(bestScores).reduce((sum, [levelNumber, bestScore]) => {
    // A high score from a failed attempt must not award campaign stars.
    if (!completedLevels[levelNumber]) return sum;
    const config = LEVELS[Number(levelNumber) - 1];
    if (!config) return sum;
    return sum + (bestScore >= config.target * 2.35 ? 3 : bestScore >= config.target * 1.55 ? 2 : bestScore >= config.target ? 1 : 0);
  }, 0), [bestScores, completedLevels]);
  const completedCount = Object.values(completedLevels).filter(Boolean).length;

  useEffect(() => {
    try { localStorage.setItem('jamshift-save', JSON.stringify({ level, unlocked, bestScores, completedLevels, tutorialSeen, sound, boosterCounts })); } catch { /* Storage may be disabled. */ }
  }, [level, unlocked, bestScores, completedLevels, tutorialSeen, sound, boosterCounts]);

  const startLevel = useCallback((requested = level, bonusMoves = 0) => {
    // Starting/restarting must recover even if an earlier animation left the lock stuck.
    gameRun.current += 1;
    inputLock.current = false;
    const safeLevel = Math.max(1, Math.min(unlocked, LEVEL_COUNT, requested));
    inputLock.current = false;
    setLevel(safeLevel);
    setBoard(freshBoard());
    setMoves(LEVELS[safeLevel - 1].moves + Math.max(0, bonusMoves));
    setScore(0);
    setGoalProgress(0);
    setJelly(LEVELS[safeLevel - 1].goalType === 'jelly' ? createJelly(safeLevel) : new Set());
    setSelected(null);
    setHinted([]);
    setClearing([]);
    setFreshIds([]);
    setJuiceBursts([]);
    setSwapMotion({});
    setImpactPulse(0);
    setArmed(null);
    setShowHelp(safeLevel === 1 && !tutorialSeen);
    if (safeLevel === 1 && !tutorialSeen) setTutorialSeen(true);
    setMessage(safeLevel === 1 ? 'Welcome! Swap neighbours to match 3 or more.' : safeLevel <= 4 ? 'Warm-up level: explore matches and cascades.' : 'Make a match of 3 or more');
    setBusy(false);
    setScreen('play');
    setEquippedBoosters([...introBoosters]);
    setIntroBoosters(['hammer', 'line', 'rainbow']);
  }, [level, unlocked, introBoosters, tutorialSeen]);

  const finishMove = (nextScore: number, nextMoves: number, levelAtMove: number, nextGoalProgress: number, nextJelly: Set<string>) => {
    const config = LEVELS[levelAtMove - 1];
    const goalComplete = config.goalType === 'score' ? nextScore >= config.target : config.goalType === 'collect' ? nextGoalProgress >= config.goalCount : nextJelly.size === 0;
    const finalScore = goalComplete ? nextScore + Math.max(0, nextMoves) * 100 : nextScore;
    setScore(finalScore);
    setMoves(nextMoves);
    setGoalProgress(nextGoalProgress);
    setJelly(new Set(nextJelly));
    setBestScores(old => ({ ...old, [String(levelAtMove)]: Math.max(old[String(levelAtMove)] || 0, finalScore) }));
    if (goalComplete) {
      playCue('win');
      setScreen('win');
      setUnlocked(old => Math.max(old, Math.min(LEVEL_COUNT, levelAtMove + 1)));
      setCompletedLevels(old => ({ ...old, [String(levelAtMove)]: true }));
      setMessage(nextMoves > 0 ? 'Level clear! +' + (nextMoves * 100).toLocaleString() + ' move bonus!' : 'Level complete! Beautifully played.');
    } else if (nextMoves <= 0) {
      playCue('lose');
      setScreen('lose');
      setMessage('Out of moves. Try a new strategy.');
    }
  };

  const resolveAnimated = async (startingBoard: Candy[][], initialMatches: Set<string>, startingScore: number, nextMoves: number, levelAtMove: number, runToken = gameRun.current) => {
    let current = clone(startingBoard);
    let scoreNow = startingScore;
    let goalNow = goalProgress;
    let jellyNow = new Set(jelly);
    let matches = new Set(initialMatches);
    let cascade = 0;
    let totalCleared = 0;
    while (matches.size && cascade < 30) {
      cascade++;
      const expanded = expandSpecials(current, matches);
      const config = LEVELS[levelAtMove - 1];
      if (config.goalType === 'collect') {
        for (const key of expanded) {
          const [r, c] = posOf(key);
          if (current[r]?.[c]?.color === config.goalColor) goalNow++;
        }
      }
      if (config.goalType === 'jelly') expanded.forEach(key => jellyNow.delete(key));
      setGoalProgress(goalNow);
      setJelly(new Set(jellyNow));
      setClearing(Array.from(expanded));
      setImpactPulse(value => value + 1);
      setMessage(cascade > 1 ? ['Sweet cascade!', 'Tasty chain!', 'Sugar rush!', 'Unstoppable!'][Math.min(3, cascade - 2)] : expanded.size >= 5 ? 'Sugar rush!' : 'Nice match!');
      const burstKind: JuiceBurst['kind'] = cascade > 1 ? 'cascade' : expanded.size >= 5 ? 'special' : 'match';
      triggerBurst(Array.from(expanded), burstKind);
      playCue(cascade > 1 ? 'cascade' : expanded.size >= 5 ? 'special' : 'match', sound, cascade);
      await sleep(expanded.size >= 5 ? 165 : 154);
      if (runToken !== gameRun.current) return;
      const dropped = dropMatches(current, expanded);
      totalCleared += expanded.size;
      scoreNow += expanded.size * 60 * Math.min(cascade, 6);
      current = dropped.board;
      setBoard(current);
      setClearing([]);
      setFreshIds(dropped.spawned);
      await sleep(210);
      if (runToken !== gameRun.current) return;
      setFreshIds([]);
      matches = findMatches(current);
    }
    if (matches.size) {
      current = shuffleBoard(current);
      setMessage('Board reshuffled for a fair move');
    } else if (!hasMove(current)) {
      setMessage('Shuffling for a new move…');
      await sleep(180);
      if (runToken !== gameRun.current) return;
      current = shuffleBoard(current);
    }
    if (runToken !== gameRun.current) return;
    setBoard(current);
    setClearing([]);
    setFreshIds([]);
    setSelected(null);
    const objectiveConfig = LEVELS[levelAtMove - 1];
    const objectiveMet = objectiveConfig.goalType === 'score'
      ? scoreNow >= objectiveConfig.target
      : objectiveConfig.goalType === 'collect'
        ? goalNow >= objectiveConfig.goalCount
        : jellyNow.size === 0;
    finishMove(scoreNow, nextMoves, levelAtMove, goalNow, jellyNow);
    if (totalCleared > 0 && nextMoves > 0 && !objectiveMet) {
      setMessage(cascade > 1 ? 'Cascade ×' + cascade + ' · +' + (scoreNow - startingScore) : '+' + (scoreNow - startingScore) + ' points');
    }
    setBusy(false);
    inputLock.current = false;
  };

  const swap = async (a: Pos, b: Pos) => {
    if (inputLock.current || screen !== 'play' || showHelp || Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return;
    inputLock.current = true;
    setHinted([]);
    const runToken = gameRun.current;
    const levelAtMove = level;
    const startScore = score;
    const startMoves = moves;
    const original = clone(board);
    const copy = clone(board);
    [copy[a[0]][a[1]], copy[b[0]][b[1]]] = [copy[b[0]][b[1]], copy[a[0]][a[1]]];
    const itemA = copy[a[0]][a[1]];
    const itemB = copy[b[0]][b[1]];
    let matches = findMatches(copy);
    const specialSwap = Boolean(itemA.special || itemB.special);
    if (!matches.size && !specialSwap) {
      setBusy(true);
      setSelected(null);
      setMessage('No match — try another swap');
      playCue('invalid');
      setSwapMotion({ [itemA.id]: { x: (b[1] - a[1]) * 100, y: (b[0] - a[0]) * 100 }, [itemB.id]: { x: (a[1] - b[1]) * 100, y: (a[0] - b[0]) * 100 } });
      setBoard(copy);
      await sleep(118);
      if (runToken !== gameRun.current) return;
      setBoard(original);
      setSwapMotion({});
      setBusy(false);
      inputLock.current = false;
      return;
    }
    setBusy(true);
    setSelected(null);
    setSwapMotion({ [itemA.id]: { x: (b[1] - a[1]) * 100, y: (b[0] - a[0]) * 100 }, [itemB.id]: { x: (a[1] - b[1]) * 100, y: (a[0] - b[0]) * 100 } });
    setBoard(copy);
    await sleep(132);
    if (runToken !== gameRun.current) return;
    setSwapMotion({});
    if (specialSwap) {
      const effect = applySpecialSwap(copy, a, b, matches);
      matches = effect.matches;
      if (effect.message) setMessage(effect.message);
    } else {
      buildSwapSpecial(copy, matches, a, b);
    }
    // Re-publish the board after special creation/conversion rather than relying on mutation.
    setBoard(copy);
    await resolveAnimated(copy, matches, startScore, startMoves - 1, levelAtMove, runToken).catch(() => {
      if (runToken === gameRun.current) { setBusy(false); inputLock.current = false; setMessage('Recovered from a puzzle hiccup. Try that move again.'); }
    });
  };

  const tapCandy = (r: number, c: number) => {
    if (suppressTap.current) { suppressTap.current = false; return; }
    if (inputLock.current || busy || screen !== 'play' || showHelp) return;
    setHinted([]);
    if (armed) {
      const booster = armed;
      if (!boosterCounts[booster]) { setArmed(null); return; }
      inputLock.current = true;
      const runToken = gameRun.current;
      setBusy(true);
      const working = clone(board);
      const chosen = working[r][c];
      const cleared = new Set<string>();
      if (booster === 'hammer') cleared.add(keyOf(r, c));
      if (booster === 'line') for (let x = 0; x < SIZE; x++) cleared.add(keyOf(r, x));
      if (booster === 'rainbow') for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (working[y][x].color === chosen.color) cleared.add(keyOf(y, x));
      setArmed(null);
      setBoosterCounts(old => ({ ...old, [booster]: Math.max(0, old[booster] - 1) }));
      void resolveAnimated(working, cleared, score, Math.max(0, moves - 1), level, runToken).catch(() => {
        if (runToken === gameRun.current) { setBusy(false); inputLock.current = false; setMessage('Recovered from a puzzle hiccup. Try that booster again.'); }
      });
      return;
    }
    if (!selected) { setSelected([r, c]); return; }
    if (selected[0] === r && selected[1] === c) { setSelected(null); return; }
    if (Math.abs(selected[0] - r) + Math.abs(selected[1] - c) === 1) void swap(selected, [r, c]);
    else setSelected([r, c]);
  };

  useEffect(() => {
    if (screen !== 'play') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowHelp(false); setSelected(null); setArmed(null); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') setSelected(old => old ?? [3, 3]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen]);

  const candy = (item: Candy, r: number, c: number) => (
    <button
      key={item.id}
      className={'candy ' + COLORS[item.color] + (swapMotion[item.id] ? ' swap-motion' : '') + (selected?.[0] === r && selected?.[1] === c ? ' chosen' : '') + (hinted.some(([hr, hc]) => hr === r && hc === c) ? ' hint-target' : '') + (clearing.includes(keyOf(r, c)) ? ' clearing' : '') + (freshIds.includes(item.id) ? ' falling' : '') + (jelly.has(keyOf(r, c)) ? ' jelly' : '') + (item.special ? ' ' + item.special : '')}
      style={swapMotion[item.id] ? ({ '--swap-x': `${swapMotion[item.id].x}%`, '--swap-y': `${swapMotion[item.id].y}%` } as React.CSSProperties) : undefined}
      onPointerDown={event => { pointerStart.current = { r, c, x: event.clientX, y: event.clientY }; }}
      onPointerUp={event => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start || busy || inputLock.current || screen !== 'play' || showHelp) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
        const nr = start.r + (Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 1 : -1) : 0);
        const nc = start.c + (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0);
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          suppressTap.current = true;
          setSelected(null);
          void swap([start.r, start.c], [nr, nc]);
        }
      }}
      onClick={() => tapCandy(r, c)}
      aria-label={COLORS[item.color] + (item.special ? ' ' + item.special.replace('-', ' ') : '') + ' candy row ' + (r + 1) + ' column ' + (c + 1)}
      aria-pressed={selected?.[0] === r && selected?.[1] === c}
      disabled={busy}
    >
      <span className="candy-shine" />
      {jelly.has(keyOf(r, c)) && <span className="jelly-glaze" aria-hidden="true" />}
      <span className="candy-face">{item.special === 'striped-h' ? '↔' : item.special === 'striped-v' ? '↕' : item.special === 'wrapped' ? '✹' : item.special === 'color' ? '✧' : GLYPHS[item.color]}</span>
    </button>
  );

  return (
    <main className="game-shell">
      <header className="game-header">
        <button className="round-btn" onClick={() => { setMapChapter(Math.floor((level - 1) / 10)); setScreen('map'); }} aria-label="Open level map">‹</button>
        <div className="logo"><span className="logo-candy">✿</span><span>JAM<span className="logo-shift">SHIFT</span></span><small>SWEET LITTLE PUZZLES</small></div>
        <button className="round-btn" onClick={() => setSound(value => !value)} aria-label="Toggle sound effects" aria-pressed={sound}>{sound ? '♫' : '♪'}</button>
      </header>

      {screen === 'intro' && (
        <section className="level-card">
          <div className="cloud-title"><span>LEVEL {String(level).padStart(2, '0')}</span></div>
          <div className="star-row">{[1, 2, 3].map(n => <span key={n} className={(completedLevels[String(level)] && best >= target * [0, 1, 1.55, 2.35][n] ? 'earned' : '')}>{'★'}</span>)}</div>
          <div className="target-ribbon"><span className="ribbon-star">★</span><div><small>LEVEL GOAL</small><strong>{levelData.goalType === 'score' ? target.toLocaleString() + ' points' : levelData.goalType === 'collect' ? 'Collect ' + levelData.goalCount + ' ' + COLORS[levelData.goalColor] : 'Clear ' + createJelly(level).size + ' jelly'}</strong><small>{levelData.moves} moves · best {best.toLocaleString()}</small></div></div>
          <p className="booster-title">Choose your boosters</p>
          <div className="boosters">
            {([{ id: 'hammer', emoji: '🔨', label: 'Hammer' }, { id: 'line', emoji: '💥', label: 'Row blast' }, { id: 'rainbow', emoji: '🌈', label: 'Color pop' }] as const).map(({ id, emoji, label }) => (
              <button key={id} aria-label={label} aria-pressed={introBoosters.includes(id)} className={'booster ' + (introBoosters.includes(id) ? 'active' : '')} onClick={() => setIntroBoosters(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])}>
                <span>{emoji}</span><b>{introBoosters.includes(id) ? '✓' : boosterCounts[id]}</b>
              </button>
            ))}
          </div>
          <p className="booster-note">Equip the power-ups you want. Each used booster costs one move and one charge.</p>
          <button className="play-button" onClick={() => startLevel()}>Play level {level}!</button>
          <button className="secondary-button map-open" onClick={() => { setMapChapter(Math.floor((level - 1) / 10)); setScreen('map'); }}>Explore level map</button>
          <p className="fineprint">CHAPTER {levelData.chapter} · {levelData.chapterName}<br />{level <= 4 ? 'Warm-up stage · generous moves to learn the game' : level <= 12 ? 'Build combos · special candies make big clears' : 'Challenge stage · plan moves around your objective'}<br />Best score {best.toLocaleString()} · Progress saved on this device</p>
        </section>
      )}

      {screen === 'map' && (
        <section className="level-card level-map-card">
          <div className="cloud-title"><span>SWEET MAP</span></div>
          <p className="booster-title">Your puzzle journey</p>
          <p className="booster-note">Complete a level to unlock the next one.</p>
          <div className="map-chapter-nav">
            <button className="chapter-arrow" aria-label="Previous chapter" disabled={mapChapter === 0} onClick={() => setMapChapter(value => Math.max(0, value - 1))}>‹</button>
            <div className="chapter-heading"><strong>CHAPTER {mapChapter + 1} / 10</strong><span>{LEVELS[mapChapter * 10].chapterName}</span></div>
            <button className="chapter-arrow" aria-label="Next chapter" disabled={mapChapter === 9} onClick={() => setMapChapter(value => Math.min(9, value + 1))}>›</button>
          </div>
          <div className="map-progress"><span>★ {totalStars} / 300 stars</span><span>{completedCount} / 100 levels cleared</span></div>
          <div className="level-map-grid">
            {Array.from({ length: 10 }, (_, i) => mapChapter * 10 + i + 1).map(n => (
              <button key={n} className={'map-level ' + (n === level ? 'current' : '') + (n > unlocked ? ' locked' : '') + ((completedLevels[String(n)] || n < unlocked) ? ' completed' : '')} disabled={n > unlocked} onClick={() => { setLevel(n); setScreen('intro'); }}>
                <span>{n > unlocked ? '🔒' : completedLevels[String(n)] || n < unlocked ? '★' : n}</span>
              </button>
            ))}
          </div>
          <button className="play-button" onClick={() => setScreen('intro')}>Back to level</button>
        </section>
      )}

      {(screen === 'play' || screen === 'win' || screen === 'lose') && (
        <>
          <section className="hud">
            <div className="hud-chip"><small>LEVEL</small><strong>{String(level).padStart(2, '0')}</strong></div>
            <div className="score-block"><div className="score-label"><span>SCORE</span><strong>{score.toLocaleString()}</strong></div><div className="score-track"><span style={{ width: progress + '%' }} /></div><div className="star-mini">{[1, 2, 3].map(n => <span key={n} className={stars >= n ? 'earned' : ''}>★</span>)}</div></div>
            <div className="moves-chip"><small>MOVES LEFT</small><strong>{moves}</strong></div>
          </section>
          <div className="goal-line"><span className="goal-icon">{levelData.goalType === 'jelly' ? '▧' : levelData.goalType === 'collect' ? GLYPHS[levelData.goalColor] : '★'}</span><span>{levelData.goalType === 'score' ? <>Reach <b>{target.toLocaleString()}</b> points</> : levelData.goalType === 'collect' ? <>Collect <b>{Math.max(0, levelData.goalCount - goalProgress)}</b> {COLORS[levelData.goalColor]} candies</> : <>Clear <b>{jelly.size}</b> jelly tiles</>}</span><span className="goal-pips">{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < (levelData.goalType === 'score' ? Math.min(5, Math.floor(progress / 20)) : levelData.goalType === 'collect' ? Math.min(5, Math.floor(goalProgress / levelData.goalCount * 5)) : Math.min(5, Math.floor((createJelly(level).size - jelly.size) / createJelly(level).size * 5))) ? 'lit' : ''} />)}</span></div>
          <div className="game-board-wrap">
            <div className="board-top"><span>CHAPTER {levelData.chapter} · {levelData.chapterName.toUpperCase()}</span><span>Swap neighbours to match</span></div>
            <JuiceBurstLayer effects={juiceBursts} />
            <div className={'candy-board' + (busy ? ' resolving' : '') + (impactPulse % 2 ? ' juice-impact-a' : ' juice-impact-b')}>{board.map((row, r) => <div className="candy-row" key={r}>{row.map((item, c) => candy(item, r, c))}</div>)}</div>
            <div className="board-bottom"><span>✿ Match 3 or more</span><span>{count} candies in play</span></div>
          </div>
          <div className="power-row">
            {([{ id: 'hammer', emoji: '🔨', label: 'Hammer' }, { id: 'line', emoji: '💥', label: 'Row blast' }, { id: 'rainbow', emoji: '🌈', label: 'Color pop' }] as const).map(({ id, emoji, label }) => (
              <button key={id} className={'power-button ' + (armed === id ? 'armed' : '')} aria-label={label + ', ' + boosterCounts[id] + ' charges'} aria-pressed={armed === id} disabled={!boosterCounts[id] || !equippedBoosters.includes(id) || busy} onClick={() => { setArmed(armed === id ? null : id); setSelected(null); setMessage('Tap a candy to use ' + label.toLowerCase() + '.'); }}>
                <span>{emoji}</span><b>{boosterCounts[id]}</b>
              </button>
            ))}
          </div>
          <div className="game-actions">
            <button className="small-action" onClick={() => { setSelected(null); setHinted([]); setArmed(null); setShowHelp(true); }}>ⓘ How to play</button>
            <div key={message} className="status-message" role="status" aria-live="polite">{message}</div>
            <button className="small-action" onClick={() => {
              const move = findBestMove(board, levelData.goalType, levelData.goalColor, jelly);
              if (!move) { setHinted([]); setMessage('No move found — the board will reshuffle.'); return; }
              setHinted(move);
              setSelected(null);
              setMessage('Best move: swap the two glowing candies to progress your goal.');
            }}>✦ Hint</button>
            <button className="small-action" onClick={() => startLevel()}>↻ Restart</button>
          </div>
        </>
      )}

      {showHelp && screen === 'play' && <div className="help-overlay" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <section className="help-card">
          <div className="help-mascot">🍬</div>
          <span className="result-kicker">QUICK GUIDE</span>
          <h2 id="help-title">How to play</h2>
          <ol className="help-steps">
            <li><b>Swap neighbours.</b><span>Tap one candy, then an adjacent candy — or swipe to move it.</span></li>
            <li><b>Match 3 or more.</b><span>Four in a row makes a stripe; five makes a color candy. T/L shapes can make a wrapped candy.</span></li>
            <li><b>Play the objective.</b><span>Watch the goal above the board. Score, collect the target color, or clear every jelly tile before moves run out.</span></li>
            <li><b>Use power-ups wisely.</b><span>Tap a power-up, then a candy. It costs one move and one charge.</span></li>
          </ol>
          <button className="play-button" onClick={() => setShowHelp(false)}>Got it — let's play!</button>
        </section>
      </div>}

      {screen === 'win' && <div className="result-overlay"><div className="result-card"><div className="mascot">🍓</div><span className="result-kicker">LEVEL COMPLETE!</span><h2>Sweet victory!</h2><div className="result-stars">{[1, 2, 3].map(n => <span key={n} className={stars >= n ? 'earned' : ''}>★</span>)}</div><p>You scored {score.toLocaleString()} points!</p><button className="play-button" onClick={() => { if (level < LEVEL_COUNT) startLevel(level + 1); else setScreen('map'); }} disabled={level >= LEVEL_COUNT}>Next level</button><button className="secondary-button" onClick={() => { setMapChapter(Math.floor((level - 1) / 10)); setScreen('map'); }}>Level map</button></div></div>}
      {screen === 'lose' && <div className="result-overlay"><div className="result-card lose-card"><div className="mascot">🥺</div><span className="result-kicker">OH, SUGAR!</span><h2>Out of moves!</h2><p>You scored {score.toLocaleString()} of {target.toLocaleString()} points. Try a different strategy.</p><button className="play-button" onClick={() => startLevel(level, 3)}>Retry with +3 moves</button><button className="secondary-button" onClick={() => { setMapChapter(Math.floor((level - 1) / 10)); setScreen('map'); }}>Level map</button></div></div>}

      <footer className="game-footer"><span>JAM SHIFT <b>✦</b> PUZZLE CLUB</span><span>MADE FOR HAPPY BRAINS</span><button onClick={() => setSound(value => !value)}>{sound ? '♫ SFX on' : '♪ SFX off'}</button></footer>
    </main>
  );
}
export default App;
