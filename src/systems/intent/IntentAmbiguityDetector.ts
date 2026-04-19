/**
 * Intent Ambiguity Detector
 * ─────────────────────────────────────────────────────────────────────
 * Decides when the rule-based IntentClassifier needs an AI fallback.
 *
 * The hybrid strategy: fast rules handle ~80% of inputs instantly,
 * AI resolves the ambiguous remainder. This keeps latency + cost low
 * while fixing edge cases like 'knife' / 'space-time' / 'strike' that
 * the regex layer misclassifies.
 */

import type { IntentClassificationResult } from './IntentClassifier';
import type { IntentEngineContext } from './IntentEngine';

export interface AmbiguityVerdict {
  ambiguous: boolean;
  reasons: string[];
}

const AMBIGUOUS_TOKENS = [
  'space', 'time', 'knife', 'sword', 'gun', 'strike', 'shadow',
  'fire', 'ice', 'storm', 'wave', 'pulse', 'spark', 'force',
  'energy', 'cut', 'break', 'crack', 'slip', 'press',
];

const QUESTION_MARK = /\?$/;
const FIRST_PERSON_WONDER = /\b(i wonder|maybe i should|i think|i could|should i|can i|do i)\b/i;
const NARRATIVE_DESCRIPTION = /\b(my|i am|i'm|i feel|i see|i notice|looking at|the [a-z]+ (here|nearby))\b/i;

export function detectAmbiguity(
  rawText: string,
  classification: IntentClassificationResult,
  context: IntentEngineContext = {},
): AmbiguityVerdict {
  const reasons: string[] = [];
  const text = rawText.toLowerCase();

  // 1. Low confidence classification
  if (classification.confidence < 0.7) {
    reasons.push(`low_confidence:${classification.confidence.toFixed(2)}`);
  }

  // 2. Combat classification but no targets in context
  if (classification.isCombatAction && (context.possibleTargets?.length ?? 0) === 0) {
    reasons.push('combat_intent_no_targets');
  }

  // 3. Combat classification but mode is dialogue/world (non-battle)
  if (classification.isCombatAction && context.mode && context.mode !== 'battle') {
    reasons.push(`combat_intent_in_${context.mode}_mode`);
  }

  // 4. Ambiguous noun-as-verb risk: contains a token that has dual meaning
  //    AND no explicit action verb structure
  const hasAmbiguousToken = AMBIGUOUS_TOKENS.some((tok) =>
    new RegExp(`\\b${tok}\\b`, 'i').test(text),
  );
  if (hasAmbiguousToken && classification.isCombatAction) {
    reasons.push('ambiguous_noun_token_classified_as_combat');
  }

  // 5. Question or wonder phrasing classified as action
  if ((QUESTION_MARK.test(rawText) || FIRST_PERSON_WONDER.test(rawText))
      && classification.type !== 'speak'
      && classification.type !== 'observe') {
    reasons.push('question_or_wonder_classified_as_action');
  }

  // 6. Pure narrative description classified as combat
  if (NARRATIVE_DESCRIPTION.test(rawText) && classification.isCombatAction) {
    reasons.push('narrative_description_classified_as_combat');
  }

  return {
    ambiguous: reasons.length > 0,
    reasons,
  };
}
