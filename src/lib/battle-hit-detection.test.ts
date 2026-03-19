import { describe, expect, it } from 'vitest';
import { detectDirectInteraction } from './battle-hit-detection';

describe('battle-hit-detection combat gating', () => {
  it('does not trigger hit checks for descriptive knife inspection', () => {
    const result = detectDirectInteraction('I examine the knife on the table.');
    expect(result.shouldTriggerHitCheck).toBe(false);
    expect(result.shouldTriggerDefenseCheck).toBe(false);
  });

  it('does not trigger hit checks for questions about combat', () => {
    const result = detectDirectInteraction('Can I attack the guard?');
    expect(result.shouldTriggerHitCheck).toBe(false);
    expect(result.shouldTriggerDefenseCheck).toBe(false);
    expect(result.suppressionReasons).toContain('context: interrogative phrasing');
  });

  it('triggers hit checks for declared knife attacks with named targets', () => {
    const result = detectDirectInteraction('I pull out my knife and stab the guard.');
    expect(result.shouldTriggerHitCheck).toBe(true);
    expect(result.intent).toBe('attack');
    expect(result.hasTarget).toBe(true);
  });

  it('triggers hit checks for thrown weapons aimed at named targets', () => {
    const result = detectDirectInteraction('I throw the knife at the cultist.');
    expect(result.shouldTriggerHitCheck).toBe(true);
    expect(result.intent).toBe('attack');
    expect(result.hasTarget).toBe(true);
  });
});
