import type { NarrationVoiceSettings, NarratorSceneContext } from '@/systems/narration/SpeechManager';
import { getGeneratedRuntimePackets } from '@/systems/pipeline/GeneratedRuntimeBridge';

export interface NarratorPlaybackMetadata {
  context?: NarratorSceneContext;
  voiceRate?: number;
  voicePitch?: number;
  soundCue?: string;
  animationTag?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizePlaybackMetadata(value: unknown): NarratorPlaybackMetadata | null {
  if (!isRecord(value)) return null;

  const playback: NarratorPlaybackMetadata = {};

  if (typeof value.context === 'string') {
    playback.context = value.context as NarratorSceneContext;
  }
  if (typeof value.voiceRate === 'number' && Number.isFinite(value.voiceRate)) {
    playback.voiceRate = clamp(value.voiceRate, 0.7, 1.3);
  }
  if (typeof value.voicePitch === 'number' && Number.isFinite(value.voicePitch)) {
    playback.voicePitch = clamp(value.voicePitch, 0.8, 1.2);
  }
  if (typeof value.soundCue === 'string' && value.soundCue.trim()) {
    playback.soundCue = value.soundCue.trim();
  }
  if (typeof value.animationTag === 'string' && value.animationTag.trim()) {
    playback.animationTag = value.animationTag.trim();
  }

  return Object.keys(playback).length > 0 ? playback : null;
}

function deriveGeneratedPlayback(source: Record<string, unknown>): NarratorPlaybackMetadata | null {
  const generatedPackets = getGeneratedRuntimePackets(source);
  const generatedSceneState = isRecord(generatedPackets.sceneState) ? generatedPackets.sceneState : null;
  const generatedEffectState = isRecord(generatedPackets.effectState) ? generatedPackets.effectState : null;
  const generatedEncounter = isRecord(generatedPackets.encounter) ? generatedPackets.encounter : null;
  const generatedNpcIdentity = isRecord(generatedPackets.npcIdentity) ? generatedPackets.npcIdentity : null;
  const generatedActorIdentity = isRecord(generatedPackets.actorIdentity) ? generatedPackets.actorIdentity : null;
  const generatedWorldState = isRecord(generatedPackets.worldState) ? generatedPackets.worldState : null;

  if (!generatedSceneState && !generatedEffectState && !generatedEncounter && !generatedNpcIdentity && !generatedActorIdentity && !generatedWorldState) {
    return null;
  }

  const scenePressure = typeof generatedSceneState?.scenePressure === 'string' ? generatedSceneState.scenePressure : 'medium';
  const npcReadiness = typeof generatedSceneState?.npcSocialReadiness === 'string' ? generatedSceneState.npcSocialReadiness : 'guarded';
  const visualIntensity = typeof generatedSceneState?.visualIntensity === 'string' ? generatedSceneState.visualIntensity : 'grounded';
  const combatVolatility = typeof generatedSceneState?.combatVolatility === 'string' ? generatedSceneState.combatVolatility : 'stable';
  const narrationFlags = Array.isArray(generatedSceneState?.narrationToneFlags) ? generatedSceneState.narrationToneFlags as string[] : [];
  const chatBehaviors = Array.isArray(generatedEffectState?.chatBehaviors) ? generatedEffectState.chatBehaviors as string[] : [];
  const soundCueFamilies = Array.isArray(generatedEffectState?.soundCueFamilies) ? generatedEffectState.soundCueFamilies as string[] : [];
  const actorTone = Array.isArray(generatedActorIdentity?.narrativeTone) ? generatedActorIdentity.narrativeTone as string[] : [];
  const actorPressure = Array.isArray(generatedActorIdentity?.pressureStyle) ? generatedActorIdentity.pressureStyle as string[] : [];
  const actorExpression = Array.isArray(generatedActorIdentity?.expressionIdentity) ? generatedActorIdentity.expressionIdentity as string[] : [];
  const worldHazards = Array.isArray(generatedWorldState?.hazardFamilies) ? generatedWorldState.hazardFamilies as string[] : [];
  const worldTravelPressure = Array.isArray(generatedWorldState?.travelPressure) ? generatedWorldState.travelPressure as string[] : [];
  const worldFlavor = Array.isArray(generatedWorldState?.culturalFlavor) ? generatedWorldState.culturalFlavor as string[] : [];
  const powerStyle = Array.isArray(generatedNpcIdentity?.powerStyle) ? generatedNpcIdentity.powerStyle as string[] : [];
  const tacticalPressure = Array.isArray(generatedEncounter?.tacticalPressure) ? generatedEncounter.tacticalPressure as string[] : [];

  const stealthAware = [
    npcReadiness,
    ...narrationFlags,
    ...chatBehaviors,
    ...actorExpression,
    ...actorTone,
    ...powerStyle,
    ...tacticalPressure,
    ...worldTravelPressure,
  ].some((entry) => /stealth|guarded|quiet|cautious|subtle|hushed|measured/.test(entry));

  const explosive = [
    scenePressure,
    visualIntensity,
    combatVolatility,
    ...narrationFlags,
    ...chatBehaviors,
    ...actorPressure,
    ...tacticalPressure,
    ...worldHazards,
  ].some((entry) => /critical|volatile|explosive|impact|hostile|overwhelming|killbox/.test(entry));

  const mystic = [...actorTone, ...worldFlavor, ...narrationFlags, ...soundCueFamilies]
    .some((entry) => /mystic|ritual|charged|omen|wonder/.test(entry));

  const voiceRate = stealthAware
    ? 0.84
    : explosive
      ? 1.12
      : mystic
        ? 0.97
        : scenePressure === 'low'
          ? 0.95
          : scenePressure === 'critical'
            ? 1.16
            : 1.02;
  const voicePitch = stealthAware ? 0.9 : explosive ? 1.08 : mystic ? 1.03 : npcReadiness === 'hostile' ? 1.04 : 0.98;
  const soundCue = stealthAware
    ? 'whisper_tension'
    : explosive
      ? 'combat_surge'
      : mystic
        ? 'mystic_hum'
        : soundCueFamilies.find((entry) => /ambient|cue:|narrator:/.test(entry))?.replace(/^narrator:/, '') || 'ambient_pulse';
  const animationTag = stealthAware
    ? 'fade_out'
    : explosive
      ? 'attack_anim'
      : combatVolatility === 'shifting'
        ? 'step_back'
        : mystic
          ? 'fade_out'
          : 'run';

  return {
    context: stealthAware ? 'whisper' : explosive ? 'combat' : mystic ? 'danger' : 'default',
    voiceRate,
    voicePitch,
    soundCue,
    animationTag,
  };
}

export function getNarratorPlaybackMetadata(source: unknown): NarratorPlaybackMetadata | null {
  if (!isRecord(source)) return null;

  const nested = sanitizePlaybackMetadata(source.narratorPlayback);
  if (nested) return nested;

  const direct = sanitizePlaybackMetadata(source);
  if (direct) return direct;

  return deriveGeneratedPlayback(source);
}

export function buildNarratorMessageMetadata(
  source?: unknown,
  fallback?: Partial<NarratorPlaybackMetadata> | null,
): Record<string, unknown> | undefined {
  const playback = getNarratorPlaybackMetadata(source) ?? sanitizePlaybackMetadata(fallback);
  if (!playback) return undefined;
  return { narratorPlayback: playback };
}

export function buildNarrationPlaybackOptions(source?: unknown) {
  const playback = getNarratorPlaybackMetadata(source);
  if (!playback) return undefined;

  const voiceSettings: NarrationVoiceSettings = {};
  if (typeof playback.voiceRate === 'number') {
    voiceSettings.speed = playback.voiceRate;
  }
  if (typeof playback.voicePitch === 'number') {
    voiceSettings.pitch = playback.voicePitch;
  }

  return {
    context: playback.context,
    soundCue: playback.soundCue,
    animationTag: playback.animationTag,
    voiceSettings: Object.keys(voiceSettings).length > 0 ? voiceSettings : undefined,
  };
}

export function getNarratorAnimationClass(source?: unknown) {
  const playback = getNarratorPlaybackMetadata(source);

  switch (playback?.animationTag) {
    case 'attack_anim':
    case 'strike_fast':
      return 'animate-enter';
    case 'run':
    case 'step_back':
      return 'animate-fade-in';
    case 'fade_out':
      return 'animate-scale-in';
    default:
      return '';
  }
}
