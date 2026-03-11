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
  { voiceId: 'JBFqnCBsd6RMkjVDRZzb', label: 'George',  tone: 'warm',    gender: 'male'   },
  { voiceId: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie', tone: 'young',   gender: 'male'   },
  { voiceId: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel',  tone: 'gruff',   gender: 'male'   },
  { voiceId: 'nPczCjzI2devNBz1zQrb', label: 'Brian',   tone: 'old',     gender: 'male'   },
  { voiceId: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam',    tone: 'calm',    gender: 'male'   },
  { voiceId: 'cjVigY5qzO86Huf0OWal', label: 'Eric',    tone: 'sharp',   gender: 'male'   },
  { voiceId: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah',   tone: 'warm',    gender: 'female' },
  { voiceId: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura',   tone: 'calm',    gender: 'female' },
  { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice',   tone: 'young',   gender: 'female' },
  { voiceId: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily',    tone: 'sharp',   gender: 'female' },
  { voiceId: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica', tone: 'neutral', gender: 'female' },
  { voiceId: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda', tone: 'old',     gender: 'female' },
];

/** Session-stable NPC → voice mapping */
const npcAssignments = new Map<string, NpcVoiceProfile>();
let nextPoolIndex = 0;

/**
 * Get a consistent voice for a given NPC name.
 * Same NPC always gets the same voice within a session.
 */
export function getVoiceForNpc(npcName: string): NpcVoiceProfile {
  const key = npcName.trim().toLowerCase();
  const existing = npcAssignments.get(key);
  if (existing) return existing;

  // Assign next voice from pool (wraps around)
  const profile = VOICE_POOL[nextPoolIndex % VOICE_POOL.length];
  nextPoolIndex++;
  npcAssignments.set(key, profile);
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
