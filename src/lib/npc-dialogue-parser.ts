/**
 * NPC Dialogue Parser
 *
 * Splits narrator messages into segments of narration and NPC speech.
 * Detects common dialogue patterns:
 *   - **Name** says, "dialogue"
 *   - Name says, "dialogue"
 *   - **Name**: "dialogue"
 *   - Name: "dialogue"
 *   - "dialogue," Name says.
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

// Speech verbs the narrator commonly uses
const SPEECH_VERBS =
  'says?|whispers?|shouts?|mutters?|growls?|replies?|responds?|asks?|calls?|hisses?|murmurs?|barks?|snaps?|laughs?|chuckles?|sighs?|announces?|exclaims?|declares?|pleads?|demands?|commands?|speaks?|adds?|continues?|interrupts?|stammers?|cries?';

const NAME_CAPTURE = `(?:\\*\\*([^*]+)\\*\\*|([A-Z][A-Za-z\\'’.-]*(?:\\s+[A-Z][A-Za-z\\'’.-]*){0,3}))`;

// 1. **Name** says, "dialogue" / Name says, "dialogue" / Name: "dialogue"
const PATTERN_BEFORE = new RegExp(
  `${NAME_CAPTURE}\\s*(?:(?:${SPEECH_VERBS})\\s*[,:]?\\s*|[:\\—–-]\\s*)["“]([^"”]+)["”]`,
  'g',
);

// 2. "dialogue," says **Name** / says Name
const PATTERN_AFTER = new RegExp(
  `["“]([^"”]+)["”][,.]?\\s*(?:${SPEECH_VERBS})\\s+${NAME_CAPTURE}`,
  'g',
);

interface RawMatch {
  start: number;
  end: number;
  speakerName: string;
  dialogue: string;
}

function resolveMatchedName(...candidates: Array<string | undefined>) {
  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ?? '';
}

export function parseNarratorMessage(text: string): MessageSegment[] {
  if (!text) return [{ type: 'narration', text }];

  const matches: RawMatch[] = [];

  for (const pattern of [PATTERN_BEFORE, PATTERN_AFTER]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const isBeforePattern = pattern === PATTERN_BEFORE;
      const speakerName = isBeforePattern
        ? resolveMatchedName(match[1], match[2])
        : resolveMatchedName(match[2], match[3]);
      const dialogue = (isBeforePattern ? match[3] : match[1])?.trim() ?? '';

      if (!speakerName || !dialogue) continue;

      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        speakerName,
        dialogue,
      });
    }
  }

  if (matches.length === 0) {
    return [{ type: 'narration', text }];
  }

  matches.sort((a, b) => a.start - b.start);
  const deduped: RawMatch[] = [];
  for (const match of matches) {
    const last = deduped[deduped.length - 1];
    if (!last || match.start >= last.end) {
      deduped.push(match);
    }
  }

  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const match of deduped) {
    if (match.start > cursor) {
      const narration = text.slice(cursor, match.start).trim();
      if (narration) segments.push({ type: 'narration', text: narration });
    }

    segments.push({
      type: 'npc_dialogue',
      speakerName: match.speakerName,
      dialogue: match.dialogue,
    });

    cursor = match.end;
  }

  if (cursor < text.length) {
    const narration = text.slice(cursor).trim();
    if (narration) segments.push({ type: 'narration', text: narration });
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
  for (const known of knownNpcNames) {
    if (known.toLowerCase() === speakerName.toLowerCase()) return known;
  }
  return '*Name Unknown*';
}
