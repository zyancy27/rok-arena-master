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

// ── Accent Sound Cue Detection ──────────────────────────────────

interface AccentCue {
  cue: string;
  /** Delay in ms before playing (stagger multiple cues) */
  delay: number;
}

/**
 * Extract contextual accent sound cues from narrator text.
 * Returns up to 3 cues to avoid overwhelming the scene.
 */
function extractAccentCues(text: string): AccentCue[] {
  const t = text.toLowerCase();
  const cues: AccentCue[] = [];

  const patterns: [RegExp, string][] = [
    // Movement
    [/\b(footsteps?|walks?|steps?|strides?|paces?|trudge)\b/, 'footsteps'],
    [/\b(runs?|sprint|dash|rushing|charge[sd]?)\b/, 'running'],
    // Doors & mechanisms
    [/\b(door\s*(open|creak|swing|shut|slam|close))\b/, 'door_open'],
    [/\b(opens?\s*(the\s+)?door)\b/, 'door_open'],
    [/\b(slams?\s*(the\s+)?door|door\s*slam)\b/, 'door_slam'],
    [/\b(gate\s*(open|creak|swing)|opens?\s*(the\s+)?gate)\b/, 'gate'],
    [/\b(lock|unlock|key\s*turn)\b/, 'lock'],
    // Nature
    [/\b(wind\s*(howl|gust|blow|whip|rush))\b/, 'wind_gust'],
    [/\b(gust\s*of\s*wind)\b/, 'wind_gust'],
    [/\b(thunder\s*(crack|boom|rumble|roll)|lightning\s*(strike|flash|crack))\b/, 'thunder_crack'],
    [/\b(rain\s*(begin|start|fall|pour))\b/, 'rain_start'],
    [/\b(branch(es)?\s*(snap|crack|break))\b/, 'branches'],
    [/\b(leaves?\s*(rustl|crunch|whisper))\b/, 'leaves'],
    [/\b(splash(es)?|plunge|dive)\b/, 'water_splash'],
    [/\b(river|stream|brook|waterfall)\b/, 'river'],
    // Combat
    [/\b(draw[sn]?\s*(sword|blade|weapon))\b/, 'sword_draw'],
    [/\b(unsheathe|unsheaths)\b/, 'sword_draw'],
    [/\b(swords?\s*(clash|clang|ring|meet)|blade[s]?\s*(clash|meet|ring))\b/, 'sword_clash'],
    [/\b(arrow\s*(flies|whiz|loose|fire|shoot)|fires?\s*an?\s*arrow)\b/, 'arrow'],
    [/\b(hit|slam|smash|crash|impact|strike|blow)\b/, 'impact'],
    [/\b(explo(sion|de)|blast|detonat)\b/, 'explosion'],
    [/\b(shield\s*(block|bash|raise)|blocks?\s*with)\b/, 'shield'],
    // Magic
    [/\b(magic|spell|enchant|arcane|mystical|conjur|incantation|hex)\b/, 'magic'],
    [/\b(portal\s*(open|appear|shimmer)|rift|vortex|dimensional)\b/, 'portal'],
    [/\b(whisper[sng]*\s*(echo|fill|surround)|eerie\s*whisper|ghostly)\b/, 'whisper'],
    [/\b(ground\s*(rumbl|shak|trembl|quak)|earthquake|tremor)\b/, 'rumble'],
    [/\b(energy\s*(surge|blast|pulse|crackl)|power\s*(surge|build|grow))\b/, 'energy'],
    // Creatures
    [/\b(growl[sng]*|snarl[sng]*)\b/, 'growl'],
    [/\b(roar[sng]*|bellow[sng]*)\b/, 'roar'],
    [/\b(wings?\s*(flap|spread|beat|unfurl)|takes?\s*flight)\b/, 'wings'],
    [/\b(howl[sng]*|wolf|wolves)\b/, 'howl'],
    [/\b(horse|stallion|mare|steed|mount|hooves?)\b/, 'horse'],
    // Atmosphere
    [/\b(fire\s*(crackl|burn)|campfire|torch(es)?|flame[sd]?\s*flicker)\b/, 'fire_crackle'],
    [/\b(glass\s*(shatter|break|smash)|shatter[sng]*)\b/, 'glass'],
    [/\b(chain[sng]*\s*(rattl|clank|clink)|rattling\s*chain)\b/, 'chains'],
    [/\b(bell\s*(toll|ring|chime)|church\s*bell|tolling)\b/, 'bell'],
    [/\b(crowd\s*(gasp|murmur|cheer|react)|onlookers)\b/, 'crowd'],
    [/\b(scream[sng]*|shriek|cry\s*out|wail)\b/, 'scream'],
    [/\b(collaps|crumbl|cave-?in|rubble|structure\s*fall)\b/, 'collapse'],
    [/\b(heart\s*(pound|race|beat|thump)|pulse\s*(quicken|race))\b/, 'heartbeat'],
  ];

  const seen = new Set<string>();
  for (const [pattern, cue] of patterns) {
    if (pattern.test(t) && !seen.has(cue)) {
      seen.add(cue);
      // Stagger cues with increasing delay
      cues.push({ cue, delay: cues.length * 1500 + Math.random() * 800 });
      if (cues.length >= 3) break; // cap at 3 accent sounds
    }
  }

  return cues;
}

export function useNarratorVoice(options: NarratorVoiceOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const accentAudiosRef = useRef<HTMLAudioElement[]>([]);
  const playingRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const ambientCacheRef = useRef<Map<string, string>>(new Map());
  const accentCacheRef = useRef<Map<string, string>>(new Map());
  const accentTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopAccents = useCallback(() => {
    accentTimersRef.current.forEach(clearTimeout);
    accentTimersRef.current = [];
    accentAudiosRef.current.forEach(a => {
      try {
        a.volume = 0;
        a.pause();
      } catch {}
    });
    accentAudiosRef.current = [];
  }, []);

  const stopAmbient = useCallback(() => {
    stopAccents();
    if (ambientRef.current) {
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
  }, [stopAccents]);

  const playAccentCue = useCallback(async (cue: string, vol: number) => {
    const cacheKey = `accent:${cue}`;
    let audioUrl = accentCacheRef.current.get(cacheKey);

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
            body: JSON.stringify({ mode: 'accent', cue }),
          }
        );

        if (!response.ok) return;
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        accentCacheRef.current.set(cacheKey, audioUrl);

        // Limit accent cache
        if (accentCacheRef.current.size > 25) {
          const firstKey = accentCacheRef.current.keys().next().value;
          if (firstKey) {
            const oldUrl = accentCacheRef.current.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            accentCacheRef.current.delete(firstKey);
          }
        }
      } catch {
        return;
      }
    }

    const audio = new Audio(audioUrl);
    // Accent sounds play at 20-30% of narrator volume (quieter than narration)
    audio.volume = vol * (0.15 + Math.random() * 0.15);
    accentAudiosRef.current.push(audio);

    try {
      await audio.play();
      audio.onended = () => {
        accentAudiosRef.current = accentAudiosRef.current.filter(a => a !== audio);
      };
    } catch {
      // autoplay blocked
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

        if (!response.ok) return;

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        ambientCacheRef.current.set(cacheKey, audioUrl);

        if (ambientCacheRef.current.size > 10) {
          const firstKey = ambientCacheRef.current.keys().next().value;
          if (firstKey) {
            const oldUrl = ambientCacheRef.current.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            ambientCacheRef.current.delete(firstKey);
          }
        }
      } catch {
        return;
      }
    }

    // Stop previous ambient
    if (ambientRef.current) {
      ambientRef.current.pause();
      ambientRef.current = null;
    }

    const amb = new Audio(audioUrl);
    amb.volume = 0;
    amb.loop = true;
    ambientRef.current = amb;

    // Vary playback rate slightly each loop to break repetition
    const baseRate = 0.97 + Math.random() * 0.06;
    amb.playbackRate = baseRate;

    const onLoop = () => {
      if (ambientRef.current !== amb) return;
      amb.playbackRate = 0.94 + Math.random() * 0.12;
      const targetVol = Math.min(options.volume * 0.3, 0.3);
      amb.volume = targetVol * (0.8 + Math.random() * 0.4);
    };
    amb.addEventListener('seeked', onLoop);

    try {
      await amb.play();
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
      // autoplay blocked
    }
  }, [options.volume]);

  const speak = useCallback(async (text: string, explicitContext?: NarratorSceneContext) => {
    if (!options.enabled || !text.trim()) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopAccents();

    const context = explicitContext || detectSceneContext(text);
    const cacheKey = `${context}:${text.substring(0, 200)}`;
    let audioUrl = cacheRef.current.get(cacheKey);

    // Fire ambient SFX request in parallel (don't await)
    playAmbient(context, text);

    // Extract and schedule accent sound cues from the narration text
    const accentCues = extractAccentCues(text);
    for (const { cue, delay } of accentCues) {
      const timer = setTimeout(() => {
        playAccentCue(cue, options.volume);
      }, delay);
      accentTimersRef.current.push(timer);
    }

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
  }, [options.enabled, options.volume, playAmbient, playAccentCue, stopAmbient, stopAccents]);

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
