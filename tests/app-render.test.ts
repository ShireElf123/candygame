import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

afterEach(() => vi.unstubAllGlobals());

describe('Jam Shift game shell', () => {
  it('renders a game-first title screen without relying on browser-only APIs', () => {
    const html = renderToString(createElement(App)).replace(/<!-- -->/g, '');
    expect(html).toContain('intro-topline');
    expect(html).toContain('hero-preview-board');
    expect(html).toContain('Make a little');
    expect(html).toContain('candy-art');
    expect(html).toContain('character-art');
    expect(html).toContain('Play level 01');
    expect(html).toContain('across 120 playful puzzles');
    expect(html).toContain('Install Jam Shift');
    expect(html).toContain('YOUR JOURNEY');
    expect(html).toContain('Explore the world map');
    expect(html).not.toContain('YOUR PUZZLE PORTAL');
    expect(html).not.toContain('playtest-mode-banner');
  });

  it('opens the requested level in a visibly isolated development playtest session', () => {
    vi.stubGlobal('window', { location: { search: '?playtest=79' } });
    const html = renderToString(createElement(App)).replace(/<!-- -->/g, '');
    expect(html).toContain('playtest-mode-banner');
    expect(html).toContain('progress will not be saved');
    expect(html).toContain('Playtest progress is temporary');
    expect(html).toContain('Play level 79');
    expect(html).toContain('aria-label="Level 79"');
    expect(html).not.toContain('Level 79, locked');
  });

  it('routes development shape-lab URLs to the isolated six-layout playtest', () => {
    vi.stubGlobal('window', { location: { search: '?shapelab=6', pathname: '/' } });
    const html = renderToString(createElement(App)).replace(/<!-- -->/g, '');
    expect(html).toContain('Board Shape Lab');
    expect(html).toContain('DEVELOPMENT ONLY');
    expect(html).toContain('Pocket Current');
    expect(html).toContain('32');
    expect(html).toContain('850');
    expect(html).toContain('shape-lab-void');
    expect(html).toContain('reduced-motion settings');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('nothing is uploaded');
    expect(html).toContain('Choose the actual result');
    expect(html).not.toContain('Progress saved on this device');
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
