import type { GeneratedRuntimePackets, SceneEffectPacket } from '@/systems/types/PipelineTypes';

export interface ScenePresentationProfile {
  scenePressure: 'low' | 'medium' | 'high' | 'critical';
  volatility: 'stable' | 'shifting' | 'volatile' | 'explosive';
  movementFriction: 'open' | 'contested' | 'restricted' | 'locked';
  visualIntensity: 'subtle' | 'grounded' | 'elevated' | 'volatile';
  backgroundBehavior: string[];
  overlayPersistence: string[];
  pulseStyle: string[];
  impactTexture: string[];
  soundCueFamilies: string[];
  textEmphasisFlavor: string[];
  atmospherePersistence: string[];
  visualTone: string[];
  audioTone: string[];
  chatPresentationFlavor: string[];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

export const ScenePresentationProfileBuilder = {
  build(packets: GeneratedRuntimePackets, sceneEffectPacket?: SceneEffectPacket | null): ScenePresentationProfile {
    const scene = packets.sceneState;
    const effect = packets.effectState;
    const actor = packets.actorIdentity;
    const npc = packets.npcIdentity;
    const world = packets.worldState;

    const backgroundBehavior = uniq([
      ...toStringArray(effect?.backgroundBehavior),
      ...toStringArray(world?.environmentalIdentity).map((entry) => `world:${entry}`),
      ...toStringArray(actor?.environmentalFit).map((entry) => `actor:${entry}`),
      ...toStringArray(sceneEffectPacket?.zoneShiftTags).filter((entry) => /background:|visual:|world-visual:/.test(entry)),
    ]);
    const overlayPersistence = uniq([
      ...toStringArray(effect?.overlayPersistence),
      ...toStringArray(effect?.environmentPersistence),
      ...toStringArray(scene?.environmentalPressure).map((entry) => `pressure:${entry}`),
      ...toStringArray(sceneEffectPacket?.environmentalPressureTags).filter((entry) => /overlay:|pressure:|tone:/.test(entry)),
    ]);
    const pulseStyle = uniq([
      ...toStringArray(effect?.pulsePatterns),
      ...toStringArray(sceneEffectPacket?.hazardPulseTags).filter((entry) => /pulse:|hazard:|world-hazard:/.test(entry)),
      scene?.combatVolatility ? `volatility:${scene.combatVolatility}` : null,
      scene?.scenePressure ? `pressure:${scene.scenePressure}` : null,
    ]);
    const impactTexture = uniq([
      ...toStringArray(effect?.impactBursts),
      ...toStringArray(effect?.burstImpacts),
      ...toStringArray(sceneEffectPacket?.enemyPresenceTags).filter((entry) => /impact:|npc-threat:|threat:|enemy:/.test(entry)),
      ...toStringArray(npc?.dangerStyle).map((entry) => `danger:${entry}`),
    ]);
    const soundCueFamilies = uniq([
      ...toStringArray(effect?.soundCueFamilies),
      ...toStringArray(world?.audioPressureProfile).map((entry) => `world:${entry}`),
      ...toStringArray(sceneEffectPacket?.environmentalPressureTags).filter((entry) => /world-audio:|pressure:|tone:/.test(entry)),
    ]);
    const textEmphasisFlavor = uniq([
      ...toStringArray(effect?.textEmphasisStyle),
      ...toStringArray(actor?.narrationBias).map((entry) => `actor:${entry}`),
      ...toStringArray(npc?.interactionStyle).map((entry) => `npc:${entry}`),
      ...toStringArray(scene?.chatPresentationTags),
    ]);
    const atmospherePersistence = uniq([
      ...toStringArray(effect?.environmentPersistence),
      ...toStringArray(world?.travelPressure),
      ...toStringArray(world?.hazardPosture),
      ...toStringArray(scene?.environmentalPressure),
    ]);
    const visualTone = uniq([
      scene?.visualIntensity ? `intensity:${scene.visualIntensity}` : null,
      ...toStringArray(world?.visualEffectProfile),
      ...backgroundBehavior,
      ...toStringArray(effect?.visualLayers).filter((entry) => /world:|intensity:|visual:/.test(entry)),
    ]);
    const audioTone = uniq([
      scene?.scenePressure ? `pressure:${scene.scenePressure}` : null,
      ...soundCueFamilies,
      ...toStringArray(effect?.audioLayers),
    ]);
    const chatPresentationFlavor = uniq([
      ...toStringArray(scene?.chatPresentationTags),
      ...textEmphasisFlavor,
      ...toStringArray(effect?.chatBehaviors),
    ]);

    return {
      scenePressure: scene?.scenePressure ?? 'medium',
      volatility: scene?.combatVolatility ?? 'shifting',
      movementFriction: scene?.movementFriction ?? 'contested',
      visualIntensity: scene?.visualIntensity ?? 'grounded',
      backgroundBehavior,
      overlayPersistence,
      pulseStyle,
      impactTexture,
      soundCueFamilies,
      textEmphasisFlavor,
      atmospherePersistence,
      visualTone,
      audioTone,
      chatPresentationFlavor,
    };
  },
};
