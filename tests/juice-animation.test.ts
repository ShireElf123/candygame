import { readFileSync } from 'node:fs';
import postcss, { type Declaration, type Rule } from 'postcss';
import { createSourceFile, forEachChild, isJsxElement, isJsxSelfClosingElement, ScriptKind, ScriptTarget, type Node } from 'typescript';
import { describe, expect, it } from 'vitest';

const juiceCss = readFileSync(new URL('../src/juice.css', import.meta.url), 'utf8');
const juiceStyles = postcss.parse(juiceCss);
const boardStyles = postcss.parse(readFileSync(new URL('../src/pro.css', import.meta.url), 'utf8'));
const experienceStyles = postcss.parse(readFileSync(new URL('../src/experience-polish.css', import.meta.url), 'utf8'));
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const appAst = createSourceFile('App.tsx', appSource, ScriptTarget.Latest, true, ScriptKind.TSX);
const interactionStates = ['swap-motion', 'swap-rejected', 'clearing', 'falling', 'chosen', 'hint-target'];

function findAnimationRule(selectorPrefix: string): Rule | undefined {
  let found: Rule | undefined;
  juiceStyles.walkRules(rule => {
    if (rule.selector.startsWith(selectorPrefix) && rule.nodes.some(node => node.type === 'decl' && node.prop === 'animation')) {
      found = rule;
    }
  });
  return found;
}

function findBurstLayerParent(): string | undefined {
  let parentOpeningTag: string | undefined;
  const visit = (node: Node) => {
    if (isJsxSelfClosingElement(node) && node.tagName.getText(appAst) === 'JuiceBurstLayer') {
      let parent = node.parent;
      while (parent && !isJsxElement(parent)) parent = parent.parent;
      if (parent) parentOpeningTag = parent.openingElement.getText(appAst);
    }
    forEachChild(node, visit);
  };
  visit(appAst);
  return parentOpeningTag;
}

describe('candy interaction animation precedence', () => {
  it.each(['wrapped', 'color'])('%s idle animation yields to every interaction state', special => {
    const rule = findAnimationRule(`.candy.${special}:not(.swap-motion)`);
    expect(rule).toBeDefined();

    for (const state of interactionStates) {
      expect(rule?.selector).toContain(`:not(.${state})`);
    }
  });
});

describe('candy layer promotion', () => {
  it('avoids promoting every resting candy and reserves will-change for the two-tile swap', () => {
    let restingWillChange: Declaration | undefined;
    let clearingWillChange: Declaration | undefined;
    let swapWillChange: Declaration | undefined;
    juiceStyles.walkRules(rule => {
      if (rule.selector === '.candy') {
        restingWillChange = rule.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'will-change');
      }
      if (rule.selector === '.candy.clearing') {
        clearingWillChange = rule.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'will-change');
      }
      if (rule.selector === '.candy.swap-motion,\n.candy.swap-rejected') {
        swapWillChange = rule.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'will-change');
      }
    });
    expect(restingWillChange).toBeUndefined();
    expect(clearingWillChange).toBeUndefined();
    expect(swapWillChange?.value).toBe('transform');
  });
});

describe('board touch accessibility', () => {
  it('keeps one-finger swipe input while allowing browser pinch zoom', () => {
    let touchAction: Declaration | undefined;
    boardStyles.walkRules('.candy-board', rule => {
      const declaration = rule.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'touch-action');
      if (declaration) touchAction = declaration;
    });
    expect(touchAction?.value).toBe('pinch-zoom');
  });
});

describe('responsive game text', () => {
  it('keeps core gameplay labels at a scalable 10px minimum', () => {
    let readableRule: Rule | undefined;
    experienceStyles.walkRules(rule => {
      if (rule.selector.includes('.level-hud-kicker') && rule.selector.includes('.utility-button')) readableRule = rule;
    });
    const fontSize = readableRule?.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'font-size');
    expect(fontSize?.value).toBe('max(0.72rem, 10px)');
    expect(readableRule?.selector).toContain('.status-message');
    expect(readableRule?.selector).toContain('.powerup-label b');
  });
});

describe('match feedback positioning', () => {
  it('anchors the burst layer inside the same candy board used for its cell percentages', () => {
    expect(findBurstLayerParent()).toContain('candy-board');
  });

  it('uses the board content inset instead of viewport-specific guessed offsets', () => {
    let effectsRule: Rule | undefined;
    juiceStyles.walkRules('.juice-effects', rule => { effectsRule = rule; });
    const inset = effectsRule?.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'inset');
    const overflow = effectsRule?.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'overflow');
    expect(inset?.value).toBe('var(--juice-effects-inset, 6px)');
    expect(overflow?.value).toBe('visible');
  });
});
