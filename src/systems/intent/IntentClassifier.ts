import { detectDirectInteraction } from '@/lib/battle-hit-detection';
import type { MoveIntent } from '@/lib/intent-interpreter';
import type { IntentEngineContext, IntentType } from './IntentEngine';

export interface IntentClassificationResult {
  type: IntentType;
  subType?: string;
  isCombatAction: boolean;
  requiresRoll: boolean;
  confidence: number;
  sourceHints: string[];
}

const ATTACK_PATTERNS = /\b(attack|strike|hit|slash|stab|shoot|punch|kick|smash|blast|fire at|lunge at|swing at|counter)\b/i;
const MOVE_PATTERNS = /\b(run|move|dash|sprint|walk|step|advance|retreat|dodge|slide|leap|jump|climb|crawl|take cover|hide|duck|reposition)\b/i;
const SPEAK_PATTERNS = /\b(say|tell|ask|speak|talk|shout|whisper|yell|demand|warn|negotiate|persuade|taunt|threaten)\b/i;
const OBSERVE_PATTERNS = /\b(look|watch|observe|scan|examine|inspect|study|analyze|search|listen|sense|check|survey)\b/i;
const INTERACT_PATTERNS = /\b(open|close|touch|grab|pull|push|use|pick up|drop|take|press|activate|unlock|loot|carry|give)\b/i;
const ABILITY_PATTERNS = /\b(cast|channel|summon|manifest|project|conjure|teleport|phase|heal|barrier|shield|ability|power|spell|technique)\b/i;

export function classifyIntent(
  rawText: string,
  legacyMoveIntent: MoveIntent,
  context: IntentEngineContext = {},
): IntentClassificationResult {
  const text = rawText.toLowerCase();
  const hitDetection = detectDirectInteraction(rawText);
  const sourceHints: string[] = [];

  let type: IntentType = 'observe';
  let confidence = 0.45;

  if (ATTACK_PATTERNS.test(text) || hitDetection.shouldTriggerHitCheck || legacyMoveIntent.actionType === 'ATTACK' || legacyMoveIntent.actionType === 'COUNTER') {
    type = 'attack';
    confidence = 0.92;
    sourceHints.push('attack keywords or hit detection');
  } else if (ABILITY_PATTERNS.test(text) || legacyMoveIntent.detectedElements.length > 0 || legacyMoveIntent.intentCategory === 'HIGH_FORCE') {
    type = 'ability';
    confidence = 0.86;
    sourceHints.push('ability wording or high-force intent');
  } else if (MOVE_PATTERNS.test(text) || legacyMoveIntent.actionType === 'MOVEMENT') {
    type = 'move';
    confidence = 0.82;
    sourceHints.push('movement phrasing');
  } else if (SPEAK_PATTERNS.test(text) || context.mode === 'dialogue') {
    type = 'speak';
    confidence = 0.84;
    sourceHints.push('dialogue phrasing or dialogue mode');
  } else if (INTERACT_PATTERNS.test(text) || legacyMoveIntent.actionType === 'ENVIRONMENTAL') {
    type = 'interact';
    confidence = 0.76;
    sourceHints.push('interaction wording');
  } else if (OBSERVE_PATTERNS.test(text)) {
    type = 'observe';
    confidence = 0.78;
    sourceHints.push('observation wording');
  } else {
    sourceHints.push('fallback classification');
  }

  const isCombatAction = type === 'attack' || type === 'ability' || hitDetection.shouldTriggerDefenseCheck;
  const requiresRoll = hitDetection.shouldTriggerHitCheck || hitDetection.shouldTriggerDefenseCheck || (isCombatAction && legacyMoveIntent.confidence >= 0.65);

  return {
    type,
    subType: legacyMoveIntent.actionType?.toLowerCase(),
    isCombatAction,
    requiresRoll,
    confidence,
    sourceHints,
  };
}
