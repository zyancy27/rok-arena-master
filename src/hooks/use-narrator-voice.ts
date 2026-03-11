import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface NarratorVoiceOptions {
  enabled: boolean;
  autoRead: boolean;
  volume: number;
}

export function useNarratorVoice(options: NarratorVoiceOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const speak = useCallback(async (text: string) => {
    if (!options.enabled || !text.trim()) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Check cache first
    const cacheKey = text.substring(0, 200);
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
            body: JSON.stringify({ text }),
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
