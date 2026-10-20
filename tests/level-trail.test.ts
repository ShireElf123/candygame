import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LevelTrail, { chapterTrailProgress } from '../src/components/LevelTrail';

describe('chapter level trail', () => {
  it('shows ten accessible route stops with locked, current, complete, and mixed-goal states', () => {
    const html = renderToStaticMarkup(createElement(LevelTrail, {
      chapter: 0,
      unlocked: 4,
      currentLevel: 3,
      selectedLevel: 3,
      completedLevels: { '1': true, '2': true },
      bestWinScores: { '1': 3000 },
      onSelectLevel: () => undefined,
    }));

    expect(html.match(/class="map-level level-trail-node/g)).toHaveLength(10);
    expect(html).toContain('aria-label="Sugar Garden level trail"');
    expect(html).toContain('Level 3, current level, available, objective: score goal');
    expect(html).toContain('Level 10, chapter boss finale, locked, objective: boss battle');
    expect(html).toContain('data-progress="20"');
    expect(html).toContain('trail-objective-score');
    expect(html).toContain('is-mixed-level');
    expect(html).toContain('disabled=""');
  });

  it('puts secondary goals on the route node and makes the SVG path follow completion', () => {
    const html = renderToStaticMarkup(createElement(LevelTrail, {
      chapter: 7,
      unlocked: 80,
      currentLevel: 79,
      selectedLevel: 79,
      completedLevels: {},
      bestWinScores: {},
      onSelectLevel: () => undefined,
    }));

    expect(html).toContain('Level 79, current level, available, objective: jelly clearing and score goal');
    expect(html).toContain('trail-objective-jelly');
    expect(html).toContain('trail-objective-score');
    expect(html).toContain('stroke-dasharray="0 100"');
    expect(html).toContain('level-trail-stitches');
  });

  it('tracks only consecutive clears and caps a complete chapter at the end of the path', () => {
    expect(chapterTrailProgress(0, {})).toBe(0);
    expect(chapterTrailProgress(0, { '1': true, '2': true, '4': true })).toBe(20);
    expect(chapterTrailProgress(0, Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index + 1), true])))).toBe(100);
    expect(chapterTrailProgress(1, Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index + 11), true])))).toBe(100);
  });
});
