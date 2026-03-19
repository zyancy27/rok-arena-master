import { detectDirectInteraction } from '@/lib/battle-hit-detection';
import { analyzeCombatIntentContext } from '@/lib/combat-intent-context';
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

const ATTACK_PATTERNS = /\b(attack|strike|hit|slash|stab|shoot|punch|kick|smash|blast|fire at|lunge at|swing at|counter|throw at|hurl at|launch at)\b/i;
const MOVE_PATTERNS = /\b(run|move|dash|sprint|walk|step|advance|retreat|dodge|slide|leap|jump|climb|crawl|take cover|hide|duck|reposition)\b/i;
const SPEAK_PATTERNS = /\b(say|tell|ask|speak|talk|shout|whisper|yell|demand|warn|negotiate|persuade|taunt|threaten|explain|discuss)\b/i;
const OBSERVE_PATTERNS = /\b(look|watch|observe|scan|examine|inspect|study|analyze|search|listen|sense|check|survey|investigate)\b/i;
const INTERACT_PATTERNS = /\b(open|close|touch|grab|pull|push|use|pick up|drop|take|press|activate|unlock|loot|carry|give|buy|sell|trade|craft|repair)\b/i;
const ABILITY_PATTERNS = /\b(cast|channel|summon|manifest|project|conjure|teleport|phase|heal|barrier|shield|ability|power|spell|technique|magic|invoke|warp|bend)\b/i;

export function classifyIntent(
  rawText: string,
  legacyMoveIntent: MoveIntent,
  context: IntentEngineContext = {},
): IntentClassificationResult {
  const text = rawText.toLowerCase();
  const possibleTargets = context.possibleTargets?.map((target) => target.name) ?? [];
  const hitDetection = detectDirectInteraction(rawText, { possibleTargets });
  const combatContext = analyzeCombatIntentContext(rawText, { possibleTargets });
  const sourceHints: string[] = [];

  let type: IntentType = 'observe';
  let confidence = 0.45;

  if (combatContext.suppressCombat) {
    sourceHints.push(...combatContext.reasons.map((reason) => `combat suppressed: ${reason}`));

    if (SPEAK_PATTERNS.test(text) || combatContext.isQuestion || context.mode === 'dialogue') {
      type = 'speak';
      confidence = 0.88;
      sourceHints.push('question/dialogue phrasing');
    } else if (combatContext.isObservation || OBSERVE_PATTERNS.test(text)) {
      type = 'observe';
      confidence = 0.84;
      sourceHints.push('observation/investigation phrasing');
    } else if (combatContext.isInventoryContext || INTERACT_PATTERNS.test(text)) {
      type = 'interact';
      confidence = 0.82;
      sourceHints.push('inventory/object interaction phrasing');
    } else {
      sourceHints.push('safe non-combat fallback');
    }
  } else if (
    combatContext.explicitAttack
    || hitDetection.shouldTriggerHitCheck
    || (ATTACK_PATTERNS.test(text) && combatContext.hasActionDeclaration && combatContext.hasDirectedTarget)
    || ((legacyMoveIntent.actionType === 'ATTACK' || legacyMoveIntent.actionType === 'COUNTER') && combatContext.hasActionDeclaration)
  ) {
    type = 'attack';
    confidence = hitDetection.shouldTriggerHitCheck ? 0.95 : 0.92;
    sourceHints.push('explicit hostile action context');
  } else if (
    combatContext.explicitAbility
    || (ABILITY_PATTERNS.test(text) && combatContext.hasActionDeclaration)
    || (legacyMoveIntent.detectedElements.length > 0 && combatContext.hasActionDeclaration && combatContext.hasAbilityVerb)
    || (legacyMoveIntent.intentCategory === 'HIGH_FORCE' && combatContext.hasActionDeclaration && (combatContext.hasAttackVerb || combatContext.hasAbilityVerb))
  ) {
    type = 'ability';
    confidence = 0.86;
    sourceHints.push('explicit ability usage context');
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

  const abilityRequiresRoll = type === 'ability' && !combatContext.suppressCombat && (
    combatContext.hasDirectedTarget
    || hitDetection.shouldTriggerHitCheck
    || hitDetection.shouldTriggerDefenseCheck
    || legacyMoveIntent.intentCategory === 'HIGH_FORCE'
  );

  const isCombatAction = !combatContext.suppressCombat && (
    type === 'attack'
    || hitDetection.shouldTriggerDefenseCheck
    || abilityRequiresRoll
  );

  const requiresRoll = !combatContext.suppressCombat && (
    hitDetection.shouldTriggerHitCheck
    || hitDetection.shouldTriggerDefenseCheck
    || (type === 'attack' && (combatContext.hasDirectedTarget || hitDetection.detected))
    || abilityRequiresRoll
  );

  return {
    type,
    subType: legacyMoveIntent.actionType?.toLowerCase(),
    isCombatAction,
    requiresRoll,
    confidence,
    sourceHints,
  };
}
