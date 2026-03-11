import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type NarratorSceneContext =
  | 'exploration'
  | 'peaceful'
  | 'danger'
  | 'combat'
  | 'victory'
  | 'npc'
  | 'default';

interface NarratorVoiceOptions {
  enabled: boolean;
  autoRead: boolean;
  volume: number;
}

/**
 * Automatically detect scene context from narrator text content.
 */
function detectSceneContext(text: string): NarratorSceneContext {
  const t = text.toLowerCase();

  // Combat indicators
  if (/\b(attack|strikes?|slash|punch|dodge|block|parry|swing|blade|combat|fight|clash|retaliat|counter-?attack|lunge|charge|arrow|bolt|spell hits)\b/.test(t)) {
    return 'combat';
  }

  // Victory / triumph
  if (/\b(victor|triumph|defeat(ed|s)|falls? (to|unconscious)|crumbles|vanquish|won|celebrate|cheers?)\b/.test(t)) {
    return 'victory';
  }

  // Danger / suspense
  if (/\b(danger|threat|rumbl|creep|shadow|lurk|growl|hiss|scream|trembl|stalk|ominous|dread|warning|ambush|trap|poison|toxic)\b/.test(t)) {
    return 'danger';
  }

  // NPC dialogue (contains quoted speech)
  if (/[""\u201C].{8,}[""\u201D]/.test(text)) {
    return 'npc';
  }

  // Peaceful / reflective
  if (/\b(gentle|calm|quiet|peace|soft|warm|rest|sleep|dawn|sunset|breeze|murmur|still|serene|safe|comfort)\b/.test(t)) {
    return 'peaceful';
  }

  // Exploration (default for descriptive content)
  if (/\b(cave|forest|path|corridor|door|passage|tunnel|room|chamber|trail|ruins|ancient|discover|explore|notice|observe|ahead)\b/.test(t)) {
    return 'exploration';
  }

  return 'default';
}

export function useNarratorVoice(options: NarratorVoiceOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const speak = useCallback(async (text: string, explicitContext?: NarratorSceneContext) => {
    if (!options.enabled || !text.trim()) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Auto-detect scene context from text if not explicitly provided
    const context = explicitContext || detectSceneContext(text);

    // Check cache (include context in key since same text may sound different)
    const cacheKey = `${context}:${text.substring(0, 200)}`;
    let audioUrl = cacheRef.current.get(cacheKey);

    if (!audioUrl) {
      try {
        playingRef.current = true;
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrator-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text, context }),
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'TTS failed' }));
          throw new Error(err.error || 'TTS request failed');
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        cacheRef.current.set(cacheKey, audioUrl);

        // Limit cache size
        if (cacheRef.current.size > 20) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            const oldUrl = cacheRef.current.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            cacheRef.current.delete(firstKey);
          }
        }
      } catch (err) {
        playingRef.current = false;
        console.error('[Narrator TTS]', err);
        toast.error('Narrator voice unavailable');
        return;
      }
    }

    const audio = new Audio(audioUrl);
    audio.volume = options.volume;
    audioRef.current = audio;

    audio.onended = () => {
      playingRef.current = false;
      audioRef.current = null;
    };
    audio.onerror = () => {
      playingRef.current = false;
      audioRef.current = null;
    };

    try {
      await audio.play();
    } catch {
      playingRef.current = false;
    }
  }, [options.enabled, options.volume]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      playingRef.current = false;
    }
  }, []);

  return { speak, stop, isPlaying: playingRef.current };
}
