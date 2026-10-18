import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('Jam Shift portal shell', () => {
  it('renders the campaign hub without relying on browser-only APIs', () => {
    const html = renderToString(createElement(App)).replaceAll('<!-- -->', '');
    expect(html).toContain('Make a little');
    expect(html).toContain('Play level 01');
    expect(html).toContain('YOUR JOURNEY');
    expect(html).toContain('Explore the world map');
  });
});
