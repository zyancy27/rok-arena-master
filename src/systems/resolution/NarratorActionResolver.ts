/**
 * Roll Resolver — Broader Action Roll Types
 * ─────────────────────────────────────────────────────────────────────
 * Expands the existing attack/defense logic into a labeled roll system
 * for campaign play. Combat continues to use the existing battle-dice
 * pipeline; THIS module adds non-combat roll types.
 *
 * Roll types map to the Unified Outcome Band System
 * (see src/engine/resolution/outcomeBands.ts) so all roll outcomes
 * surface as: strong_success | normal_success | partial_success |
 * failure_with_consequence | severe_failure.
 */

import type { Intent } from '@/systems/intent/IntentEngine';

/**
 * Local action category taxonomy used by the broader (non-combat) roll
 * resolver. Kept here so it doesn't collide with the legacy combat-only
 * ActionResolver in ./ActionResolver.ts.
 */
export type ActionCategory =
  | 'basic_action'
  | 'attack'
  | 'defense'
  | 'social'
  | 'stealth'
  | 'investigation'
  | 'power_use'
  | 'movement'
  | 'rest';

export type RollType =
  | 'attack'
  | 'defense'
  | 'strength'
  | 'agility'
  | 'perception'
  | 'investigation'
  | 'stealth'
  | 'social'
  | 'resistance'
  | 'survival'
  | 'utility';

export interface RollLabel {
  type: RollType;
  displayName: string;
  shortLabel: string;
  /** Stats consulted, snake_case keys matching `characters` table */
  stats: string[];
}

const LABELS: Record<RollType, RollLabel> = {
  attack:        { type: 'attack',        displayName: 'Attack Roll',        shortLabel: 'ATK',  stats: ['stat_strength', 'stat_skill'] },
  defense:       { type: 'defense',       displayName: 'Defense Roll',       shortLabel: 'DEF',  stats: ['stat_durability', 'stat_speed'] },
  strength:      { type: 'strength',      displayName: 'Strength Roll',      shortLabel: 'STR',  stats: ['stat_strength', 'stat_stamina'] },
  agility:       { type: 'agility',       displayName: 'Agility Roll',       shortLabel: 'AGI',  stats: ['stat_speed', 'stat_skill'] },
  perception:    { type: 'perception',    displayName: 'Perception Roll',    shortLabel: 'PER',  stats: ['stat_intelligence', 'stat_skill'] },
  investigation: { type: 'investigation', displayName: 'Investigation Roll', shortLabel: 'INV',  stats: ['stat_intelligence', 'stat_skill'] },
  stealth:       { type: 'stealth',       displayName: 'Stealth Roll',       shortLabel: 'STL',  stats: ['stat_speed', 'stat_skill'] },
  social:        { type: 'social',        displayName: 'Social Roll',        shortLabel: 'SOC',  stats: ['stat_intelligence', 'stat_luck'] },
  resistance:    { type: 'resistance',    displayName: 'Resistance Roll',    shortLabel: 'RES',  stats: ['stat_durability', 'stat_stamina'] },
  survival:      { type: 'survival',      displayName: 'Survival Roll',      shortLabel: 'SRV',  stats: ['stat_stamina', 'stat_skill'] },
  utility:       { type: 'utility',       displayName: 'Utility Roll',       shortLabel: 'UTL',  stats: ['stat_power', 'stat_skill'] },
};

export function getRollLabel(type: RollType): RollLabel {
  return LABELS[type];
}

/**
 * Pick a sensible default roll type when ActionResolver doesn't pre-assign one.
 * Used for ambiguous "basic_action" cases where a roll was still requested.
 */
export function selectRollType(intent: Intent, category: ActionCategory): RollType {
  const text = intent.rawText.toLowerCase();

  if (/\b(see|spot|notice|detect|hear|listen|smell)\b/.test(text)) return 'perception';
  if (/\b(lift|push|drag|carry|break|force|pry|smash)\b/.test(text)) return 'strength';
  if (/\b(climb|leap|balance|tumble|catch|dodge)\b/.test(text)) return 'agility';
  if (/\b(endure|withstand|resist|tough out|grit)\b/.test(text)) return 'resistance';
  if (/\b(survive|forage|track|navigate|tend|patch)\b/.test(text)) return 'survival';
  if (category === 'social') return 'social';
  if (category === 'stealth') return 'stealth';
  if (category === 'investigation') return 'investigation';
  if (category === 'attack') return 'attack';
  if (category === 'defense') return 'defense';
  if (category === 'power_use') return 'utility';

  return 'utility';
}

/**
 * Produce a narrator-facing roll context block to inject into the prompt.
 * The narrator should describe the roll TYPE accurately (a perception roll
 * is described differently from an attack roll).
 */
export function buildRollNarratorContext(roll: {
  type: RollType;
  band: string;
  total?: number;
  dc?: number | null;
  opposed?: boolean;
}): string {
  const label = getRollLabel(roll.type);
  const lines = [
    `[ROLL RESOLVED]`,
    `type: ${label.displayName} (${label.shortLabel})`,
    `outcome_band: ${roll.band}`,
  ];
  if (roll.total !== undefined) lines.push(`total: ${roll.total}`);
  if (roll.dc !== undefined && roll.dc !== null) lines.push(`dc: ${roll.dc}`);
  if (roll.opposed !== undefined) lines.push(`check_kind: ${roll.opposed ? 'opposed' : 'static'}`);
  lines.push(`narration_rule: describe this as a ${label.displayName.toLowerCase()} outcome — match the verb and consequence to the roll type, not generic combat language.`);
  return lines.join('\n');
}
