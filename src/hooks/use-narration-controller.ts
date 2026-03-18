/**
 * useNarrationController — React hook wrapping the singleton Narration Orchestrator.
 * Provides reactive state for UI: narration state, active sentence/range, active message,
 * tap confirmation flow, and synchronized ambient cue settings.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getNarrationController, type NarrationState, type NarrationSnapshot } from '@/systems/narration';
import type { NarratorSceneContext } from '@/systems/narration/SpeechManager';
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

interface PendingTapRequest {
  text: string;
  messageId: string;
  sentenceIndex: number;
  context?: NarratorSceneContext;
}

export function useNarrationController(options: UseNarrationControllerOptions) {
  const controller = useRef(getNarrationController());
  const [narrationState, setNarrationState] = useState<NarrationState>('idle');
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<NarrationHighlightRange | null>(null);
  const [snapshot, setSnapshot] = useState<NarrationSnapshot>(controller.current.getSnapshot());
  const [pendingTapRequest, setPendingTapRequest] = useState<PendingTapRequest | null>(null);

  useEffect(() => {
    const c = controller.current;
    const masterVol = options.masterVolume ?? 1;
    const ambientEnabled = options.ambientEnabled !== false && options.hasAIAccess !== false;
    const intensity = (options.ambientIntensity === 'off' || !options.ambientEnabled)
      ? 'off' as AmbientIntensityLevel
      : (options.ambientIntensity || 'standard') as AmbientIntensityLevel;

    c.configure({
      voiceVolume: options.voiceVolume,
      ambientEnabled,
      ambientIntensity: intensity,
      ambientVolume: (options.ambientVolume ?? options.soundVolume ?? 0.5) * masterVol,
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
    options.ambientVolume,
    options.masterVolume,
    options.reduceVocalSounds,
    options.hasAIAccess,
  ]);

  useEffect(() => {
    const c = controller.current;
    const unsubState = c.onStateChange((s) => setNarrationState(s));
    const unsubHighlight = c.onHighlightChange((idx, msgId, range) => {
      setActiveSentenceIndex(idx);
      setActiveMessageId(msgId);
      setActiveRange(range ?? null);
    });
    const unsubSnapshot = c.onSnapshotChange(setSnapshot);

    return () => {
      unsubState();
      unsubHighlight();
      unsubSnapshot();
    };
  }, []);

  useEffect(() => {
    return () => {
      controller.current.stop();
    };
  }, []);

  const narrate = useCallback(async (
    text: string,
    messageId: string,
    context?: NarratorSceneContext,
    startFromSentence = 0,
  ) => {
    if (!options.enabled || options.hasAIAccess === false) return;
    try {
      const startCharIndex = startFromSentence > 0
        ? controller.current.highlight.getCharIndexForSentence(startFromSentence)
        : 0;
      await controller.current.narrate(text, messageId, context, startCharIndex, startFromSentence > 0 ? 'replay' : 'initial');
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
    if (!options.enabled || options.hasAIAccess === false || !options.tapToNarrate) return;

    if (options.askBeforeTapToNarrate ?? true) {
      setPendingTapRequest({ text, messageId, sentenceIndex, context });
      return;
    }

    try {
      await controller.current.narrateFromSentence(text, messageId, sentenceIndex, context);
    } catch {
      toast.error('Narrator voice unavailable');
    }
  }, [options.enabled, options.hasAIAccess, options.tapToNarrate, options.askBeforeTapToNarrate]);

  const confirmTapNarration = useCallback(async () => {
    if (!pendingTapRequest) return;
    const request = pendingTapRequest;
    setPendingTapRequest(null);

    try {
      await controller.current.narrateFromSentence(request.text, request.messageId, request.sentenceIndex, request.context);
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
