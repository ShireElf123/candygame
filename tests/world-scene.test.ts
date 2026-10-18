import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WorldScene from '../src/components/WorldScene';

describe('chapter map scenery', () => {
  it('uses original theme palettes and an accessible decorative scene', () => {
    const sugar = renderToStaticMarkup(createElement(WorldScene, { chapter: 0 }));
    const frost = renderToStaticMarkup(createElement(WorldScene, { chapter: 7 }));
    expect(sugar).toContain('aria-hidden="true"');
    expect(sugar).toContain('stroke-dasharray="2 10"');
    expect(sugar).toContain('stop-color="#9bdbec"');
    expect(frost).toContain('stop-color="#9bdcf2"');
    expect(sugar).not.toEqual(frost);
  });

  it('keeps SVG gradient IDs unique across rendered chapters', () => {
    const html = renderToStaticMarkup(createElement('div', null,
      createElement(WorldScene, { chapter: 0 }),
      createElement(WorldScene, { chapter: 9 }),
    ));
    const ids = [...html.matchAll(/<(?:linearGradient) id="([^"]+)"/g)].map(match => match[1]);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });
});
