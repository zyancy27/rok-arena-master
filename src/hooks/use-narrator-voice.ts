import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type NarratorSceneContext =
  | 'exploration'
  | 'peaceful'
  | 'danger'
  | 'combat'
  | 'tragic'
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

  if (/\b(attack|strikes?|slash|punch|dodge|block|parry|swing|blade|combat|fight|clash|retaliat|counter-?attack|lunge|charge|arrow|bolt|spell hits)\b/.test(t)) {
    return 'combat';
  }
  if (/\b(victor|triumph|defeat(ed|s)|falls? (to|unconscious)|crumbles|vanquish|won|celebrate|cheers?)\b/.test(t)) {
    return 'victory';
  }
  if (/\b(danger|threat|rumbl|creep|shadow|lurk|growl|hiss|scream|trembl|stalk|ominous|dread|warning|ambush|trap|poison|toxic)\b/.test(t)) {
    return 'danger';
  }
  if (/[""\u201C].{8,}[""\u201D]/.test(text)) {
    return 'npc';
  }
  if (/\b(grief|mourn|tears?|weep|sorrow|loss|fallen|death|dying|funeral|grave|farewell|goodbye|sacrifice|hollow|empty|broken)\b/.test(t)) {
    return 'tragic';
  }
  if (/\b(gentle|calm|quiet|peace|soft|warm|rest|sleep|dawn|sunset|breeze|murmur|still|serene|safe|comfort)\b/.test(t)) {
    return 'peaceful';
  }
  if (/\b(cave|forest|path|corridor|door|passage|tunnel|room|chamber|trail|ruins|ancient|discover|explore|notice|observe|ahead)\b/.test(t)) {
    return 'exploration';
  }
  return 'default';
}

/**
 * Build a cache key for ambient SFX based on context + key location words.
 * This avoids re-generating the same ambient for similar narration.
 */
function buildAmbientCacheKey(context: string, text: string): string {
  const t = text.toLowerCase();
  const locationWords = [
    'cave', 'forest', 'ocean', 'sea', 'desert', 'city', 'town', 'tavern',
    'castle', 'mountain', 'swamp', 'snow', 'ice', 'ruins', 'temple', 'space',
    'fire', 'lava', 'rain', 'storm', 'jungle', 'dungeon', 'tower', 'village'
  ];
  const matched = locationWords.filter(w => t.includes(w)).sort().join(',');
  return `sfx:${context}:${matched || 'generic'}`;
}

export function useNarratorVoice(options: NarratorVoiceOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const ambientCacheRef = useRef<Map<string, string>>(new Map());

  const stopAmbient = useCallback(() => {
    if (ambientRef.current) {
      // Fade out ambient
      const amb = ambientRef.current;
      const fadeOut = setInterval(() => {
        if (amb.volume > 0.05) {
          amb.volume = Math.max(0, amb.volume - 0.05);
        } else {
          clearInterval(fadeOut);
          amb.pause();
          ambientRef.current = null;
        }
      }, 80);
    }
  }, []);

  const playAmbient = useCallback(async (context: string, text: string) => {
    const cacheKey = buildAmbientCacheKey(context, text);
    let audioUrl = ambientCacheRef.current.get(cacheKey);

    if (!audioUrl) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrator-ambient-sfx`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ context, text }),
          }
        );

        if (!response.ok) return; // silently fail — ambient is optional

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        ambientCacheRef.current.set(cacheKey, audioUrl);

        // Limit ambient cache
        if (ambientCacheRef.current.size > 10) {
          const firstKey = ambientCacheRef.current.keys().next().value;
          if (firstKey) {
            const oldUrl = ambientCacheRef.current.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            ambientCacheRef.current.delete(firstKey);
          }
        }
      } catch {
        return; // ambient is best-effort
      }
    }

    // Stop previous ambient
    if (ambientRef.current) {
      ambientRef.current.pause();
      ambientRef.current = null;
    }

    const amb = new Audio(audioUrl);
    amb.volume = 0; // start silent for fade-in
    amb.loop = true;
    ambientRef.current = amb;

    // Vary playback rate slightly each loop to break repetition
    const baseRate = 0.97 + Math.random() * 0.06; // 0.97–1.03
    amb.playbackRate = baseRate;

    // On each loop restart, shift rate & volume subtly so it never sounds identical
    const onLoop = () => {
      if (ambientRef.current !== amb) return;
      amb.playbackRate = 0.94 + Math.random() * 0.12; // 0.94–1.06
      // Subtle volume drift around target
      const targetVol = Math.min(options.volume * 0.3, 0.3);
      amb.volume = targetVol * (0.8 + Math.random() * 0.4); // ±20%
    };
    amb.addEventListener('seeked', onLoop); // fires on loop restart

    try {
      await amb.play();
      // Fade in to ~30% of narrator volume
      const targetVol = Math.min(options.volume * 0.3, 0.3);
      const fadeIn = setInterval(() => {
        if (amb.volume < targetVol - 0.02) {
          amb.volume = Math.min(targetVol, amb.volume + 0.03);
        } else {
          amb.volume = targetVol;
          clearInterval(fadeIn);
        }
      }, 60);
    } catch {
      // autoplay blocked — no big deal
    }
  }, [options.volume]);

  const speak = useCallback(async (text: string, explicitContext?: NarratorSceneContext) => {
    if (!options.enabled || !text.trim()) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const context = explicitContext || detectSceneContext(text);
    const cacheKey = `${context}:${text.substring(0, 200)}`;
    let audioUrl = cacheRef.current.get(cacheKey);

    // Fire ambient SFX request in parallel with TTS (don't await)
    playAmbient(context, text);

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
        stopAmbient();
        return;
      }
    }

    const audio = new Audio(audioUrl);
    audio.volume = options.volume;
    audioRef.current = audio;

    audio.onended = () => {
      playingRef.current = false;
      audioRef.current = null;
      stopAmbient();
    };
    audio.onerror = () => {
      playingRef.current = false;
      audioRef.current = null;
      stopAmbient();
    };

    try {
      await audio.play();
    } catch {
      playingRef.current = false;
      stopAmbient();
    }
  }, [options.enabled, options.volume, playAmbient, stopAmbient]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      playingRef.current = false;
    }
    stopAmbient();
  }, [stopAmbient]);

  return { speak, stop, isPlaying: playingRef.current };
}
