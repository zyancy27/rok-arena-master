/**
 * Unified Outcome Band System
 *
 * Sits on top of existing d20 combat and campaign-action-rolls logic.
 * Provides a normalized result shape usable across combat, social,
 * stealth, and exploration — without replacing the underlying dice system.
 *
 * Integration points:
 * - battle-dice.ts DiceRollResult → wrapDiceRoll()
 * - campaign-action-rolls.ts ActionRollResult → wrapActionRoll()
 * - Future: 2d6, dice-pool modes via the same NormalizedOutcome shape
 */

import type { DiceRollResult, HitDetermination } from '@/lib/battle-dice';
import type { ActionRollResult, RollOutcome } from '@/lib/campaign-action-rolls';

// ─── Outcome Bands ──────────────────────────────────────────────

export type OutcomeBand =
  | 'strong_success'
  | 'success_with_cost'
  | 'setback_with_progress'
  | 'hard_failure';

export const OUTCOME_BAND_LABELS: Record<OutcomeBand, string> = {
  strong_success: 'Strong Success',
  success_with_cost: 'Success with Cost',
  setback_with_progress: 'Setback with Progress',
  hard_failure: 'Hard Failure',
};

export const OUTCOME_BAND_DESCRIPTIONS: Record<OutcomeBand, string> = {
  strong_success: 'Clean result, full effect, no complications.',
  success_with_cost: 'The goal is achieved but at a price — time, noise, injury, or complication.',
  setback_with_progress: 'The action fails to achieve its goal, but something useful comes from the attempt.',
  hard_failure: 'Total failure with consequences. The situation worsens.',
};

// ─── Resolution Modes ───────────────────────────────────────────

export type ResolutionMode =
  | 'combat'
  | 'social'
  | 'stealth'
  | 'exploration'
  | 'survival'
  | 'utility'
  | 'mental';

// ─── Consequence Categories ─────────────────────────────────────

export type ConsequenceCategory =
  | 'damage'
  | 'noise'
  | 'suspicion'
  | 'reputation'
  | 'stress'
  | 'position'
  | 'resource'
  | 'time'
  | 'information'
  | 'relationship';

export interface ConsequenceOption {
  category: ConsequenceCategory;
  label: string;
  magnitude: -2 | -1 | 0 | 1 | 2;
  description: string;
}

// ─── Normalized Outcome ─────────────────────────────────────────

export interface NormalizedOutcome {
  /** The resolution mode that produced this outcome */
  mode: ResolutionMode;
  /** Roll type label for display */
  rollType: string;
  /** Raw base roll (d20, 2d6, etc.) */
  baseRoll: number;
  /** Final computed value after modifiers */
  finalValue: number;
  /** Margin above/below the threshold */
  margin: number;
  /** The resolved outcome band */
  outcomeBand: OutcomeBand;
  /** Tags for narrator context */
  tags: string[];
  /** Human-readable explanation of the result */
  explanation: string;
  /** Possible consequences the narrator can choose from */
  consequenceOptions: ConsequenceOption[];
  /** Original source result for backwards compatibility */
  source: {
    type: 'dice_roll' | 'hit_determination' | 'action_roll' | 'custom';
    data: unknown;
  };
}

// ─── Band Determination ─────────────────────────────────────────

function marginToBand(margin: number, hasOpposition: boolean): OutcomeBand {
  if (margin >= 5) return 'strong_success';
  if (margin > 0) return 'success_with_cost';
  if (margin >= -4) return 'setback_with_progress';
  return 'hard_failure';
}

function rollOutcomeToBand(outcome: RollOutcome): OutcomeBand {
  switch (outcome) {
    case 'success': return 'strong_success';
    case 'success_with_cost': return 'success_with_cost';
    case 'partial_success': return 'setback_with_progress';
    case 'resisted': return 'setback_with_progress';
    case 'failure': return 'hard_failure';
  }
}

// ─── Mode Mapping ───────────────────────────────────────────────

function rollTypeToMode(rollType: string): ResolutionMode {
  const lower = rollType.toLowerCase();
  if (lower.includes('attack') || lower.includes('defense')) return 'combat';
  if (lower.includes('social') || lower.includes('persuad') || lower.includes('intimid')) return 'social';
  if (lower.includes('stealth') || lower.includes('sneak')) return 'stealth';
  if (lower.includes('perception') || lower.includes('investigation') || lower.includes('survival')) return 'exploration';
  if (lower.includes('endurance') || lower.includes('resist')) return 'mental';
  if (lower.includes('utility') || lower.includes('repair')) return 'utility';
  return 'exploration';
}

// ─── Consequence Generation ─────────────────────────────────────

function generateConsequences(
  band: OutcomeBand,
  mode: ResolutionMode,
): ConsequenceOption[] {
  const consequences: ConsequenceOption[] = [];

  if (band === 'strong_success') {
    consequences.push({
      category: 'position',
      label: 'Advantageous Position',
      magnitude: 1,
      description: 'Gained a tactical or narrative advantage.',
    });
    if (mode === 'social') {
      consequences.push({
        category: 'relationship',
        label: 'Trust Gained',
        magnitude: 1,
        description: 'The interaction builds trust or rapport.',
      });
    }
    return consequences;
  }

  if (band === 'success_with_cost') {
    if (mode === 'combat') {
      consequences.push(
        { category: 'damage', label: 'Glancing Blow Taken', magnitude: -1, description: 'Took minor damage in the exchange.' },
        { category: 'position', label: 'Exposed Flank', magnitude: -1, description: 'Left an opening for a counter.' },
      );
    } else if (mode === 'stealth') {
      consequences.push(
        { category: 'noise', label: 'Noise Created', magnitude: -1, description: 'Made more noise than intended.' },
        { category: 'time', label: 'Delayed', magnitude: -1, description: 'Took longer than expected.' },
      );
    } else if (mode === 'social') {
      consequences.push(
        { category: 'suspicion', label: 'Suspicion Raised', magnitude: -1, description: 'The target suspects something is off.' },
        { category: 'reputation', label: 'Reputation Strained', magnitude: -1, description: 'Pushed too hard; left a bad impression.' },
      );
    } else {
      consequences.push(
        { category: 'resource', label: 'Resource Spent', magnitude: -1, description: 'Used up a resource or tool in the process.' },
        { category: 'stress', label: 'Stress Accumulated', magnitude: -1, description: 'The effort was draining.' },
      );
    }
    return consequences;
  }

  if (band === 'setback_with_progress') {
    consequences.push({
      category: 'information',
      label: 'Partial Insight',
      magnitude: 1,
      description: 'Didn\'t succeed, but learned something useful.',
    });
    if (mode === 'combat') {
      consequences.push(
        { category: 'damage', label: 'Hit Taken', magnitude: -1, description: 'Took a solid hit.' },
        { category: 'position', label: 'Forced Back', magnitude: -1, description: 'Lost ground.' },
      );
    } else if (mode === 'stealth') {
      consequences.push(
        { category: 'suspicion', label: 'Alert Raised', magnitude: -1, description: 'Guards are now on heightened alert.' },
      );
    } else if (mode === 'social') {
      consequences.push(
        { category: 'relationship', label: 'Trust Damaged', magnitude: -1, description: 'The interaction caused friction.' },
      );
    }
    return consequences;
  }

  // hard_failure
  if (mode === 'combat') {
    consequences.push(
      { category: 'damage', label: 'Serious Damage', magnitude: -2, description: 'Took a heavy hit or critical failure.' },
      { category: 'position', label: 'Position Lost', magnitude: -2, description: 'Completely outmaneuvered.' },
    );
  } else if (mode === 'stealth') {
    consequences.push(
      { category: 'suspicion', label: 'Detected', magnitude: -2, description: 'Fully exposed; cover is blown.' },
    );
  } else if (mode === 'social') {
    consequences.push(
      { category: 'relationship', label: 'Hostility', magnitude: -2, description: 'The NPC becomes hostile or shuts down.' },
      { category: 'reputation', label: 'Reputation Damaged', magnitude: -2, description: 'Word will spread about this failure.' },
    );
  } else {
    consequences.push(
      { category: 'stress', label: 'Heavy Strain', magnitude: -2, description: 'Exhaustion or injury from total failure.' },
      { category: 'time', label: 'Significant Delay', magnitude: -2, description: 'Lost a meaningful amount of time.' },
    );
  }

  return consequences;
}

// ─── Band Explanation ───────────────────────────────────────────

function buildExplanation(band: OutcomeBand, mode: ResolutionMode, margin: number): string {
  const strength = Math.abs(margin);
  const bandLabel = OUTCOME_BAND_LABELS[band];
  
  const modeDescriptors: Record<ResolutionMode, string> = {
    combat: 'combat action',
    social: 'social exchange',
    stealth: 'stealth attempt',
    exploration: 'exploration check',
    survival: 'survival test',
    utility: 'skill check',
    mental: 'resistance check',
  };

  const modeWord = modeDescriptors[mode];

  if (band === 'strong_success') {
    return `${bandLabel} — the ${modeWord} lands cleanly with a margin of ${strength}.`;
  }
  if (band === 'success_with_cost') {
    return `${bandLabel} — the ${modeWord} succeeds, but barely (margin ${margin}). There's a cost.`;
  }
  if (band === 'setback_with_progress') {
    return `${bandLabel} — the ${modeWord} misses its mark (margin ${margin}), but something useful comes from it.`;
  }
  return `${bandLabel} — the ${modeWord} fails decisively (margin ${margin}). The situation worsens.`;
}

// ─── Adapter: d20 DiceRollResult → NormalizedOutcome ────────────

/**
 * Wrap a raw d20 DiceRollResult from battle-dice.ts into a NormalizedOutcome.
 * Requires knowing the opposing roll to determine margin.
 */
export function wrapDiceRoll(
  roll: DiceRollResult,
  opposingTotal: number,
  rollDescription?: string,
): NormalizedOutcome {
  const margin = roll.total - opposingTotal;
  const mode: ResolutionMode = roll.rollType.includes('mental') ? 'mental' : 'combat';
  const band = marginToBand(margin, true);

  return {
    mode,
    rollType: roll.rollType,
    baseRoll: roll.baseRoll,
    finalValue: roll.total,
    margin,
    outcomeBand: band,
    tags: [roll.rollType, band, mode],
    explanation: buildExplanation(band, mode, margin),
    consequenceOptions: generateConsequences(band, mode),
    source: { type: 'dice_roll', data: roll },
  };
}

/**
 * Wrap a HitDetermination from battle-dice.ts into a NormalizedOutcome.
 */
export function wrapHitDetermination(hit: HitDetermination): NormalizedOutcome {
  const mode: ResolutionMode = hit.isMentalAttack ? 'mental' : 'combat';
  const band = marginToBand(hit.gap, true);

  return {
    mode,
    rollType: hit.attackRoll.rollType,
    baseRoll: hit.attackRoll.baseRoll,
    finalValue: hit.attackRoll.total,
    margin: hit.gap,
    outcomeBand: band,
    tags: [hit.attackRoll.rollType, band, mode, hit.wouldHit ? 'hit' : 'miss'],
    explanation: buildExplanation(band, mode, hit.gap),
    consequenceOptions: generateConsequences(band, mode),
    source: { type: 'hit_determination', data: hit },
  };
}

// ─── Adapter: ActionRollResult → NormalizedOutcome ──────────────

/**
 * Wrap a campaign ActionRollResult into a NormalizedOutcome.
 * This is the primary integration point for campaign play.
 */
export function wrapActionRoll(roll: ActionRollResult): NormalizedOutcome {
  const band = rollOutcomeToBand(roll.outcome);
  const mode = rollTypeToMode(roll.label);

  return {
    mode,
    rollType: roll.label,
    baseRoll: roll.baseRoll,
    finalValue: roll.actingValue,
    margin: roll.gap,
    outcomeBand: band,
    tags: [roll.category, band, mode, roll.checkType],
    explanation: buildExplanation(band, mode, roll.gap),
    consequenceOptions: generateConsequences(band, mode),
    source: { type: 'action_roll', data: roll },
  };
}

// ─── Custom Resolution (for future 2d6, dice pools, etc.) ──────

export function createCustomOutcome(opts: {
  mode: ResolutionMode;
  rollType: string;
  baseRoll: number;
  finalValue: number;
  threshold: number;
  tags?: string[];
}): NormalizedOutcome {
  const margin = opts.finalValue - opts.threshold;
  const band = marginToBand(margin, false);

  return {
    mode: opts.mode,
    rollType: opts.rollType,
    baseRoll: opts.baseRoll,
    finalValue: opts.finalValue,
    margin,
    outcomeBand: band,
    tags: [...(opts.tags ?? []), band, opts.mode],
    explanation: buildExplanation(band, opts.mode, margin),
    consequenceOptions: generateConsequences(band, opts.mode),
    source: { type: 'custom', data: opts },
  };
}
