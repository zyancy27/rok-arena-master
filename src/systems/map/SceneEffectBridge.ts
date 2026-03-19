import { buildGeneratedRuntimeMetadata, getGeneratedRuntimePackets } from '@/systems/pipeline/GeneratedRuntimeBridge';
import type { ContextPacket, NpcReactionPacket, ResolvedActionPacket, SceneEffectPacket } from '@/systems/types/PipelineTypes';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export const SceneEffectBridge = {
  build(context: ContextPacket, resolvedAction: ResolvedActionPacket, npcReaction?: NpcReactionPacket | null): SceneEffectPacket {
    const combatRangeTag = resolvedAction.combatResult?.positioning?.resolvedRange;
    const generatedPackets = context.generated ?? getGeneratedRuntimePackets(context.metadata);
    const generatedWorldState = asRecord(generatedPackets.worldState);
    const generatedEncounter = asRecord(generatedPackets.encounter);
    const generatedSceneState = {
      ...asRecord(generatedPackets.sceneState),
      ...asRecord(context.sceneState),
    };
    const generatedEffectState = asRecord(generatedPackets.effectState);

    const zoneShiftTags = [
      combatRangeTag ? `range:${combatRangeTag}` : null,
      typeof generatedSceneState.movementFriction === 'string' ? `friction:${generatedSceneState.movementFriction}` : null,
      typeof generatedSceneState.visualIntensity === 'string' ? `visual:${generatedSceneState.visualIntensity}` : null,
    ].filter((tag): tag is string => Boolean(tag));

    const hazardPulseTags = [
      ...context.activeHazards.map((hazard) => `hazard:${hazard}`),
      ...toStringArray(generatedWorldState.hazardFamilies).map((hazard) => `world-hazard:${hazard}`),
      ...toStringArray(generatedSceneState.effectTags).slice(0, 2).map((tag) => `scene-effect:${tag}`),
      ...toStringArray(generatedEffectState.environmentPersistence).slice(0, 2).map((entry) => `persist:${entry}`),
    ];

    const enemyPresenceTags = [
      ...context.targets
        .filter((target) => target.kind === 'enemy')
        .map((target) => `enemy:${target.name}`),
      ...toStringArray(generatedEncounter.threatComposition).map((threat) => `threat:${threat}`),
      ...toStringArray(generatedEncounter.tacticalPressure).slice(0, 2).map((pressure) => `tactical:${pressure}`),
    ];

    const environmentalPressureTags = [
      context.narratorSceneContext !== 'default' ? `pressure:${context.narratorSceneContext}` : null,
      !resolvedAction.actionResult.success ? 'pressure:failure' : null,
      npcReaction?.summary ? 'pressure:npc-reactive' : null,
      ...toStringArray(generatedSceneState.environmentalPressure).map((entry) => `pressure:${entry}`),
      ...toStringArray(generatedSceneState.narrationToneFlags).slice(0, 2).map((entry) => `tone:${entry}`),
      ...toStringArray(generatedEffectState.burstImpacts).slice(0, 2).map((entry) => `effect:${entry}`),
    ].filter((tag): tag is string => Boolean(tag));

    return {
      zoneShiftTags: [...new Set(zoneShiftTags)],
      hazardPulseTags: [...new Set(hazardPulseTags)],
      enemyPresenceTags: [...new Set(enemyPresenceTags)],
      environmentalPressureTags: [...new Set(environmentalPressureTags)],
      generated: generatedPackets,
      metadata: {
        zone: context.zone,
        narratorSceneContext: context.narratorSceneContext,
        ...buildGeneratedRuntimeMetadata(generatedPackets),
      },
    };
  },
};
