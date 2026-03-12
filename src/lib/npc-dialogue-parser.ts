/**
 * NPC Dialogue Parser
 *
 * Splits narrator messages into segments of narration and NPC speech.
 * Detects common dialogue patterns:
 *   - **Name** says, "dialogue"
 *   - "dialogue," Name says.
 *   - **Name**: "dialogue"
 *   - "dialogue" — **Name**
 */

export interface NarrationSegment {
  type: 'narration';
  text: string;
}

export interface NpcDialogueSegment {
  type: 'npc_dialogue';
  speakerName: string;
  dialogue: string;
}

export type MessageSegment = NarrationSegment | NpcDialogueSegment;

/**
 * Pattern-based NPC dialogue extraction.
 *
 * Matches:
 *   1. **Name** says/whispers/shouts/etc, "..."  or  **Name**: "..."
 *   2. "...", Name says/whispers/etc.
 *   3. **Name** — "..."
 *
 * We intentionally keep it broad to catch narrative variations.
 */

// Speech verbs the narrator commonly uses
const SPEECH_VERBS =
  'says?|whispers?|shouts?|mutters?|growls?|replies?|responds?|asks?|calls?|hisses?|murmurs?|barks?|snaps?|laughs?|chuckles?|sighs?|announces?|exclaims?|declares?|pleads?|demands?|commands?|speaks?|adds?|continues?|interrupts?|stammers?|cries?';

// 1. **Name** verb, "dialogue"  or  **Name**: "dialogue"
const PATTERN_BEFORE = new RegExp(
  `\\*\\*([^*]+)\\*\\*\\s*(?:(?:${SPEECH_VERBS})\\s*[,:]?\\s*|[:\\—–-]\\s*)[""\u201C]([^""\u201D]+)[""\u201D]`,
  'gi',
);

// 2. "dialogue," verb Name.  (name may or may not be bolded)
const PATTERN_AFTER = new RegExp(
  `[""\u201C]([^""\u201D]+)[""\u201D][,.]?\\s*(?:${SPEECH_VERBS})\\s+\\*\\*([^*]+)\\*\\*`,
  'gi',
);

interface RawMatch {
  start: number;
  end: number;
  speakerName: string;
  dialogue: string;
}

export function parseNarratorMessage(text: string): MessageSegment[] {
  if (!text) return [{ type: 'narration', text }];

  const matches: RawMatch[] = [];

  // Collect all matches with their positions
  for (const pattern of [PATTERN_BEFORE, PATTERN_AFTER]) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const isPre = pattern === PATTERN_BEFORE;
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        speakerName: (isPre ? m[1] : m[2]).trim(),
        dialogue: (isPre ? m[2] : m[1]).trim(),
      });
    }
  }

  if (matches.length === 0) {
    return [{ type: 'narration', text }];
  }

  // Sort by position and de-duplicate overlapping matches
  matches.sort((a, b) => a.start - b.start);
  const deduped: RawMatch[] = [];
  for (const m of matches) {
    const last = deduped[deduped.length - 1];
    if (!last || m.start >= last.end) {
      deduped.push(m);
    }
  }

  // Build segments
  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const match of deduped) {
    // Narration before this dialogue
    if (match.start > cursor) {
      const narr = text.slice(cursor, match.start).trim();
      if (narr) segments.push({ type: 'narration', text: narr });
    }

    segments.push({
      type: 'npc_dialogue',
      speakerName: match.speakerName,
      dialogue: match.dialogue,
    });

    cursor = match.end;
  }

  // Trailing narration
  if (cursor < text.length) {
    const narr = text.slice(cursor).trim();
    if (narr) segments.push({ type: 'narration', text: narr });
  }

  return segments;
}

/**
 * Resolve NPC display name.
 * If the NPC's name appears in knownNpcNames, show it; otherwise show "Name Unknown".
 */
export function resolveNpcDisplayName(
  speakerName: string,
  knownNpcNames: Set<string>,
): string {
  // Check case-insensitive match
  for (const known of knownNpcNames) {
    if (known.toLowerCase() === speakerName.toLowerCase()) return known;
  }
  return '*Name Unknown*';
}
