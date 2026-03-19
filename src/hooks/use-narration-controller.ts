/**
 * useNarrationController — React hook wrapping the singleton Narration Orchestrator.
 * Provides reactive state for UI: narration state, active sentence/range, active message,
 * tap confirmation flow, and synchronized ambient cue settings.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getNarrationController, type NarrationState, type NarrationSnapshot } from '@/systems/narration';
import type { NarrationVoiceSettings, NarratorSceneContext } from '@/systems/narration/SpeechManager';
import type { AmbientIntensityLevel } from '@/lib/audio/narration-sound-rules';
import type { NarrationHighlightRange } from '@/systems/narration/NarrationHighlightManager';
import { toast } from 'sonner';

interface UseNarrationControllerOptions {
  enabled: boolean;
  voiceVolume: number;
  soundVolume: number;
  tapToNarrate: boolean;
  askBeforeTapToNarrate?: boolean;
  narrationHighlightEnabled?: boolean;
  narrationDebug?: boolean;
  hasAIAccess?: boolean;
  ambientEnabled?: boolean;
  ambientIntensity?: string;
  ambientVolume?: number;
  masterVolume?: number;
  reduceVocalSounds?: boolean;
}

export interface NarrationPlaybackOptions {
  context?: NarratorSceneContext;
  soundCue?: string;
  animationTag?: string;
  voiceSettings?: NarrationVoiceSettings;
}

interface PendingTapRequest {
  text: string;
  messageId: string;
  sentenceIndex: number;
  options?: NarrationPlaybackOptions;
}

function normalizePlaybackOptions(input?: NarratorSceneContext | NarrationPlaybackOptions): NarrationPlaybackOptions {
  if (!input) return {};
  return typeof input === 'string' ? { context: input } : input;
}

export function useNarrationController(options: UseNarrationControllerOptions) {
...
  const narrate = useCallback(async (
    text: string,
    messageId: string,
    contextOrOptions?: NarratorSceneContext | NarrationPlaybackOptions,
    startFromSentence = 0,
  ) => {
    if (!options.enabled || options.hasAIAccess === false) return;
    try {
      const playback = normalizePlaybackOptions(contextOrOptions);
      if (playback.soundCue) {
        controller.current.playCue(playback.soundCue, playback.context === 'combat' ? 'combat' : 'tense');
      }
      const startCharIndex = startFromSentence > 0
        ? controller.current.highlight.getCharIndexForSentence(startFromSentence)
        : 0;
      await controller.current.narrate(
        text,
        messageId,
        playback.context,
        startCharIndex,
        startFromSentence > 0 ? 'replay' : 'initial',
        playback.voiceSettings,
      );
    } catch {
      toast.error('Narrator voice unavailable');
    }
  }, [options.enabled, options.hasAIAccess]);

  const narrateFromSentence = useCallback(async (
    text: string,
    messageId: string,
    sentenceIndex: number,
    contextOrOptions?: NarratorSceneContext | NarrationPlaybackOptions,
  ) => {
    if (!options.enabled || options.hasAIAccess === false || !options.tapToNarrate) return;

    const playback = normalizePlaybackOptions(contextOrOptions);

    if (options.askBeforeTapToNarrate ?? true) {
      setPendingTapRequest({ text, messageId, sentenceIndex, options: playback });
      return;
    }

    try {
      await controller.current.narrateFromSentence(text, messageId, sentenceIndex, playback.context, playback.voiceSettings);
    } catch {
      toast.error('Narrator voice unavailable');
    }
  }, [options.enabled, options.hasAIAccess, options.tapToNarrate, options.askBeforeTapToNarrate]);

  const confirmTapNarration = useCallback(async () => {
    if (!pendingTapRequest) return;
    const request = pendingTapRequest;
    setPendingTapRequest(null);

    try {
      await controller.current.narrateFromSentence(
        request.text,
        request.messageId,
        request.sentenceIndex,
        request.options?.context,
        request.options?.voiceSettings,
      );
    } catch {
      toast.error('Narrator voice unavailable');
    }
  }, [pendingTapRequest]);

  const cancelTapNarration = useCallback(() => setPendingTapRequest(null), []);

  const stop = useCallback(() => controller.current.stop(), []);
  const pause = useCallback(() => controller.current.pause(), []);
  const resume = useCallback(() => controller.current.resume(), []);
  const togglePause = useCallback(() => controller.current.togglePause(), []);
  const onSceneChange = useCallback(() => controller.current.onSceneChange(), []);

  return {
    narrate,
    narrateFromSentence,
    confirmTapNarration,
    cancelTapNarration,
    stop,
    pause,
    resume,
    togglePause,
    onSceneChange,
    state: narrationState,
    isPlaying: narrationState === 'playing' || narrationState === 'starting',
    isPaused: narrationState === 'paused',
    activeSentenceIndex,
    activeMessageId,
    activeRange,
    snapshot,
    pendingTapRequest,
  };
}
