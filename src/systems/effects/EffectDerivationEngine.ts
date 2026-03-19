import type { GeneratedSceneEffectState } from '@/systems/generated/GeneratedSceneEffectState';
import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';
import { AudioEffectDeriver } from './AudioEffectDeriver';
import { ChatEffectDeriver } from './ChatEffectDeriver';
import { VisualEffectDeriver } from './VisualEffectDeriver';

export interface EffectDerivationMetadata {
  sceneEffectPacket?: {
    zoneShiftTags?: string[];
    hazardPulseTags?: string[];
    enemyPresenceTags?: string[];
    environmentalPressureTags?: string[];
  } | null;
  narratorSceneContext?: string | null;
  narrationMetadata?: Record<string, unknown> | null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

export const EffectDerivationEngine = {
  derive(packets: GeneratedRuntimePackets, input: EffectDerivationMetadata = {}): GeneratedSceneEffectState {
    const scene = packets.sceneState;
    const actor = packets.actorIdentity;
    const npc = packets.npcIdentity;
    const world = packets.worldState;
    const encounter = packets.encounter;
    const baseEffect = packets.effectState;
    const sceneEffectPacket = input.sceneEffectPacket;
    const narrationMetadata = input.narrationMetadata || {};

    const visualLayers = uniq([
      ...VisualEffectDeriver.derive(packets),
      ...toStringArray(baseEffect?.backgroundBehavior),
      ...toStringArray(sceneEffectPacket?.zoneShiftTags).map((entry) => `zone:${entry}`),
      ...toStringArray(world?.culturalFlavor).map((entry) => `world-flavor:${entry}`),
      ...toStringArray(actor?.expressionIdentity).map((entry) => `actor:${entry}`),
    ]);
    const audioLayers = uniq([
      ...AudioEffectDeriver.derive(packets),
      ...toStringArray(baseEffect?.soundCueFamilies),
      ...toStringArray(sceneEffectPacket?.environmentalPressureTags).map((entry) => `pressure:${entry}`),
      ...toStringArray(world?.hazardFamilies).map((entry) => `hazard:${entry}`),
    ]);
    const chatBehaviors = uniq([
      ...ChatEffectDeriver.derive(packets),
      ...toStringArray(baseEffect?.textEmphasisStyle),
      ...toStringArray(sceneEffectPacket?.enemyPresenceTags).map((entry) => `enemy:${entry}`),
      ...toStringArray(npc?.socialPosture).map((entry) => `npc:${entry}`),
    ]);
    const statusOverlays = uniq([
      ...toStringArray(baseEffect?.statusOverlays),
      ...toStringArray(scene?.narrationToneFlags),
      ...toStringArray(actor?.dangerProfile).map((entry) => `danger:${entry}`),
    ]);
    const environmentPersistence = uniq([
      ...toStringArray(baseEffect?.environmentPersistence),
      ...toStringArray(scene?.environmentalPressure),
      ...toStringArray(world?.travelPressure),
      ...toStringArray(sceneEffectPacket?.hazardPulseTags).map((entry) => `hazard:${entry}`),
    ]);
    const burstImpacts = uniq([
      ...toStringArray(baseEffect?.burstImpacts),
      ...toStringArray(scene?.effectTags),
      ...toStringArray(encounter?.recommendedEffectTags),
      ...toStringArray(sceneEffectPacket?.enemyPresenceTags).map((entry) => `burst:${entry}`),
    ]);
    const backgroundBehavior = uniq([
      ...toStringArray(baseEffect?.backgroundBehavior),
      ...visualLayers.filter((entry) => /intensity|world-flavor|visual:|zone:/.test(entry)),
      input.narratorSceneContext ? `background:${input.narratorSceneContext}` : null,
    ]);
    const overlayPersistence = uniq([
      ...toStringArray(baseEffect?.overlayPersistence),
      ...environmentPersistence,
      ...statusOverlays.filter((entry) => /tone:|danger:/.test(entry)),
    ]);
    const pulsePatterns = uniq([
      ...toStringArray(baseEffect?.pulsePatterns),
      ...toStringArray(sceneEffectPacket?.hazardPulseTags).map((entry) => `pulse:${entry}`),
      scene?.scenePressure ? `pulse:${scene.scenePressure}` : null,
      scene?.npcSocialReadiness ? `pulse-social:${scene.npcSocialReadiness}` : null,
    ]);
    const impactBursts = uniq([
      ...toStringArray(baseEffect?.impactBursts),
      ...burstImpacts,
      ...toStringArray(sceneEffectPacket?.environmentalPressureTags).map((entry) => `impact:${entry}`),
    ]);
    const motionTexture = uniq([
      ...toStringArray(baseEffect?.motionTexture),
      ...visualLayers.filter((entry) => /intensity|visual:|zone:/.test(entry)),
      scene?.movementFriction ? `motion:${scene.movementFriction}` : null,
      ...toStringArray(actor?.movementStyle).map((entry) => `actor-motion:${entry}`),
    ]);
    const soundCueFamilies = uniq([
      ...toStringArray(baseEffect?.soundCueFamilies),
      ...audioLayers,
      typeof narrationMetadata.soundCue === 'string' ? `narrator:${narrationMetadata.soundCue}` : null,
      scene?.scenePressure ? `cue:${scene.scenePressure}` : null,
    ]);
    const textEmphasisStyle = uniq([
      ...toStringArray(baseEffect?.textEmphasisStyle),
      ...chatBehaviors,
      ...toStringArray(actor?.narrativeTone).map((entry) => `tone:${entry}`),
      ...toStringArray(npc?.relationshipPosture).map((entry) => `relation:${entry}`),
    ]);
    const narratorHighlightFlavor = uniq([
      ...toStringArray(baseEffect?.narratorHighlightFlavor),
      ...toStringArray(scene?.narrationToneFlags),
      ...toStringArray(actor?.narrativeTone),
      ...toStringArray(world?.culturalFlavor),
      ...toStringArray(encounter?.stakes),
    ]);
    const tags = uniq([
      ...toStringArray(baseEffect?.tags),
      ...toStringArray(scene?.effectTags),
      ...visualLayers,
      ...audioLayers,
      ...chatBehaviors,
    ]);

    return {
      blueprintId: baseEffect?.blueprintId,
      visualLayers,
      audioLayers,
      chatBehaviors,
      statusOverlays,
      environmentPersistence,
      burstImpacts,
      backgroundBehavior,
      overlayPersistence,
      pulsePatterns,
      impactBursts,
      motionTexture,
      soundCueFamilies,
      textEmphasisStyle,
      narratorHighlightFlavor,
      tags,
      metadata: {
        narrationMetadata,
        packets,
      },
    };
  },
};
