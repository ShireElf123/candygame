import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

describe('Jam Shift game shell', () => {
  it('renders a game-first title screen without relying on browser-only APIs', () => {
    const html = renderToString(createElement(App)).replace(/<!-- -->/g, '');
    expect(html).toContain('intro-topline');
    expect(html).toContain('hero-preview-board');
    expect(html).toContain('Make a little');
    expect(html).toContain('candy-art');
    expect(html).toContain('character-art');
    expect(html).toContain('Play level 01');
    expect(html).toContain('YOUR JOURNEY');
    expect(html).toContain('Explore the world map');
    expect(html).not.toContain('YOUR PUZZLE PORTAL');
  });

  it('exposes names for decorative counters and labeled UI groups with semantic roles', () => {
    const html = renderToString(createElement(App));
    expect(html).toContain('class="header-star-count" role="img" aria-label="0 campaign stars"');
    expect(html).toContain('class="intro-stars" role="img" aria-label="0 campaign stars"');
    expect(appSource).toContain('className="level-map-grid" role="group" aria-label=');
    expect(appSource).toContain('className="detail-stars" role="group" aria-label=');
    expect(appSource).toContain('className="score-stars" role="img" aria-label=');
    expect(appSource).toContain('className="result-stars" role="img" aria-label=');
  });
});
