/**
 * Interaction Layer — Extended Action Classification
 *
 * Classifies player actions into narrative categories BEFORE they
 * reach the narrator. Extends the existing intent interpreter with
 * campaign-specific action types.
 *
 * Action types: movement, inspection, dialogue, combat, item_use,
 * environment_interaction, social_action, creative_solution
 */

export type NarrativeActionType =
  | 'movement'
  | 'inspection'
  | 'dialogue'
  | 'combat'
  | 'item_use'
  | 'environment_interaction'
  | 'social_action'
  | 'creative_solution'
  | 'rest'
  | 'stealth'
  | 'unknown';

export interface NarrativeActionClassification {
  type: NarrativeActionType;
  confidence: number;
  isBasicAction: boolean;
  /** Whether this action involves supernatural powers */
  involvesPowers: boolean;
  /** Keywords that triggered classification */
  matchedKeywords: string[];
  /** Suggested narrator response style */
  narratorStyle: 'world_response' | 'npc_dialogue' | 'combat_narration' | 'atmospheric' | 'consequence';
}

// ── Keyword Maps ───────────────────────────────────────────────

const ACTION_KEYWORDS: Record<NarrativeActionType, RegExp[]> = {
  movement: [
    /\b(walk|run|sprint|climb|jump|leap|swim|fly|descend|ascend|enter|exit|leave|approach|retreat|follow|head|go|travel|ride|drive|crawl)\b/i,
  ],
  inspection: [
    /\b(look|examine|inspect|study|read|observe|check|search|investigate|scan|peer|listen|smell|taste|touch|feel)\b/i,
  ],
  dialogue: [
    /\b(say|tell|ask|speak|talk|greet|respond|reply|whisper|shout|yell|call|introduce|negotiate|persuade|convince|lie|threaten|compliment|insult)\b/i,
    /^["']|["']\s*$/,
  ],
  combat: [
    /\b(attack|strike|punch|kick|slash|stab|shoot|throw|swing|block|dodge|parry|defend|fight|charge|tackle|grapple|bite|claw)\b/i,
  ],
  item_use: [
    /\b(use|drink|eat|equip|wear|apply|consume|activate|open|unlock|pick up|grab|take|drop|give|trade|buy|sell|craft|repair)\b/i,
  ],
  environment_interaction: [
    /\b(push|pull|break|destroy|move|lift|drag|flip|knock|smash|kick.*door|open.*chest|light.*fire|build|construct|dig|plant)\b/i,
  ],
  social_action: [
    /\b(befriend|help|comfort|calm|encourage|intimidate|bribe|charm|flirt|dance|perform|sing|play.*music|bow|wave|gesture|hug|shake.*hand)\b/i,
  ],
  creative_solution: [
    /\b(improvise|combine|redirect|repurpose|trick|deceive|distract|lure|bait|trap|rig|sabotage|disguise|feint|bluff)\b/i,
  ],
  rest: [
    /\b(rest|sleep|camp|sit|wait|meditate|pray|recover|heal|relax|nap)\b/i,
  ],
  stealth: [
    /\b(sneak|hide|creep|lurk|stalk|shadow|stealth|quiet|silent|disguise|blend|camouflage)\b/i,
  ],
  unknown: [],
};

const POWER_INDICATORS = /\b(energy|chi|mana|magic|spell|power|ability|summon|conjure|teleport|transform|channel|aura|blast|beam|force field)\b/i;

// ── Classifier ─────────────────────────────────────────────────

/**
 * Classify a player action into narrative categories.
 * This runs BEFORE the action reaches the narrator prompt.
 */
export function classifyNarrativeAction(actionText: string): NarrativeActionClassification {
  const text = actionText.toLowerCase().trim();
  const scores: Record<NarrativeActionType, number> = {
    movement: 0, inspection: 0, dialogue: 0, combat: 0,
    item_use: 0, environment_interaction: 0, social_action: 0,
    creative_solution: 0, rest: 0, stealth: 0, unknown: 0,
  };
  const matchedKeywords: string[] = [];

  for (const [type, patterns] of Object.entries(ACTION_KEYWORDS) as [NarrativeActionType, RegExp[]][]) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        scores[type] += 1;
        matchedKeywords.push(match[0]);
      }
    }
  }

  // Check for dialogue via quotes
  if (/^["'].*["']$/.test(text.trim()) || text.includes('"') || text.includes("'")) {
    scores.dialogue += 2;
  }

  // Find best match
  let bestType: NarrativeActionType = 'unknown';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as [NarrativeActionType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  const involvesPowers = POWER_INDICATORS.test(text);
  const isBasicAction = !involvesPowers && ['movement', 'inspection', 'dialogue', 'item_use', 'social_action', 'rest'].includes(bestType);

  // Determine narrator response style
  let narratorStyle: NarrativeActionClassification['narratorStyle'] = 'atmospheric';
  if (bestType === 'dialogue' || bestType === 'social_action') narratorStyle = 'npc_dialogue';
  else if (bestType === 'combat') narratorStyle = 'combat_narration';
  else if (bestType === 'environment_interaction' || bestType === 'creative_solution') narratorStyle = 'consequence';
  else if (bestType === 'inspection' || bestType === 'movement') narratorStyle = 'world_response';

  return {
    type: bestType,
    confidence: bestScore > 0 ? Math.min(0.95, 0.5 + bestScore * 0.15) : 0.3,
    isBasicAction,
    involvesPowers,
    matchedKeywords: [...new Set(matchedKeywords)],
    narratorStyle,
  };
}

/**
 * Build a classification context string for the narrator prompt.
 */
export function buildActionClassificationContext(classification: NarrativeActionClassification): string {
  const parts: string[] = [];
  parts.push(`ACTION TYPE: ${classification.type.toUpperCase()}`);
  
  if (classification.isBasicAction) {
    parts.push('This is a BASIC ACTION — respond naturally without power/ability logic.');
  }
  
  parts.push(`RESPONSE STYLE: ${classification.narratorStyle.replace('_', ' ')}`);
  
  return parts.join('. ');
}
