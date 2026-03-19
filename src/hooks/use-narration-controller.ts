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
  const controller = useRef(getNarrationController());
  const [narrationState, setNarrationState] = useState<NarrationState>(controller.current.getState());
  const [snapshot, setSnapshot] = useState<NarrationSnapshot>(controller.current.getSnapshot());
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(
    controller.current.getSnapshot().highlightRange?.sentenceIndex ?? -1,
  );
  const [activeMessageId, setActiveMessageId] = useState<string | null>(controller.current.getActiveMessageId());
  const [activeRange, setActiveRange] = useState<NarrationHighlightRange | null>(
    controller.current.getSnapshot().highlightRange ?? null,
  );
  const [pendingTapRequest, setPendingTapRequest] = useState<PendingTapRequest | null>(null);

  useEffect(() => {
    controller.current.configure({
      voiceVolume: options.voiceVolume,
      ambientEnabled: options.ambientEnabled ?? true,
      ambientIntensity: (options.ambientIntensity as AmbientIntensityLevel) ?? 'standard',
      ambientVolume: options.soundVolume,
      reduceVocalSounds: options.reduceVocalSounds ?? false,
      tapToNarrateEnabled: options.tapToNarrate,
      askBeforeTapToNarrate: options.askBeforeTapToNarrate ?? true,
      highlightEnabled: options.narrationHighlightEnabled ?? true,
      debugEnabled: options.narrationDebug ?? false,
    });
  }, [
    options.voiceVolume,
    options.soundVolume,
    options.tapToNarrate,
    options.askBeforeTapToNarrate,
    options.narrationHighlightEnabled,
    options.narrationDebug,
    options.ambientEnabled,
    options.ambientIntensity,
    options.reduceVocalSounds,
  ]);

  useEffect(() => {
    controller.current.setVoiceVolume(options.voiceVolume);
  }, [options.voiceVolume]);

  useEffect(() => {
    controller.current.setSoundVolume(options.soundVolume);
  }, [options.soundVolume]);

  useEffect(() => {
    controller.current.setTapToNarrateEnabled(options.tapToNarrate);
    if (!options.tapToNarrate) {
      setPendingTapRequest(null);
    }
  }, [options.tapToNarrate]);

  useEffect(() => {
    controller.current.configureAmbientSounds({
      enabled: options.ambientEnabled ?? true,
      intensityLevel: (options.ambientIntensity as AmbientIntensityLevel) ?? 'standard',
      masterVolume: options.soundVolume,
      reduceVocalSounds: options.reduceVocalSounds ?? false,
    });
  }, [options.ambientEnabled, options.ambientIntensity, options.soundVolume, options.reduceVocalSounds]);

  useEffect(() => {
    const unsubscribeSnapshot = controller.current.onSnapshotChange((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setActiveMessageId(nextSnapshot.messageId);
      setActiveRange(nextSnapshot.highlightRange ?? null);
    });

    const unsubscribeState = controller.current.onStateChange((state) => {
      setNarrationState(state);
      if (state === 'idle' || state === 'finished') {
        setPendingTapRequest(null);
      }
    });

    const unsubscribeHighlight = controller.current.onHighlightChange((sentenceIndex, messageId, range) => {
      setActiveSentenceIndex(sentenceIndex);
      setActiveMessageId(messageId);
      setActiveRange(range ?? null);
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribeState();
      unsubscribeHighlight();
    };
  }, []);

  const narrate = useCallback(async (
    text: string,
    messageId: string,
    contextOrOptions?: NarratorSceneContext | NarrationPlaybackOptions,
    startFromSentence = 0,
  ) => {
    if (!options.enabled || options.hasAIAccess === false) return;

    try {
      const playback = normalizePlaybackOptions(contextOrOptions);
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
      await controller.current.narrateFromSentence(
        text,
        messageId,
        sentenceIndex,
        playback.context,
        playback.voiceSettings,
      );
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
