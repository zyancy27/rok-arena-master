/**
 * Fail-Forward Helper
 *
 * For failed or mixed results, generates meaningful state changes
 * instead of dead-ending the narrative. The narrator uses these
 * suggestions to keep the story moving.
 *
 * Categories: combat, social, stealth, exploration, survival, utility, mental
 */

import type { OutcomeBand, ResolutionMode, ConsequenceOption } from './outcomeBands';

// ─── Fail-Forward Suggestion ────────────────────────────────────

export interface FailForwardSuggestion {
  /** What the player learns or gains despite failing */
  progressGained: string;
  /** What new complication arises */
  complication: string;
  /** Suggested state tags for the narrator */
  stateTags: string[];
  /** Whether this opens a new path */
  opensNewPath: boolean;
  /** Brief description for narrator context */
  narratorHint: string;
}

// ─── Fail-Forward Tables ────────────────────────────────────────

const COMBAT_FAIL_FORWARD: FailForwardSuggestion[] = [
  {
    progressGained: 'Spotted a vulnerability in the opponent\'s stance',
    complication: 'Took a hit while overextending',
    stateTags: ['vulnerability_spotted', 'damaged'],
    opensNewPath: true,
    narratorHint: 'The attack missed, but the character noticed a gap in the defense they could exploit next turn.',
  },
  {
    progressGained: 'Forced the enemy to reveal their fighting style',
    complication: 'Lost footing after the exchange',
    stateTags: ['pattern_learned', 'off_balance'],
    opensNewPath: true,
    narratorHint: 'The failed attack forced the enemy into a defensive pattern that reveals their habits.',
  },
  {
    progressGained: 'Repositioned to better ground during the exchange',
    complication: 'Burned stamina in the process',
    stateTags: ['repositioned', 'stamina_cost'],
    opensNewPath: false,
    narratorHint: 'The strike didn\'t land, but the scramble moved the character to a better position.',
  },
];

const SOCIAL_FAIL_FORWARD: FailForwardSuggestion[] = [
  {
    progressGained: 'The NPC\'s reaction reveals what they care about most',
    complication: 'Trust is lowered for the moment',
    stateTags: ['motivation_revealed', 'trust_lowered'],
    opensNewPath: true,
    narratorHint: 'The persuasion fails, but the NPC\'s angry reaction reveals what truly matters to them.',
  },
  {
    progressGained: 'Another NPC overhears and might be an easier target',
    complication: 'The original NPC is now guarded',
    stateTags: ['new_contact_possible', 'target_guarded'],
    opensNewPath: true,
    narratorHint: 'The attempt backfires with the target, but someone nearby takes notice.',
  },
  {
    progressGained: 'The refusal itself contains useful information',
    complication: 'Can\'t attempt the same approach again soon',
    stateTags: ['info_from_refusal', 'approach_burned'],
    opensNewPath: false,
    narratorHint: 'The NPC refuses, but the specific way they refuse hints at the real situation.',
  },
];

const STEALTH_FAIL_FORWARD: FailForwardSuggestion[] = [
  {
    progressGained: 'Mapped out the patrol pattern before being spotted',
    complication: 'Guards are now alert in this area',
    stateTags: ['patrol_mapped', 'area_alert'],
    opensNewPath: true,
    narratorHint: 'Caught a glimpse of the guard rotation before having to retreat.',
  },
  {
    progressGained: 'Found an alternate route while fleeing',
    complication: 'Lost a piece of equipment in the scramble',
    stateTags: ['alternate_route', 'item_lost'],
    opensNewPath: true,
    narratorHint: 'The escape attempt reveals a passage that wasn\'t visible before.',
  },
  {
    progressGained: 'The disturbance draws guards away from another area',
    complication: 'Personal cover in this zone is blown',
    stateTags: ['distraction_created', 'cover_blown'],
    opensNewPath: true,
    narratorHint: 'Being spotted here means fewer guards elsewhere — useful for allies or a second attempt.',
  },
];

const EXPLORATION_FAIL_FORWARD: FailForwardSuggestion[] = [
  {
    progressGained: 'Eliminated one possibility — narrowed the search',
    complication: 'Used up time or a consumable resource',
    stateTags: ['search_narrowed', 'time_spent'],
    opensNewPath: false,
    narratorHint: 'Didn\'t find the target, but now knows where NOT to look.',
  },
  {
    progressGained: 'Stumbled onto something unrelated but potentially valuable',
    complication: 'The original lead has gone cold',
    stateTags: ['tangential_find', 'lead_cold'],
    opensNewPath: true,
    narratorHint: 'The investigation stalls, but an unexpected discovery changes the picture.',
  },
  {
    progressGained: 'Triggered a reaction that reveals a hidden mechanism',
    complication: 'The mechanism is now in a different state',
    stateTags: ['mechanism_revealed', 'state_changed'],
    opensNewPath: true,
    narratorHint: 'Failing to solve the puzzle accidentally reveals how it works.',
  },
];

const SURVIVAL_FAIL_FORWARD: FailForwardSuggestion[] = [
  {
    progressGained: 'Found a temporary shelter even though the main plan failed',
    complication: 'Lost supplies or took environmental damage',
    stateTags: ['shelter_found', 'supplies_lost'],
    opensNewPath: false,
    narratorHint: 'Couldn\'t navigate to the destination, but found a safe-ish spot to regroup.',
  },
  {
    progressGained: 'Identified what environmental threat to prepare for',
    complication: 'Already suffered minor exposure',
    stateTags: ['threat_identified', 'exposure_taken'],
    opensNewPath: false,
    narratorHint: 'The survival check fails, but now the character knows exactly what they\'re up against.',
  },
];

const UTILITY_FAIL_FORWARD: FailForwardSuggestion[] = [
  {
    progressGained: 'Figured out what tool or approach is actually needed',
    complication: 'Broke or jammed the current tool/mechanism',
    stateTags: ['approach_learned', 'tool_broken'],
    opensNewPath: false,
    narratorHint: 'The repair/craft attempt fails but reveals what the correct method would be.',
  },
  {
    progressGained: 'Partially completed the work — can be finished with help',
    complication: 'Made it harder for the next attempt',
    stateTags: ['partial_progress', 'difficulty_increased'],
    opensNewPath: false,
    narratorHint: 'Got halfway through before the failure — someone else might be able to finish.',
  },
];

const MENTAL_FAIL_FORWARD: FailForwardSuggestion[] = [
  {
    progressGained: 'The mental pressure reveals the source of the attack',
    complication: 'Temporary disorientation or fear',
    stateTags: ['source_revealed', 'disoriented'],
    opensNewPath: true,
    narratorHint: 'Failed to resist, but in the moment of vulnerability, sensed where the psychic pressure is coming from.',
  },
  {
    progressGained: 'Built partial resistance for the next attempt',
    complication: 'Currently affected by the condition',
    stateTags: ['resistance_building', 'condition_active'],
    opensNewPath: false,
    narratorHint: 'The resistance fails now, but the character is building tolerance for next time.',
  },
];

const FAIL_FORWARD_TABLES: Record<ResolutionMode, FailForwardSuggestion[]> = {
  combat: COMBAT_FAIL_FORWARD,
  social: SOCIAL_FAIL_FORWARD,
  stealth: STEALTH_FAIL_FORWARD,
  exploration: EXPLORATION_FAIL_FORWARD,
  survival: SURVIVAL_FAIL_FORWARD,
  utility: UTILITY_FAIL_FORWARD,
  mental: MENTAL_FAIL_FORWARD,
};

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get a fail-forward suggestion for a given outcome and mode.
 * Only produces suggestions for non-success bands.
 */
export function getFailForwardSuggestion(
  band: OutcomeBand,
  mode: ResolutionMode,
): FailForwardSuggestion | null {
  if (band === 'strong_success') return null;

  const table = FAIL_FORWARD_TABLES[mode];
  if (!table || table.length === 0) return null;

  // Pick a random suggestion from the table
  const index = Math.floor(Math.random() * table.length);
  return table[index];
}

/**
 * Format a fail-forward suggestion for narrator injection.
 * Returns a context string that can be appended to narrator prompts.
 */
export function formatFailForwardForNarrator(
  suggestion: FailForwardSuggestion,
  band: OutcomeBand,
): string {
  const severity = band === 'hard_failure' ? 'HARD FAILURE' : 'MIXED RESULT';
  return [
    `FAIL-FORWARD (${severity}):`,
    `Progress: ${suggestion.progressGained}`,
    `Complication: ${suggestion.complication}`,
    `Hint: ${suggestion.narratorHint}`,
    suggestion.opensNewPath ? 'This opens a new narrative path.' : 'The story still advances despite the setback.',
    `State tags: ${suggestion.stateTags.join(', ')}`,
  ].join('\n');
}

/**
 * Build consequence tags for display in the chat UI.
 * Returns small badge-like labels: "Noise +1", "Suspicion Raised", etc.
 */
export function buildConsequenceTags(
  consequences: ConsequenceOption[],
): { label: string; variant: 'positive' | 'negative' | 'neutral' }[] {
  return consequences.map(c => ({
    label: c.magnitude > 0 ? `${c.label} +${c.magnitude}` : c.magnitude < 0 ? `${c.label} ${c.magnitude}` : c.label,
    variant: c.magnitude > 0 ? 'positive' as const : c.magnitude < 0 ? 'negative' as const : 'neutral' as const,
  }));
}
