import { readFileSync } from 'node:fs';
import postcss, { type Declaration } from 'postcss';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { boardImpactClass, fallAnimationDuration, GAME_MOTION, prefersReducedMotion } from '../src/game/motion';

const juiceStyles = postcss.parse(readFileSync(new URL('../src/juice.css', import.meta.url), 'utf8'));
const experienceStyles = postcss.parse(readFileSync(new URL('../src/experience-polish.css', import.meta.url), 'utf8'));
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

afterEach(() => vi.unstubAllGlobals());

function animationFor(selector: string): string | undefined {
  let animation: string | undefined;
  juiceStyles.walkRules(rule => {
    if (rule.selector !== selector) return;
    const declaration = rule.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'animation');
    if (declaration) animation = declaration.value;
  });
  return animation;
}

function mobilePlayingPowerupDeclaration(property: string): string | undefined {
  let value: string | undefined;
  experienceStyles.walkAtRules('media', media => {
    if (media.params !== '(max-width: 760px)') return;
    media.walkRules(rule => {
      if (rule.selector !== '.app-shell.is-playing .powerups-card') return;
      const declaration = rule.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === property);
      if (declaration) value = declaration.value;
    });
  });
  return value;
}

function keyframeProperties(name: string): Set<string> {
  const properties = new Set<string>();
  juiceStyles.walkAtRules('keyframes', keyframes => {
    if (keyframes.params === name) keyframes.walkDecls(declaration => { properties.add(declaration.prop); });
  });
  return properties;
}

function firstKeyframeTransform(name: string): string | undefined {
  let value: string | undefined;
  juiceStyles.walkAtRules('keyframes', keyframes => {
    if (keyframes.params !== name) return;
    keyframes.walkRules('0%', rule => {
      const declaration = rule.nodes.find((node): node is Declaration => node.type === 'decl' && node.prop === 'transform');
      if (declaration) value = declaration.value;
    });
  });
  return value;
}

describe('motion preference', () => {
  it('reads the browser reduced-motion preference', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('window', { matchMedia });

    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
});

describe('responsive gameplay motion timings', () => {
  it('does not shake the board before an actual match impact', () => {
    expect(boardImpactClass(0)).toBeNull();
    expect(boardImpactClass(1)).toBe('juice-impact-a');
    expect(boardImpactClass(2)).toBe('juice-impact-b');
  });

  it('wires the guarded board impact class into the rendered board', () => {
    expect(appSource).toContain('const boardImpact = boardImpactClass(impactPulse);');
    expect(appSource).toContain("${boardImpact ? ` ${boardImpact}` : ''}");
  });

  it('awaits every gameplay animation by the class and CSS keyframe name', () => {
    expect(appSource).toContain("await waitForBoardAnimation('.candy.swap-motion', 'candy-swap', controller)");
    expect(appSource).toContain("await waitForBoardAnimation('.candy.swap-rejected', 'candy-reject', controller)");
    expect(appSource).toContain("await waitForBoardAnimation('.candy.clearing', 'candy-pop', controller)");
    expect(appSource).toContain("await waitForBoardAnimation('.candy.falling', 'candy-fall', controller)");
  });

  it('keeps CSS animation names and durations synchronized with the timing contract', () => {
    expect(animationFor('.candy.swap-motion')).toContain(`candy-swap ${GAME_MOTION.swapAnimationMs}ms`);
    expect(animationFor('.candy.swap-rejected')).toContain(`candy-reject ${GAME_MOTION.rejectAnimationMs}ms`);
    expect(animationFor('.candy.clearing')).toContain(`candy-pop ${GAME_MOTION.clearAnimationMs}ms`);
    expect(animationFor('.candy-board.juice-impact-a')).toContain(`board-impact-a ${GAME_MOTION.clearAnimationMs}ms`);
    expect(animationFor('.candy-board.juice-impact-b')).toContain(`board-impact-b ${GAME_MOTION.clearAnimationMs}ms`);
  });

  it('uses pixel offsets for swaps and falls so grid gaps are included', () => {
    expect(firstKeyframeTransform('candy-swap')).toContain('var(--swap-x, 0px)');
    expect(firstKeyframeTransform('candy-swap')).toContain('var(--swap-y, 0px)');
    expect(firstKeyframeTransform('candy-fall')).toContain('var(--fall-x, 0px)');
    expect(firstKeyframeTransform('candy-fall')).toContain('var(--fall-y, -40px)');
  });

  it('uses a readable, explicit basic-move timing budget rather than an ultra-short target', () => {
    const basicMoveMs = GAME_MOTION.swapAnimationMs + GAME_MOTION.clearAnimationMs + fallAnimationDuration(1);
    expect(basicMoveMs).toBe(407);
    expect(basicMoveMs).toBeLessThanOrEqual(450);
    expect(GAME_MOTION.clearAnimationMs + GAME_MOTION.fallMaxMs).toBeLessThanOrEqual(400);
  });

  it('keeps candy fall timing proportional for short drops and caps long drops', () => {
    expect(animationFor('.candy.falling')).toContain(`var(--fall-duration, ${fallAnimationDuration(1)}ms)`);
    expect(fallAnimationDuration(1)).toBe(127);
    expect(fallAnimationDuration(4)).toBe(193);
    expect(fallAnimationDuration(20)).toBe(GAME_MOTION.fallMaxMs);
    expect(fallAnimationDuration(-2)).toBe(GAME_MOTION.fallBaseMs);
  });

  it('uses transform and opacity rather than an animated filter for frequent candy clears', () => {
    const properties = keyframeProperties('candy-pop');
    expect(properties.has('transform')).toBe(true);
    expect(properties.has('opacity')).toBe(true);
    expect(properties.has('filter')).toBe(false);
  });

  it('avoids a live backdrop blur over the board on the mobile power-up tray', () => {
    expect(mobilePlayingPowerupDeclaration('backdrop-filter')).toBe('none');
    expect(mobilePlayingPowerupDeclaration('-webkit-backdrop-filter')).toBe('none');
  });
});
