/**
 * Campaign Action Roll System
 *
 * Generalizes the existing attack/defense dice system into a unified
 * action resolution framework. Combat rolls remain a specialized case.
 * The narrator is the only intelligence — this is a structured resolution
 * layer the narrator uses to interpret uncertain outcomes consistently.
 */

import type { CharacterStats } from './character-stats';

// ─── Roll Categories ────────────────────────────────────────────

export type ActionRollCategory =
  | 'attack'
  | 'defense'
  | 'strength'
  | 'agility'
  | 'perception'
  | 'investigation'
  | 'stealth'
  | 'social'
  | 'endurance'
  | 'survival'
  | 'utility';

/** Human-readable labels for each category */
export const ROLL_CATEGORY_LABELS: Record<ActionRollCategory, string> = {
  attack: 'Attack Roll',
  defense: 'Defense Roll',
  strength: 'Strength Roll',
  agility: 'Agility Roll',
  perception: 'Perception Roll',
  investigation: 'Investigation Roll',
  stealth: 'Stealth Roll',
  social: 'Social Roll',
  endurance: 'Endurance Roll',
  survival: 'Survival Roll',
  utility: 'Utility Roll',
};

// ─── Roll Resolution Types ──────────────────────────────────────

export type RollCheckType = 'static' | 'opposed';

export type RollOutcome =
  | 'success'
  | 'partial_success'
  | 'failure'
  | 'resisted'
  | 'success_with_cost';

export const OUTCOME_LABELS: Record<RollOutcome, string> = {
  success: 'Success',
  partial_success: 'Partial Success',
  failure: 'Failure',
  resisted: 'Resisted',
  success_with_cost: 'Success with Cost',
};

// ─── Stat Routing ───────────────────────────────────────────────

/** Which stats contribute to each roll category (primary, secondary) */
const STAT_ROUTING: Record<ActionRollCategory, {
  primary: (keyof CharacterStats)[];
  secondary: (keyof CharacterStats)[];
  label: string;
}> = {
  attack: {
    primary: ['stat_strength', 'stat_power', 'stat_speed'],
    secondary: ['stat_battle_iq', 'stat_skill'],
    label: 'Combat',
  },
  defense: {
    primary: ['stat_durability', 'stat_speed'],
    secondary: ['stat_battle_iq', 'stat_skill'],
    label: 'Defense',
  },
  strength: {
    primary: ['stat_strength', 'stat_power'],
    secondary: ['stat_durability', 'stat_stamina'],
    label: 'Strength',
  },
  agility: {
    primary: ['stat_speed', 'stat_skill'],
    secondary: ['stat_battle_iq', 'stat_stamina'],
    label: 'Agility',
  },
  perception: {
    primary: ['stat_intelligence', 'stat_battle_iq'],
    secondary: ['stat_skill', 'stat_luck'],
    label: 'Awareness',
  },
  investigation: {
    primary: ['stat_intelligence', 'stat_skill'],
    secondary: ['stat_battle_iq', 'stat_luck'],
    label: 'Analysis',
  },
  stealth: {
    primary: ['stat_speed', 'stat_skill'],
    secondary: ['stat_intelligence', 'stat_luck'],
    label: 'Stealth',
  },
  social: {
    primary: ['stat_intelligence', 'stat_battle_iq'],
    secondary: ['stat_skill', 'stat_luck'],
    label: 'Presence',
  },
  endurance: {
    primary: ['stat_stamina', 'stat_durability'],
    secondary: ['stat_strength', 'stat_power'],
    label: 'Endurance',
  },
  survival: {
    primary: ['stat_intelligence', 'stat_stamina'],
    secondary: ['stat_skill', 'stat_speed'],
    label: 'Survival',
  },
  utility: {
    primary: ['stat_skill', 'stat_intelligence'],
    secondary: ['stat_luck', 'stat_speed'],
    label: 'Skill',
  },
};

// ─── Action Roll Result ─────────────────────────────────────────

export interface ActionRollResult {
  /** What kind of roll this is */
  category: ActionRollCategory;
  /** Human-readable label */
  label: string;
  /** Static check or opposed check */
  checkType: RollCheckType;
  /** The acting stat label */
  actingStatLabel: string;
  /** The acting side's total roll value */
  actingValue: number;
  /** The base D20 roll */
  baseRoll: number;
  /** Stat modifier breakdown */
  statModifier: number;
  /** Tier/level modifier */
  tierModifier: number;
  /** Luck modifier */
  luckModifier: number;
  /** What the roll is against */
  opposingLabel: string;
  /** Opposing value (DC for static, opponent roll for opposed) */
  opposingValue: number;
  /** The gap between acting and opposing */
  gap: number;
  /** Outcome of the roll */
  outcome: RollOutcome;
  /** Brief description of what was attempted */
  actionDescription: string;
  /** Whether this is a combat roll (backwards compat) */
  isCombatRoll: boolean;
}

// ─── Detection: What Roll Category Does This Action Need? ───────

const CATEGORY_PATTERNS: { category: ActionRollCategory; patterns: RegExp[] }[] = [
  // Combat (handled by existing system, but detected here for completeness)
  {
    category: 'attack',
    patterns: [
      /\b(attack|strike|slash|stab|punch|kick|shoot|fire|cast|blast|swing|hit|smash|throw.*at|hurl.*at)\b/i,
    ],
  },
  {
    category: 'defense',
    patterns: [
      /\b(block|parry|deflect|brace|shield|guard|protect|intercept)\b/i,
    ],
  },
  // Non-combat categories
  {
    category: 'strength',
    patterns: [
      /\b(lift|push|pull|break|force|smash|shove|carry|drag|pry|bend|rip|tear|hold.*shut|bust.*open|flip|heave|wrench|grapple|overpower|restrain)\b/i,
    ],
  },
  {
    category: 'agility',
    patterns: [
      /\b(dodge|evade|roll|leap|jump|climb|vault|tumble|acrobat|balance|catch|sprint|dash|slip.*through|squeeze.*through|flip|cartwheel|backflip|escape|reposition)\b/i,
    ],
  },
  {
    category: 'perception',
    patterns: [
      /\b(spot|notice|scan|watch|listen|hear|look.*for|peer|observe|detect|sense|feel.*for|see.*if|check.*for|keep.*eye|survey|glance)\b/i,
    ],
  },
  {
    category: 'investigation',
    patterns: [
      /\b(search|examine|inspect|investigate|study|analyze|piece.*together|decipher|decode|figure.*out|research|read.*carefully|look.*closely|check.*mechanism)\b/i,
    ],
  },
  {
    category: 'stealth',
    patterns: [
      /\b(sneak|hide|creep|tiptoe|conceal|stalk|skulk|shadow|move.*quietly|stay.*unseen|slip.*past|avoid.*detection|camouflage|blend.*in)\b/i,
    ],
  },
  {
    category: 'social',
    patterns: [
      /\b(persuade|convince|intimidate|threaten|deceive|lie|bluff|charm|flatter|negotiate|haggle|bribe|calm|soothe|seduce|manipulate|provoke|taunt|rally|inspire|plea|beg)\b/i,
    ],
  },
  {
    category: 'endurance',
    patterns: [
      /\b(endure|resist|withstand|tolerate|survive|bear|tough.*out|power.*through|fight.*off|hold.*on|stay.*conscious|steel.*against|brace.*against|overcome.*pain|shrug.*off)\b/i,
    ],
  },
  {
    category: 'survival',
    patterns: [
      /\b(track|forage|navigate|orient|find.*way|trail|hunt|trap|shelter|camp|weather|survive.*wild|bushcraft|read.*tracks|follow.*trail)\b/i,
    ],
  },
  {
    category: 'utility',
    patterns: [
      /\b(pick.*lock|lockpick|disarm.*trap|craft|repair|fix|hack|tinker|assemble|build|first.*aid|bandage|treat.*wound|stitch|splint|disable|wire|hotwire|rig)\b/i,
    ],
  },
];

/**
 * Detect the most appropriate roll category for a player action.
 * Returns null if no roll is needed (basic actions).
 */
export function detectRollCategory(actionText: string): ActionRollCategory | null {
  const lower = actionText.toLowerCase();

  // Basic actions that never need a roll
  if (/^(i\s+)?(walk|go|move|head|enter|leave|sit|stand|look around|take|pick up|put down|say|tell|ask|greet|wave)\b/i.test(lower)) {
    // Only skip if it's simple — if combined with uncertainty words, might need a roll
    if (!/\b(carefully|quietly|try|attempt|without.*being|without.*noticed|stealthily)\b/i.test(lower)) {
      return null;
    }
  }

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return category;
      }
    }
  }

  return null;
}

// ─── Dice Rolling ───────────────────────────────────────────────

/** Scale a 0-100 stat to a modifier (1-5 range) */
function statToModifier(value: number): number {
  return Math.max(1, Math.min(5, Math.ceil(value / 20)));
}

/** Average an array of numbers */
function avg(values: number[]): number {
  return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 50;
}

/**
 * Roll an action check for a given category.
 * Returns a full ActionRollResult with outcome determination.
 */
export function rollActionCheck(
  category: ActionRollCategory,
  stats: CharacterStats,
  tier: number,
  options: {
    /** For opposed checks: the opposing stats */
    opposingStats?: CharacterStats;
    opposingTier?: number;
    opposingLabel?: string;
    /** For static checks: the difficulty class (1-30) */
    difficultyClass?: number;
    difficultyLabel?: string;
    /** Description of what the player is attempting */
    actionDescription?: string;
    /** Current penalty from concentration etc */
    penalty?: number;
  } = {},
): ActionRollResult {
  const routing = STAT_ROUTING[category];
  const isOpposed = !!options.opposingStats;
  const checkType: RollCheckType = isOpposed ? 'opposed' : 'static';

  // ── Actor roll ──
  const baseRoll = Math.floor(Math.random() * 20) + 1;
  const primaryAvg = avg(routing.primary.map(k => stats[k]));
  const secondaryAvg = avg(routing.secondary.map(k => stats[k]));
  const statModifier = statToModifier(primaryAvg) + Math.floor(statToModifier(secondaryAvg) / 2);
  const tierModifier = Math.floor(Math.min(10, Math.ceil(tier * 1.4)) / 2);
  const luckModifier = Math.floor(stats.stat_luck / 50); // 0 or 1

  const penalty = options.penalty || 0;
  const penaltyReduction = Math.floor((statModifier + tierModifier) * (penalty / 100));
  const actingValue = Math.max(1, baseRoll + statModifier + tierModifier + luckModifier - penaltyReduction);

  // ── Opposing value ──
  let opposingValue: number;
  let opposingLabel: string;

  if (isOpposed && options.opposingStats) {
    // Opposed check: roll for the opposition
    const oppRouting = getOpposedRouting(category);
    const oppBaseRoll = Math.floor(Math.random() * 20) + 1;
    const oppPrimaryAvg = avg(oppRouting.primary.map(k => options.opposingStats![k]));
    const oppSecondaryAvg = avg(oppRouting.secondary.map(k => options.opposingStats![k]));
    const oppStatMod = statToModifier(oppPrimaryAvg) + Math.floor(statToModifier(oppSecondaryAvg) / 2);
    const oppTierMod = Math.floor(Math.min(10, Math.ceil((options.opposingTier || 1) * 1.4)) / 2);
    opposingValue = oppBaseRoll + oppStatMod + oppTierMod;
    opposingLabel = options.opposingLabel || 'Opposition';
  } else {
    // Static difficulty check
    opposingValue = options.difficultyClass || calculateDefaultDC(category, tier);
    opposingLabel = options.difficultyLabel || 'Difficulty';
  }

  const gap = actingValue - opposingValue;

  // ── Determine outcome ──
  let outcome: RollOutcome;
  if (gap >= 5) {
    outcome = 'success';
  } else if (gap > 0) {
    // Narrow success — might be success_with_cost
    outcome = Math.random() < 0.3 ? 'success_with_cost' : 'success';
  } else if (gap >= -2) {
    outcome = 'partial_success';
  } else if (gap >= -5 && isOpposed) {
    outcome = 'resisted';
  } else {
    outcome = 'failure';
  }

  return {
    category,
    label: ROLL_CATEGORY_LABELS[category],
    checkType,
    actingStatLabel: routing.label,
    actingValue,
    baseRoll,
    statModifier,
    tierModifier,
    luckModifier,
    opposingLabel,
    opposingValue,
    gap,
    outcome,
    actionDescription: options.actionDescription || '',
    isCombatRoll: category === 'attack' || category === 'defense',
  };
}

/**
 * Get the opposing stat routing for opposed checks.
 * E.g., stealth is opposed by perception, social by intelligence+battle_iq.
 */
function getOpposedRouting(category: ActionRollCategory): {
  primary: (keyof CharacterStats)[];
  secondary: (keyof CharacterStats)[];
} {
  switch (category) {
    case 'stealth':
      return { primary: ['stat_intelligence', 'stat_battle_iq'], secondary: ['stat_skill'] };
    case 'social':
      return { primary: ['stat_intelligence', 'stat_battle_iq'], secondary: ['stat_stamina'] };
    case 'strength':
      return { primary: ['stat_strength', 'stat_durability'], secondary: ['stat_stamina'] };
    case 'agility':
      return { primary: ['stat_speed', 'stat_battle_iq'], secondary: ['stat_durability'] };
    default:
      return STAT_ROUTING[category];
  }
}

/**
 * Calculate a reasonable default DC based on category and character tier.
 * Higher-tier characters face harder static checks to keep tension.
 */
function calculateDefaultDC(category: ActionRollCategory, tier: number): number {
  const baseDC: Record<ActionRollCategory, number> = {
    attack: 12,
    defense: 12,
    strength: 12,
    agility: 11,
    perception: 10,
    investigation: 11,
    stealth: 12,
    social: 11,
    endurance: 12,
    survival: 11,
    utility: 11,
  };
  // Scale DC slightly with tier so rolls stay meaningful
  return baseDC[category] + Math.floor(tier * 0.5);
}

// ─── Narrator Context Formatting ────────────────────────────────

/**
 * Format an ActionRollResult into narrator-readable context.
 * This is what gets injected into the narrator prompt so it
 * knows exactly what happened mechanically.
 */
export function formatRollForNarrator(roll: ActionRollResult): string {
  const parts = [
    `ACTION ROLL: ${roll.label.toUpperCase()}`,
    `Check type: ${roll.checkType}`,
    `Actor stat: ${roll.actingStatLabel} (total: ${roll.actingValue}, base D20: ${roll.baseRoll}, stat: +${roll.statModifier}, tier: +${roll.tierModifier}${roll.luckModifier > 0 ? `, luck: +${roll.luckModifier}` : ''})`,
    `Opposing: ${roll.opposingLabel} (${roll.opposingValue})`,
    `Gap: ${roll.gap} → Outcome: ${OUTCOME_LABELS[roll.outcome]}`,
  ];

  if (roll.actionDescription) {
    parts.push(`Action: ${roll.actionDescription}`);
  }

  // Narrator guidance based on outcome
  switch (roll.outcome) {
    case 'success':
      parts.push('NARRATE: The action succeeds cleanly. Describe the positive result.');
      break;
    case 'partial_success':
      parts.push('NARRATE: Partial success — the action mostly works but with a complication or incomplete result. Describe what succeeded and what didn\'t quite work.');
      break;
    case 'success_with_cost':
      parts.push('NARRATE: Success, but at a cost. The action achieves its goal but creates a new problem, takes longer, or causes collateral damage.');
      break;
    case 'failure':
      parts.push(`NARRATE: The action fails. For ${roll.category} failures — describe the failure in a way that fits the action type. Do NOT describe it as a combat miss unless it IS combat.`);
      break;
    case 'resisted':
      parts.push('NARRATE: The target resists. The action was countered or deflected by the opposing force. Describe the resistance.');
      break;
  }

  // Category-specific failure narration guidance
  if (roll.outcome === 'failure' || roll.outcome === 'resisted') {
    const failureGuidance: Record<ActionRollCategory, string> = {
      attack: 'The strike misses, gets blocked, or glances off.',
      defense: 'The defense breaks down — the hit lands despite the attempt.',
      strength: 'The object resists, grip slips, force is not enough.',
      agility: 'The movement falters — too slow, too clumsy, or badly timed.',
      perception: 'The clue goes unnoticed, the movement is missed, the danger is only noticed late.',
      investigation: 'The analysis comes up short, the pieces don\'t connect, the mechanism remains opaque.',
      stealth: 'The player is heard, spotted, or leaves evidence.',
      social: 'The NPC stays guarded, mistrust deepens, the approach does not land.',
      endurance: 'Fear hits, pain breaks focus, poison/stress gets through.',
      survival: 'The trail goes cold, navigation fails, the weather wins.',
      utility: 'The lock resists, the repair fails, the mechanism jams.',
    };
    parts.push(`FAILURE FLAVOR: ${failureGuidance[roll.category]}`);
  }

  return parts.join('\n');
}

/**
 * Convert an ActionRollResult to the legacy diceResult format
 * for backwards compatibility with existing narrator handling.
 */
export function toLegacyDiceResult(roll: ActionRollResult): {
  diceResult?: { hit: boolean; attackTotal: number; defenseTotal: number; gap: number; isMental: boolean };
  defenseResult?: { success: boolean; defenseTotal: number; incomingTotal: number; gap: number; defenseType: 'block' | 'dodge' };
  actionRoll?: ActionRollResult;
} {
  if (roll.category === 'attack') {
    return {
      diceResult: {
        hit: roll.outcome === 'success' || roll.outcome === 'success_with_cost',
        attackTotal: roll.actingValue,
        defenseTotal: roll.opposingValue,
        gap: roll.gap,
        isMental: false,
      },
      actionRoll: roll,
    };
  }

  if (roll.category === 'defense') {
    return {
      defenseResult: {
        success: roll.outcome === 'success' || roll.outcome === 'partial_success',
        defenseTotal: roll.actingValue,
        incomingTotal: roll.opposingValue,
        gap: roll.gap,
        defenseType: 'dodge',
      },
      actionRoll: roll,
    };
  }

  // Non-combat rolls use the new actionRoll field
  return { actionRoll: roll };
}
