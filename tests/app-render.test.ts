import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('Jam Shift game shell', () => {
  it('renders a game-first title screen without relying on browser-only APIs', () => {
    const html = renderToString(createElement(App)).replaceAll('<!-- -->', '');
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
});
