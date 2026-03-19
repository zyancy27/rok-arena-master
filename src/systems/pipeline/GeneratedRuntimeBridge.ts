import type { NarratorSceneContext } from '@/systems/narration/SpeechManager';
import type { ContextPacket, GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';

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

export function getGeneratedRuntimePackets(source: unknown): GeneratedRuntimePackets {
  const record = asRecord(source);
  const nested = asRecord(record.generated ?? record.generatedPackets);

  return {
    actorIdentity: nested.actorIdentity ?? record.generatedActorIdentity,
    worldState: nested.worldState ?? record.generatedWorldState,
    campaignSeed: nested.campaignSeed ?? record.generatedCampaignSeed,
    npcIdentity: nested.npcIdentity ?? record.generatedNpcIdentity,
    encounter: nested.encounter ?? record.generatedEncounter,
    sceneState: nested.sceneState ?? record.generatedSceneState,
    effectState: nested.effectState ?? record.generatedEffectState,
  };
}

export function hasGeneratedRuntimePackets(packets: GeneratedRuntimePackets | null | undefined) {
  if (!packets) return false;
  return Object.values(packets).some((value) => value !== undefined && value !== null);
}

export function buildGeneratedRuntimeMetadata(packets: GeneratedRuntimePackets | null | undefined): Record<string, unknown> {
  if (!hasGeneratedRuntimePackets(packets)) return {};

  return {
    generatedPackets: packets,
    ...(packets?.actorIdentity ? { generatedActorIdentity: packets.actorIdentity } : {}),
    ...(packets?.worldState ? { generatedWorldState: packets.worldState } : {}),
    ...(packets?.campaignSeed ? { generatedCampaignSeed: packets.campaignSeed } : {}),
    ...(packets?.npcIdentity ? { generatedNpcIdentity: packets.npcIdentity } : {}),
    ...(packets?.encounter ? { generatedEncounter: packets.encounter } : {}),
    ...(packets?.sceneState ? { generatedSceneState: packets.sceneState } : {}),
    ...(packets?.effectState ? { generatedEffectState: packets.effectState } : {}),
  };
}

export function deriveNarratorSceneContext(
  sceneStateSource: unknown,
  fallback: NarratorSceneContext,
): NarratorSceneContext {
  const sceneState = asRecord(sceneStateSource);
  const scenePressure = typeof sceneState.scenePressure === 'string' ? sceneState.scenePressure : null;
  const combatVolatility = typeof sceneState.combatVolatility === 'string' ? sceneState.combatVolatility : null;
  const npcSocialReadiness = typeof sceneState.npcSocialReadiness === 'string' ? sceneState.npcSocialReadiness : null;
  const hazardDensity = typeof sceneState.hazardDensity === 'string' ? sceneState.hazardDensity : null;
  const visualIntensity = typeof sceneState.visualIntensity === 'string' ? sceneState.visualIntensity : null;

  if (
    scenePressure === 'critical'
    || scenePressure === 'high'
    || combatVolatility === 'explosive'
    || combatVolatility === 'volatile'
    || npcSocialReadiness === 'hostile'
  ) {
    return 'combat';
  }

  if (
    hazardDensity === 'overwhelming'
    || hazardDensity === 'dense'
    || npcSocialReadiness === 'tense'
    || visualIntensity === 'volatile'
  ) {
    return 'danger';
  }

  if (scenePressure === 'low' || scenePressure === 'medium' || visualIntensity === 'subtle' || visualIntensity === 'grounded') {
    return fallback === 'default' ? 'exploration' : fallback;
  }

  return fallback;
}

export function buildCanonicalSceneState(
  baseSceneState: Record<string, unknown> | null | undefined,
  packets: GeneratedRuntimePackets | null | undefined,
): Record<string, unknown> {
  const base = asRecord(baseSceneState);
  const actorIdentity = asRecord(packets?.actorIdentity);
  const worldState = asRecord(packets?.worldState);
  const campaignSeed = asRecord(packets?.campaignSeed);
  const npcIdentity = asRecord(packets?.npcIdentity);
  const encounter = asRecord(packets?.encounter);
  const sceneState = asRecord(packets?.sceneState);
  const effectState = asRecord(packets?.effectState);

  return {
    ...base,
    scenePressure: sceneState.scenePressure ?? base.scenePressure ?? null,
    emotionalTone: toStringArray(sceneState.emotionalTone).length > 0 ? toStringArray(sceneState.emotionalTone) : toStringArray(base.emotionalTone),
    visualIntensity: sceneState.visualIntensity ?? base.visualIntensity ?? null,
    hazardDensity: sceneState.hazardDensity ?? base.hazardDensity ?? null,
    movementFriction: sceneState.movementFriction ?? base.movementFriction ?? null,
    combatVolatility: sceneState.combatVolatility ?? base.combatVolatility ?? null,
    npcSocialReadiness: sceneState.npcSocialReadiness ?? base.npcSocialReadiness ?? null,
    narrationToneFlags: [...new Set([...toStringArray(base.narrationToneFlags), ...toStringArray(sceneState.narrationToneFlags)])],
    effectTags: [...new Set([...toStringArray(base.effectTags), ...toStringArray(sceneState.effectTags), ...toStringArray(effectState.burstImpacts)])],
    chatPresentationTags: [...new Set([...toStringArray(base.chatPresentationTags), ...toStringArray(sceneState.chatPresentationTags), ...toStringArray(effectState.chatBehaviors)])],
    environmentalPressure: [...new Set([...toStringArray(base.environmentalPressure), ...toStringArray(sceneState.environmentalPressure), ...toStringArray(effectState.environmentPersistence)])],
    actorPressureStyle: toStringArray(actorIdentity.pressureStyle),
    actorNarrativeTone: toStringArray(actorIdentity.narrativeTone),
    worldHazardFamilies: toStringArray(worldState.hazardFamilies),
    worldTravelPressure: toStringArray(worldState.travelPressure),
    campaignPressureSources: toStringArray(campaignSeed.pressureSources),
    npcSocialPosture: toStringArray(npcIdentity.socialPosture),
    tacticalPressure: toStringArray(encounter.tacticalPressure),
    visualLayers: toStringArray(effectState.visualLayers),
    audioLayers: toStringArray(effectState.audioLayers),
  };
}

export function attachGeneratedToContext(context: ContextPacket, packets: GeneratedRuntimePackets): ContextPacket {
  context.generated = packets;
  context.sceneState = buildCanonicalSceneState(context.sceneState, packets);
  context.worldState = {
    ...(context.worldState || {}),
    ...(packets.worldState ? { generatedWorldState: packets.worldState } : {}),
    ...(packets.campaignSeed ? { generatedCampaignSeed: packets.campaignSeed } : {}),
    narratorSceneContext: deriveNarratorSceneContext(packets.sceneState, context.narratorSceneContext),
  };
  context.narratorSceneContext = deriveNarratorSceneContext(packets.sceneState, context.narratorSceneContext);
  context.metadata = {
    ...(context.metadata || {}),
    ...buildGeneratedRuntimeMetadata(packets),
  };
  return context;
}
