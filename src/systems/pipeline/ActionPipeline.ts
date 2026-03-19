import { ActionResolver, formatActionForNarrator } from '@/systems/resolution/ActionResolver';
import { formatCombatResolutionForNarrator, toActionResult, type StructuredCombatResult } from '@/systems/combat/CombatResolver';
import type { ContextPacket, ResolvedActionPacket } from '@/systems/types/PipelineTypes';
import type { IntentEngineResult } from '@/systems/intent/IntentEngine';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';

export interface BuildResolvedActionPacketInput {
  rawText: string;
  intentResult: IntentEngineResult;
  context: ContextPacket;
  actorContext: ResolvedCharacterContext;
  targetContext?: ResolvedCharacterContext | null;
  combatResult?: StructuredCombatResult | null;
}

export function buildResolvedActionPacket(input: BuildResolvedActionPacketInput): ResolvedActionPacket {
  const actionResult = input.combatResult
    ? toActionResult(input.combatResult)
    : ActionResolver.resolve(input.intentResult.intent, input.actorContext, {
        activeHazards: input.context.activeHazards,
        hasActiveThreat: input.context.targets.some((target) => target.kind === 'enemy'),
        currentZone: input.context.zone,
      });

  const structuredAction = input.combatResult
    ? formatCombatResolutionForNarrator(input.intentResult.intent, input.combatResult, input.rawText)
    : formatActionForNarrator(input.intentResult.intent, actionResult, input.rawText);

  return {
    rawText: input.rawText,
    intent: input.intentResult.intent,
    intentDebug: input.intentResult.debug,
    legacyMoveIntent: input.intentResult.legacyMoveIntent,
    confidence: input.intentResult.confidence,
    actorContext: input.actorContext,
    targetContext: input.targetContext,
    actionResult,
    combatResult: input.combatResult ?? null,
    structuredAction,
    context: input.context,
  };
}
