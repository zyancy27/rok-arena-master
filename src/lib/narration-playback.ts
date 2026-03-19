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

export function getNarratorPlaybackMetadata(source: unknown): NarratorPlaybackMetadata | null {
  if (!isRecord(source)) return null;

  const nested = sanitizePlaybackMetadata(source.narratorPlayback);
  if (nested) return nested;

  return sanitizePlaybackMetadata(source);
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
