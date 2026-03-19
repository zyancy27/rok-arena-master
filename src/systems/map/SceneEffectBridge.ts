import { ChatPresentationProfileBuilder } from '@/systems/effects/ChatPresentationProfileBuilder';
import { buildGeneratedRuntimeMetadata } from '@/systems/pipeline/GeneratedRuntimeBridge';
import { ScenePresentationProfileBuilder } from '@/systems/scene/ScenePresentationProfileBuilder';
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
    const generatedPackets = context.generated ?? {};
    const generatedActorIdentity = asRecord(generatedPackets.actorIdentity);
    const generatedNpcIdentity = asRecord(generatedPackets.npcIdentity);
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
      ...toStringArray(generatedActorIdentity.movementIdentity).slice(0, 2).map((entry) => `actor-motion:${entry}`),
      ...toStringArray(generatedEffectState.motionTexture).slice(0, 2).map((entry) => `motion:${entry}`),
      ...toStringArray(generatedEffectState.backgroundBehavior).slice(0, 2).map((entry) => `background:${entry}`),
    ].filter((tag): tag is string => Boolean(tag));

    const hazardPulseTags = [
      ...context.activeHazards.map((hazard) => `hazard:${hazard}`),
      ...toStringArray(generatedWorldState.hazardFamilies).map((hazard) => `world-hazard:${hazard}`),
      ...toStringArray(generatedWorldState.visualEffectProfile).slice(0, 2).map((entry) => `world-visual:${entry}`),
      ...toStringArray(generatedSceneState.effectTags).slice(0, 2).map((tag) => `scene-effect:${tag}`),
      ...toStringArray(generatedActorIdentity.effectBias).slice(0, 2).map((entry) => `actor-effect:${entry}`),
      ...toStringArray(generatedNpcIdentity.effectBias).slice(0, 2).map((entry) => `npc-effect:${entry}`),
      ...toStringArray(generatedEffectState.environmentPersistence).slice(0, 2).map((entry) => `persist:${entry}`),
      ...toStringArray(generatedEffectState.pulsePatterns).slice(0, 2).map((entry) => `pulse:${entry}`),
    ];

    const enemyPresenceTags = [
      ...context.targets.filter((target) => target.kind === 'enemy').map((target) => `enemy:${target.name}`),
      ...toStringArray(generatedEncounter.threatComposition).map((threat) => `threat:${threat}`),
      ...toStringArray(generatedEncounter.tacticalPressure).slice(0, 2).map((pressure) => `tactical:${pressure}`),
      ...toStringArray(generatedNpcIdentity.threatPosture).slice(0, 2).map((entry) => `npc-threat:${entry}`),
      ...toStringArray(generatedNpcIdentity.rolePosture).slice(0, 2).map((entry) => `npc-role:${entry}`),
      ...toStringArray(generatedEffectState.impactBursts).slice(0, 2).map((entry) => `impact:${entry}`),
    ];

    const environmentalPressureTags = [
      context.narratorSceneContext !== 'default' ? `pressure:${context.narratorSceneContext}` : null,
      !resolvedAction.actionResult.success ? 'pressure:failure' : null,
      npcReaction?.summary ? 'pressure:npc-reactive' : null,
      ...toStringArray(generatedSceneState.environmentalPressure).map((entry) => `pressure:${entry}`),
      ...toStringArray(generatedSceneState.narrationToneFlags).slice(0, 2).map((entry) => `tone:${entry}`),
      ...toStringArray(generatedActorIdentity.narrationBias).slice(0, 2).map((entry) => `actor-tone:${entry}`),
      ...toStringArray(generatedNpcIdentity.narrationBias).slice(0, 2).map((entry) => `npc-tone:${entry}`),
      ...toStringArray(generatedWorldState.audioPressureProfile).slice(0, 2).map((entry) => `world-audio:${entry}`),
      ...toStringArray(generatedEffectState.burstImpacts).slice(0, 2).map((entry) => `effect:${entry}`),
      ...toStringArray(generatedEffectState.overlayPersistence).slice(0, 2).map((entry) => `overlay:${entry}`),
      ...toStringArray(generatedEffectState.textEmphasisStyle).slice(0, 2).map((entry) => `chat:${entry}`),
    ].filter((tag): tag is string => Boolean(tag));

    const scenePresentationProfile = ScenePresentationProfileBuilder.build(generatedPackets, {
      zoneShiftTags,
      hazardPulseTags,
      enemyPresenceTags,
      environmentalPressureTags,
      generated: generatedPackets,
    });
    const narratorChatProfile = ChatPresentationProfileBuilder.build(generatedPackets, {
      speakerRole: 'narrator',
      sceneEffectPacket: {
        zoneShiftTags,
        hazardPulseTags,
        enemyPresenceTags,
        environmentalPressureTags,
        generated: generatedPackets,
      },
    });
    const chatPresentationTags = [...new Set([
      ...toStringArray(generatedSceneState.chatPresentationTags),
      ...scenePresentationProfile.chatPresentationFlavor,
      ...narratorChatProfile.boxTreatment,
    ])];
    const ambientCueFamilies = [...new Set([
      ...scenePresentationProfile.soundCueFamilies,
      ...narratorChatProfile.cueFamilyBias,
    ])];

    return {
      zoneShiftTags: [...new Set(zoneShiftTags)],
      hazardPulseTags: [...new Set(hazardPulseTags)],
      enemyPresenceTags: [...new Set(enemyPresenceTags)],
      environmentalPressureTags: [...new Set(environmentalPressureTags)],
      chatPresentationTags,
      ambientCueFamilies,
      scenePresentationProfile,
      generated: generatedPackets,
      metadata: {
        zone: context.zone,
        narratorSceneContext: context.narratorSceneContext,
        narratorChatProfile,
        ...buildGeneratedRuntimeMetadata(generatedPackets),
      },
    };
  },
};