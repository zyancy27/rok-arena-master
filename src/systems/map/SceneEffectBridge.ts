import type { ContextPacket, NpcReactionPacket, ResolvedActionPacket, SceneEffectPacket } from '@/systems/types/PipelineTypes';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const SceneEffectBridge = {
  build(context: ContextPacket, resolvedAction: ResolvedActionPacket, npcReaction?: NpcReactionPacket | null): SceneEffectPacket {
    const combatRangeTag = resolvedAction.combatResult?.positioning?.resolvedRange;
    const metadata = asRecord(context.metadata);
    const generatedWorldState = asRecord(metadata.generatedWorldState);
    const generatedEncounter = asRecord(metadata.generatedEncounter);
    const generatedSceneState = asRecord(metadata.generatedSceneState);
    const generatedEffectState = asRecord(metadata.generatedEffectState);

    const zoneShiftTags = [
      combatRangeTag ? `range:${combatRangeTag}` : null,
      typeof generatedSceneState.movementFriction === 'string' ? `friction:${generatedSceneState.movementFriction}` : null,
    ].filter((tag): tag is string => Boolean(tag));

    const hazardPulseTags = [
      ...context.activeHazards.map((hazard) => `hazard:${hazard}`),
      ...(Array.isArray(generatedWorldState.hazardFamilies) ? generatedWorldState.hazardFamilies.map((hazard) => `world-hazard:${hazard}`) : []),
    ];

    const enemyPresenceTags = [
      ...context.targets
        .filter((target) => target.kind === 'enemy')
        .map((target) => `enemy:${target.name}`),
      ...(Array.isArray(generatedEncounter.threatComposition) ? generatedEncounter.threatComposition.map((threat) => `threat:${threat}`) : []),
    ];

    const environmentalPressureTags = [
      context.narratorSceneContext !== 'default' ? `pressure:${context.narratorSceneContext}` : null,
      !resolvedAction.actionResult.success ? 'pressure:failure' : null,
      npcReaction?.summary ? 'pressure:npc-reactive' : null,
      ...(Array.isArray(generatedSceneState.environmentalPressure) ? generatedSceneState.environmentalPressure.map((entry) => `pressure:${entry}`) : []),
      ...(Array.isArray(generatedEffectState.burstImpacts) ? generatedEffectState.burstImpacts.slice(0, 2).map((entry) => `effect:${entry}`) : []),
    ].filter((tag): tag is string => Boolean(tag));

    return {
      zoneShiftTags: [...new Set(zoneShiftTags)],
      hazardPulseTags: [...new Set(hazardPulseTags)],
      enemyPresenceTags: [...new Set(enemyPresenceTags)],
      environmentalPressureTags: [...new Set(environmentalPressureTags)],
      metadata: {
        zone: context.zone,
        narratorSceneContext: context.narratorSceneContext,
        generatedSceneState,
        generatedEncounter,
      },
    };
  },
};

