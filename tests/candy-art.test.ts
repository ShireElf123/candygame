import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CandyArt from '../src/components/CandyArt';

function markup(color: number, special?: 'striped-h' | 'striped-v' | 'wrapped' | 'color') {
  return renderToStaticMarkup(createElement(CandyArt, { color, special }));
}

describe('Jam Shift candy artwork', () => {
  it('renders six distinct, accessible vector candy silhouettes', () => {
    const shapeClasses = ['grapes', 'lemon', 'berry', 'mint', 'blueberry', 'orange'];
    shapeClasses.forEach((shape, color) => {
      const html = markup(color);
      expect(html).toContain(`candy-shape-${shape}`);
      expect(html).toContain('viewBox="0 0 48 48"');
      expect(html).toContain('focusable="false"');
    });
  });

  it('renders orientation-specific stripes and a separate wrapped/cosmic treatment', () => {
    expect(markup(0, 'striped-h')).toContain('candy-art-stripes-horizontal');
    expect(markup(1, 'striped-v')).toContain('candy-art-stripes-vertical');
    expect(markup(2, 'wrapped')).toContain('candy-art-wrap');
    expect(markup(3, 'color')).toContain('candy-color-bomb');
  });
});
