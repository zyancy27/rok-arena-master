import type { NarrationVoiceSettings, NarratorSceneContext } from '@/systems/narration/SpeechManager';

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
  const generatedSceneState = isRecord(source.generatedSceneState) ? source.generatedSceneState : null;
  const generatedEffectState = isRecord(source.generatedEffectState) ? source.generatedEffectState : null;
  const generatedEncounter = isRecord(source.generatedEncounter) ? source.generatedEncounter : null;
  const generatedNpcIdentity = isRecord(source.generatedNpcIdentity) ? source.generatedNpcIdentity : null;

  if (!generatedSceneState && !generatedEffectState && !generatedEncounter && !generatedNpcIdentity) {
    return null;
  }

  const scenePressure = typeof generatedSceneState?.scenePressure === 'string' ? generatedSceneState.scenePressure : 'medium';
  const npcReadiness = typeof generatedSceneState?.npcSocialReadiness === 'string' ? generatedSceneState.npcSocialReadiness : 'guarded';
  const visualIntensity = typeof generatedSceneState?.visualIntensity === 'string' ? generatedSceneState.visualIntensity : 'grounded';
  const combatVolatility = typeof generatedSceneState?.combatVolatility === 'string' ? generatedSceneState.combatVolatility : 'stable';
  const narrationFlags = Array.isArray(generatedSceneState?.narrationToneFlags) ? generatedSceneState.narrationToneFlags as string[] : [];
  const chatBehaviors = Array.isArray(generatedEffectState?.chatBehaviors) ? generatedEffectState.chatBehaviors as string[] : [];
  const powerStyle = Array.isArray(generatedNpcIdentity?.powerStyle) ? generatedNpcIdentity.powerStyle as string[] : [];
  const tacticalPressure = Array.isArray(generatedEncounter?.tacticalPressure) ? generatedEncounter.tacticalPressure as string[] : [];

  const stealthAware = [npcReadiness, ...narrationFlags, ...chatBehaviors, ...powerStyle, ...tacticalPressure]
    .some((entry) => /stealth|guarded|quiet|cautious|subtle/.test(entry));
  const explosive = [scenePressure, visualIntensity, combatVolatility, ...narrationFlags, ...chatBehaviors]
    .some((entry) => /critical|volatile|explosive|impact|hostile/.test(entry));

  const voiceRate = stealthAware ? 0.84 : explosive ? 1.12 : scenePressure === 'low' ? 0.95 : scenePressure === 'critical' ? 1.16 : 1.02;
  const voicePitch = stealthAware ? 0.9 : explosive ? 1.08 : npcReadiness === 'hostile' ? 1.04 : 0.98;
  const soundCue = stealthAware
    ? 'whisper_tension'
    : explosive
      ? 'combat_surge'
      : /tone:charged/.test(narrationFlags.join(' '))
        ? 'mystic_hum'
        : 'ambient_pulse';
  const animationTag = stealthAware
    ? 'fade_out'
    : explosive
      ? 'attack_anim'
      : combatVolatility === 'shifting'
        ? 'step_back'
        : 'run';

  return {
    context: stealthAware ? 'stealth' : explosive ? 'combat' : 'default',
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
