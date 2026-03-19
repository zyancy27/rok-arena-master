import type { ContextPacket, NpcReactionPacket, ResolvedActionPacket, SceneEffectPacket } from '@/systems/types/PipelineTypes';

export const SceneEffectBridge = {
  build(context: ContextPacket, resolvedAction: ResolvedActionPacket, npcReaction?: NpcReactionPacket | null): SceneEffectPacket {
    const combatRangeTag = resolvedAction.combatResult?.positioning?.resolvedRange;
    const zoneShiftTags = combatRangeTag ? [`range:${combatRangeTag}`] : [];
    const hazardPulseTags = context.activeHazards.map((hazard) => `hazard:${hazard}`);
    const enemyPresenceTags = context.targets
      .filter((target) => target.kind === 'enemy')
      .map((target) => `enemy:${target.name}`);
    const environmentalPressureTags = [
      context.narratorSceneContext !== 'ambient' ? `pressure:${context.narratorSceneContext}` : null,
      !resolvedAction.actionResult.success ? 'pressure:failure' : null,
      npcReaction?.summary ? 'pressure:npc-reactive' : null,
    ].filter((tag): tag is string => Boolean(tag));

    return {
      zoneShiftTags,
      hazardPulseTags,
      enemyPresenceTags,
      environmentalPressureTags,
      metadata: {
        zone: context.zone,
        narratorSceneContext: context.narratorSceneContext,
      },
    };
  },
};
