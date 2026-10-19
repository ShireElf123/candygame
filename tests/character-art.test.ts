import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CharacterArt from '../src/components/CharacterArt';

describe('original character portraits', () => {
  it('renders the guide and boss silhouettes as accessible decorative SVGs', () => {
    const buddy = renderToString(createElement(CharacterArt));
    const boss = renderToString(createElement(CharacterArt, { kind: 'boss', mood: 'dazed', color: '#ef639a' }));

    expect(buddy).toContain('character-art');
    expect(buddy).toContain('character-leaves');
    expect(buddy).toContain('character-glint');
    expect(buddy).toContain('aria-hidden="true"');
    expect(boss).toContain('character-horns');
    expect(boss).toContain('✦');
  });
});
