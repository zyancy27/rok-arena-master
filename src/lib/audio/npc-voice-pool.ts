/**
 * NPC Voice Pool — assigns distinct ElevenLabs voices to NPCs.
 * Voices are drawn from a pool and persist per NPC name within a session.
 */

export interface NpcVoiceProfile {
  voiceId: string;
  label: string;
  /** Hint for narrator-tts preset overrides */
  tone: 'warm' | 'gruff' | 'sharp' | 'calm' | 'young' | 'old' | 'neutral';
  gender: 'male' | 'female';
}

/**
 * Curated pool of distinct ElevenLabs voices suited for NPC dialogue.
 * Each has a different character feel.
 */
const VOICE_POOL: NpcVoiceProfile[] = [
  // --- User's custom ElevenLabs voices ---
  { voiceId: '2ajXGJNYBR0iNHpS4VZb', label: 'Voice-01',  tone: 'warm',    gender: 'male'   },
  { voiceId: 'MKlLqCItoCkvdhrxgtLv', label: 'Voice-02',  tone: 'gruff',   gender: 'male'   },
  { voiceId: 'efGTHf4ukBiG4n8lptfp', label: 'Voice-03',  tone: 'calm',    gender: 'male'   },
  { voiceId: 'fBD19tfE58bkETeiwUoC', label: 'Voice-04',  tone: 'sharp',   gender: 'male'   },
  { voiceId: 'HAvvFKatz0uu0Fv55Riy', label: 'Voice-05',  tone: 'young',   gender: 'male'   },
  { voiceId: 'weA4Q36twV5kwSaTEL0Q', label: 'Voice-06',  tone: 'old',     gender: 'male'   },
  { voiceId: 'hU1ratPhBTZNviWitzAh', label: 'Voice-07',  tone: 'neutral', gender: 'male'   },
  { voiceId: 'xYWUvKNK6zWCgsdAK7Xi', label: 'Voice-08',  tone: 'warm',    gender: 'female' },
  { voiceId: '8tJgFGd1nr7H5KLTvjjt', label: 'Voice-09',  tone: 'gruff',   gender: 'male'   },
  { voiceId: 'esy0r39YPLQjOczyOib8', label: 'Voice-10',  tone: 'young',   gender: 'female' },
  { voiceId: 'YOq2y2Up4RgXP2HyXjE5', label: 'Voice-11',  tone: 'calm',    gender: 'female' },
  { voiceId: 'CeNX9CMwmxDxUF5Q2Inm', label: 'Voice-12',  tone: 'sharp',   gender: 'female' },
  { voiceId: 'B8gJV1IhpuegLxdpXFOE', label: 'Voice-13',  tone: 'old',     gender: 'female' },
  { voiceId: '7cOBG34AiHrAzs842Rdi', label: 'Voice-14',  tone: 'warm',    gender: 'male'   },
  { voiceId: 'eppqEXVumQ3CfdndcIBd', label: 'Voice-15',  tone: 'neutral', gender: 'female' },
  { voiceId: 'z3kTTwYbQrmL7ckdGcJi', label: 'Voice-16',  tone: 'gruff',   gender: 'male'   },
  { voiceId: 'zYcjlYFOd3taleS0gkk3', label: 'Voice-17',  tone: 'calm',    gender: 'male'   },
  { voiceId: '7NsaqHdLuKNFvEfjpUno', label: 'Voice-18',  tone: 'sharp',   gender: 'male'   },
  { voiceId: '54Cze5LrTSyLgbO6Fhlc', label: 'Voice-19',  tone: 'young',   gender: 'female' },
  { voiceId: 'MYiFAKeVwcvm4z9VsFAR', label: 'Voice-20',  tone: 'old',     gender: 'male'   },
  { voiceId: 'Sm1seazb4gs7RSlUVw7c', label: 'Voice-21',  tone: 'warm',    gender: 'female' },
  { voiceId: 'WtA85syCrJwasGeHGH2p', label: 'Voice-22',  tone: 'neutral', gender: 'male'   },
  { voiceId: 'XJ2fW4ybq7HouelYYGcL', label: 'Voice-23',  tone: 'gruff',   gender: 'female' },
  { voiceId: 'rHWSYoq8UlV0YIBKMryp', label: 'Voice-24',  tone: 'calm',    gender: 'female' },
  { voiceId: 'mKoqwDP2laxTdq1gEgU6', label: 'Voice-25',  tone: 'sharp',   gender: 'male'   },
  { voiceId: 'cPoqAvGWCPfCfyPMwe4z', label: 'Voice-26',  tone: 'young',   gender: 'male'   },
  { voiceId: 'HMCmDsbKeaSZp5LMOYKR', label: 'Voice-27',  tone: 'warm',    gender: 'male'   },
  { voiceId: '5KvpaGteYkNayiswuX2h', label: 'Voice-28',  tone: 'old',     gender: 'female' },
  { voiceId: 'Bj9UqZbhQsanLzgalpEG', label: 'Voice-29',  tone: 'neutral', gender: 'male'   },
  { voiceId: 'flHkNRp1BlvT73UL6gyz', label: 'Voice-30',  tone: 'calm',    gender: 'male'   },
  { voiceId: '4tRn1lSkEn13EVTuqb0g', label: 'Voice-31',  tone: 'gruff',   gender: 'male'   },
  { voiceId: 'IRHApOXLvnW57QJPQH2P', label: 'Voice-32',  tone: 'sharp',   gender: 'female' },
  { voiceId: '6sFKzaJr574YWVu4UuJF', label: 'Voice-33',  tone: 'young',   gender: 'male'   },
  { voiceId: '2gPFXx8pN3Avh27Dw5Ma', label: 'Voice-34',  tone: 'warm',    gender: 'female' },
  { voiceId: 'goT3UYdM9bhm0n2lmKQx', label: 'Voice-35',  tone: 'neutral', gender: 'male'   },
];

const STORAGE_KEY = 'npc_voice_assignments';

/** Load persisted NPC → voiceId map from localStorage */
function loadAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Save NPC → voiceId map to localStorage */
function saveAssignments(map: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

/** In-memory cache hydrated from storage on first access */
let assignmentsCache: Record<string, string> | null = null;
let nextPoolIndex = 0;

function getCache(): Record<string, string> {
  if (!assignmentsCache) {
    assignmentsCache = loadAssignments();
    // Advance pool index past already-used voices to avoid duplicates
    nextPoolIndex = Object.keys(assignmentsCache).length;
  }
  return assignmentsCache;
}

/**
 * Get a consistent voice for a given NPC name.
 * Persists across sessions so the same NPC always keeps its voice.
 */
export function getVoiceForNpc(npcName: string): NpcVoiceProfile {
  const key = npcName.trim().toLowerCase();
  const cache = getCache();

  // Check persisted assignment
  const savedId = cache[key];
  if (savedId) {
    const profile = VOICE_POOL.find(p => p.voiceId === savedId);
    if (profile) return profile;
  }

  // Assign next available voice from pool (wraps around)
  const profile = VOICE_POOL[nextPoolIndex % VOICE_POOL.length];
  nextPoolIndex++;
  cache[key] = profile.voiceId;
  saveAssignments(cache);
  return profile;
}

/**
 * Voice settings overrides for NPC dialogue — more expressive than narrator.
 */
export function getNpcVoiceSettings(tone: NpcVoiceProfile['tone']) {
  const base = { stability: 0.55, similarity_boost: 0.88, style: 0.22, speed: 1.12 };
  switch (tone) {
    case 'gruff':  return { ...base, stability: 0.48, style: 0.28, speed: 1.05 };
    case 'old':    return { ...base, stability: 0.70, style: 0.12, speed: 0.95 };
    case 'young':  return { ...base, stability: 0.50, style: 0.25, speed: 1.18 };
    case 'sharp':  return { ...base, stability: 0.45, style: 0.30, speed: 1.15 };
    case 'warm':   return { ...base, stability: 0.60, style: 0.18, speed: 1.10 };
    case 'calm':   return { ...base, stability: 0.68, style: 0.10, speed: 1.08 };
    default:       return base;
  }
}

/** Segment type for split narration */
export interface NarrationSegment {
  type: 'narrator' | 'npc';
  text: string;
  npcName?: string;
  voiceProfile?: NpcVoiceProfile;
}

/**
 * Split narrator text into narrator prose vs NPC quoted dialogue segments.
 * Detects patterns like:  NpcName says, "dialogue"  or  "dialogue," NpcName replies.
 * Also handles inline quotes without attribution as generic NPC.
 */
export function splitNarrationSegments(text: string): NarrationSegment[] {
  const segments: NarrationSegment[] = [];
  
  // Match NPC dialogue with attribution:
  // Pattern A: Name says/speaks/etc, "dialogue"  or  Name: "dialogue"
  // Pattern B: "dialogue," Name says/replies/etc.
  // Pattern C: standalone "dialogue" (no clear attribution)
  const dialogueRegex = /(?:(\b[A-Z][a-zA-Z''-]+(?:\s+[A-Z][a-zA-Z''-]+)?)\s+(?:says?|speaks?|replies?|responds?|whispers?|shouts?|yells?|mutters?|growls?|hisses?|calls?\s*out|declares?|asks?|exclaims?|announces?|murmurs?|snaps?|barks?|snarls?|cries?\s*out)[,:]?\s*)?["\u201C]([^"\u201D]+)["\u201D](?:[,.]?\s*(?:(\b[A-Z][a-zA-Z''-]+(?:\s+[A-Z][a-zA-Z''-]+)?)\s+(?:says?|speaks?|replies?|responds?|whispers?|shouts?|mutters?|growls?|adds?|continues?)))?/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = dialogueRegex.exec(text)) !== null) {
    // Add narrator text before this dialogue
    if (match.index > lastIndex) {
      const proseText = text.slice(lastIndex, match.index).trim();
      if (proseText) {
        segments.push({ type: 'narrator', text: proseText });
      }
    }
    
    const npcName = match[1] || match[3] || undefined;
    const dialogue = match[2];
    
    if (dialogue && dialogue.trim()) {
      const voiceProfile = npcName ? getVoiceForNpc(npcName) : getVoiceForNpc('_unnamed_npc');
      segments.push({
        type: 'npc',
        text: dialogue.trim(),
        npcName: npcName || 'NPC',
        voiceProfile,
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Remaining narrator text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: 'narrator', text: remaining });
    }
  }
  
  // If no segments found, return whole text as narrator
  if (segments.length === 0) {
    segments.push({ type: 'narrator', text });
  }
  
  return segments;
}
