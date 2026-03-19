import { describe, expect, it } from 'vitest';
import { IntentEngine } from './IntentEngine';

const resolve = (rawText: string) => IntentEngine.resolve(rawText, {
  mode: 'campaign',
  possibleTargets: [
    { name: 'guard', kind: 'enemy' },
    { name: 'cultist', kind: 'enemy' },
    { name: 'attacker', kind: 'enemy' },
    { name: 'Lyra', kind: 'npc' },
  ],
});

describe('IntentEngine combat gating', () => {
  it('does not classify space-time questions as combat or require rolls', () => {
    const result = resolve('Is this a space time thing?');
    expect(result.intent.isCombatAction).toBe(false);
    expect(result.intent.requiresRoll).toBe(false);
    expect(result.intent.type).not.toBe('attack');
  });

  it('does not classify speculative space-time narration as combat', () => {
    const result = resolve('I think this has something to do with space-time.');
    expect(result.intent.isCombatAction).toBe(false);
    expect(result.intent.requiresRoll).toBe(false);
  });

  it('does not classify knife examination as combat', () => {
    const result = resolve('I examine the knife on the table.');
    expect(result.intent.isCombatAction).toBe(false);
    expect(result.intent.requiresRoll).toBe(false);
  });

  it('does not classify buying a knife as combat', () => {
    const result = resolve('I buy a knife.');
    expect(result.intent.isCombatAction).toBe(false);
    expect(result.intent.requiresRoll).toBe(false);
  });

  it('classifies knife attack declarations as attack actions', () => {
    const result = resolve('I pull out my knife and stab the guard.');
    expect(result.intent.type).toBe('attack');
    expect(result.intent.isCombatAction).toBe(true);
    expect(result.intent.requiresRoll).toBe(true);
  });

  it('classifies thrown-knife attacks as attack actions', () => {
    const result = resolve('I throw the knife at the cultist.');
    expect(result.intent.type).toBe('attack');
    expect(result.intent.isCombatAction).toBe(true);
    expect(result.intent.requiresRoll).toBe(true);
  });

  it('classifies explicit time-magic use as an ability action', () => {
    const result = resolve('I use time magic to slow the attacker.');
    expect(result.intent.type).toBe('ability');
    expect(result.intent.requiresRoll).toBe(true);
  });

  it('does not trigger combat for explanatory questions addressed to NPCs', () => {
    const result = resolve('Can Lyra explain whether this is a space-time distortion?');
    expect(result.intent.isCombatAction).toBe(false);
    expect(result.intent.requiresRoll).toBe(false);
  });

  it('does not trigger rolls for combat nouns without declared action intent', () => {
    const result = resolve('Why did the attack happen?');
    expect(result.intent.isCombatAction).toBe(false);
    expect(result.intent.requiresRoll).toBe(false);
  });
});
