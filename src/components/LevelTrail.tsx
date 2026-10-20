import type { CSSProperties } from 'react';
import {
  GLYPHS,
  LEVELS,
  LEVELS_PER_CHAPTER,
  type GoalType,
  type LevelDefinition,
} from '../game/engine';
import { starsForScore } from '../game/progress';

export type LevelTrailProps = {
  chapter: number;
  unlocked: number;
  currentLevel: number;
  selectedLevel: number | null;
  completedLevels: Record<string, boolean>;
  bestWinScores: Record<string, number>;
  onSelectLevel: (level: number) => void;
};

const TRAIL_POINTS = [
  { x: 92, y: 292 },
  { x: 292, y: 153 },
  { x: 500, y: 115 },
  { x: 708, y: 153 },
  { x: 908, y: 292 },
  { x: 908, y: 370 },
  { x: 708, y: 315 },
  { x: 500, y: 360 },
  { x: 292, y: 315 },
  { x: 92, y: 370 },
] as const;

const TRAIL_PATH = [
  'M 92 292',
  'C 150 262, 204 171, 292 153',
  'C 354 135, 424 115, 500 115',
  'C 576 115, 646 135, 708 153',
  'C 796 171, 850 262, 908 292',
  'C 940 307, 940 356, 908 370',
  'C 860 382, 774 315, 708 315',
  'C 646 315, 576 360, 500 360',
  'C 424 360, 354 315, 292 315',
  'C 204 315, 142 350, 92 370',
].join(' ');

const GOAL_MARKS: Record<GoalType, string> = {
  score: '✦',
  collect: '●',
  jelly: '▧',
  boss: '★',
  shell: '✧',
  special: '⚡',
  ingredient: '↓',
  cascade: '⤴',
};

const GOAL_NAMES: Record<GoalType, string> = {
  score: 'score goal',
  collect: 'candy collection',
  jelly: 'jelly clearing',
  boss: 'boss battle',
  shell: 'sugar-shell clearing',
  special: 'special-candy activation',
  ingredient: 'jam-jar delivery',
  cascade: 'cascade chain',
};

export function chapterTrailProgress(chapter: number, completedLevels: Record<string, boolean>): number {
  const firstLevel = chapter * LEVELS_PER_CHAPTER + 1;
  let consecutiveClears = 0;
  for (let offset = 0; offset < LEVELS_PER_CHAPTER; offset += 1) {
    if (!completedLevels[String(firstLevel + offset)]) break;
    consecutiveClears += 1;
  }
  return Math.round((consecutiveClears / LEVELS_PER_CHAPTER) * 100);
}

function objectiveMark(level: LevelDefinition, type: GoalType, color?: number): string {
  if (type === 'collect') return GLYPHS[color ?? level.goalColor];
  return GOAL_MARKS[type];
}

function objectiveLabel(level: LevelDefinition): string {
  return level.objectives.map(objective => GOAL_NAMES[objective.type]).join(' and ');
}

export default function LevelTrail({
  chapter,
  unlocked,
  currentLevel,
  selectedLevel,
  completedLevels,
  bestWinScores,
  onSelectLevel,
}: LevelTrailProps) {
  const firstLevel = chapter * LEVELS_PER_CHAPTER + 1;
  const progress = chapterTrailProgress(chapter, completedLevels);
  const chapterName = LEVELS[firstLevel - 1]?.chapterName ?? `World ${chapter + 1}`;

  return (
    <div className="level-trail" data-chapter={chapter + 1} data-progress={progress} role="group" aria-label={`${chapterName} level trail`}>
      <svg className="level-trail-art" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="level-trail-shadow" d={TRAIL_PATH} />
        <path className="level-trail-base" d={TRAIL_PATH} />
        <path className="level-trail-stitches" d={TRAIL_PATH} />
        <path className="level-trail-progress" d={TRAIL_PATH} pathLength="100" strokeDasharray={`${progress} 100`} />
      </svg>
      {TRAIL_POINTS.map((point, index) => {
        const number = firstLevel + index;
        const level = LEVELS[number - 1];
        if (!level) return null;
        const isLocked = number > unlocked;
        const isComplete = Boolean(completedLevels[String(number)]);
        const stars = starsForScore(bestWinScores[String(number)] || 0, level.target);
        const isCurrent = number === currentLevel && !isComplete;
        const label = [
          `Level ${number}`,
          isCurrent ? 'current level' : '',
          level.boss ? 'chapter boss finale' : '',
          isLocked ? 'locked' : isComplete ? `completed with ${stars} stars` : 'available',
          `objective: ${objectiveLabel(level)}`,
        ].filter(Boolean).join(', ');
        const style = {
          left: `${point.x / 10}%`,
          top: `${point.y / 4.2}%`,
        } as CSSProperties;
        return (
          <button
            key={number}
            type="button"
            className={`map-level level-trail-node ${number === selectedLevel ? 'is-selected' : ''} ${isComplete ? 'is-complete' : ''} ${isLocked ? 'is-locked' : ''} ${level.boss ? 'is-boss-level' : ''} ${level.objectives.length > 1 ? 'is-mixed-level' : ''}`}
            style={style}
            data-level={number}
            disabled={isLocked}
            aria-label={label}
            aria-pressed={number === selectedLevel}
            onClick={() => onSelectLevel(number)}
          >
            <span className="map-level-number">{isLocked ? <span className="lock-symbol">⌑</span> : String(number).padStart(2, '0')}</span>
            <span className="trail-objective-marks" aria-hidden="true">
              {level.objectives.map((objective, goalIndex) => (
                <span key={`${objective.type}-${goalIndex}`} className={`trail-objective-mark trail-objective-${objective.type}`}>
                  {objectiveMark(level, objective.type, objective.color)}
                </span>
              ))}
            </span>
            {isCurrent && <span className="map-level-current" aria-hidden="true">YOU</span>}
            {level.boss && <span className="map-boss-marker" aria-hidden="true">✦ BOSS</span>}
            {isComplete && <span className="map-node-stars" aria-hidden="true">{[1, 2, 3].map(star => <i key={star} className={stars >= star ? 'on' : ''} />)}</span>}
          </button>
        );
      })}
    </div>
  );
}
