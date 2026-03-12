/**
 * useNarrationController — React hook wrapping the singleton NarrationController.
 * Provides reactive state for UI: narration state, active sentence, active message.
 * Also syncs narration-triggered ambient sound settings through the controller.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getNarrationController, type NarrationState } from '@/systems/narration';
import type { NarratorSceneContext } from '@/systems/narration/SpeechManager';
import type { AmbientIntensityLevel } from '@/lib/audio/narration-sound-rules';
import { toast } from 'sonner';

interface UseNarrationControllerOptions {
  enabled: boolean;
  voiceVolume: number;
  soundVolume: number;
  tapToNarrate: boolean;
  hasAIAccess?: boolean;
  /** Narration-triggered ambient sound settings */
  ambientEnabled?: boolean;
  ambientIntensity?: string;
  ambientVolume?: number;
  masterVolume?: number;
  reduceVocalSounds?: boolean;
}

export function useNarrationController(options: UseNarrationControllerOptions) {
  const controller = useRef(getNarrationController());
  const [narrationState, setNarrationState] = useState<NarrationState>('idle');
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  // Sync voice settings
  useEffect(() => {
    const c = controller.current;
    c.setVoiceVolume(options.voiceVolume);
    c.setSoundVolume(options.soundVolume);
    c.setTapToNarrateEnabled(options.tapToNarrate);
  }, [options.voiceVolume, options.soundVolume, options.tapToNarrate]);

  // Sync narration-triggered ambient sound settings
  useEffect(() => {
    const c = controller.current;
    const masterVol = options.masterVolume ?? 1;
    const ambientEnabled = options.ambientEnabled !== false && options.hasAIAccess !== false;
    const intensity = (options.ambientIntensity === 'off' || !options.ambientEnabled)
      ? 'off' as AmbientIntensityLevel
      : (options.ambientIntensity || 'standard') as AmbientIntensityLevel;

    c.configureAmbientSounds({
      enabled: ambientEnabled,
      intensityLevel: intensity,
      masterVolume: (options.ambientVolume ?? 0.5) * masterVol,
      reduceVocalSounds: options.reduceVocalSounds ?? false,
    });
  }, [
    options.ambientEnabled,
    options.ambientIntensity,
    options.ambientVolume,
    options.masterVolume,
    options.reduceVocalSounds,
    options.hasAIAccess,
  ]);

  // Subscribe to state & highlight changes
  useEffect(() => {
    const c = controller.current;
    const unsubState = c.onStateChange((s) => setNarrationState(s));
    const unsubHighlight = c.onHighlightChange((idx, msgId) => {
      setActiveSentenceIndex(idx);
      setActiveMessageId(msgId);
    });
    return () => { unsubState(); unsubHighlight(); };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { controller.current.stop(); };
  }, []);

  const narrate = useCallback(async (
    text: string,
    messageId: string,
    context?: NarratorSceneContext,
    startFromSentence = 0,
  ) => {
    if (!options.enabled || options.hasAIAccess === false) return;
    try {
      await controller.current.narrate(text, messageId, context, startFromSentence);
    } catch {
      toast.error('Narrator voice unavailable');
    }
  }, [options.enabled, options.hasAIAccess]);

  const narrateFromSentence = useCallback(async (
    text: string,
    messageId: string,
    sentenceIndex: number,
    context?: NarratorSceneContext,
  ) => {
    if (!options.enabled || options.hasAIAccess === false) return;
    if (!options.tapToNarrate) return;
    try {
      await controller.current.narrateFromSentence(text, messageId, sentenceIndex, context);
    } catch {
      toast.error('Narrator voice unavailable');
    }
  }, [options.enabled, options.hasAIAccess, options.tapToNarrate]);

  const stop = useCallback(() => controller.current.stop(), []);
  const pause = useCallback(() => controller.current.pause(), []);
  const resume = useCallback(() => controller.current.resume(), []);
  const togglePause = useCallback(() => controller.current.togglePause(), []);

  return {
    narrate,
    narrateFromSentence,
    stop,
    pause,
    resume,
    togglePause,
    state: narrationState,
    isPlaying: narrationState === 'playing',
    isPaused: narrationState === 'paused',
    activeSentenceIndex,
    activeMessageId,
  };
}
