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
 *   - Name acts. "dialogue," he says.
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

const SPEECH_VERBS =
  'says?|whispers?|shouts?|mutters?|growls?|replies?|responds?|asks?|calls?|hisses?|murmurs?|barks?|snaps?|laughs?|chuckles?|sighs?|announces?|exclaims?|declares?|pleads?|demands?|commands?|speaks?|adds?|continues?|interrupts?|stammers?|cries?';

const NAME_CAPTURE = String.raw`(?:\*\*([^*]+)\*\*|([A-Z][A-Za-z'’.-]*(?:\s+[A-Z][A-Za-z'’.-]*){0,3}))`;
const DIALOGUE_CAPTURE = String.raw`["“]([^"”]+)["”]`;
const SPEECH_CONNECTOR = String.raw`\s*(?:(?:${SPEECH_VERBS})\s*[,:]?\s*|[:—–-]\s*)`;

const PATTERN_BEFORE = new RegExp(
  String.raw`${NAME_CAPTURE}${SPEECH_CONNECTOR}${DIALOGUE_CAPTURE}`,
  'g',
);

/**
 * Pattern: Name [speech_verb], [descriptive clause ≤200 chars], "dialogue"
 * Handles AI patterns where a speech verb is followed by a long descriptive
 * clause before the quoted text, e.g.:
 *   Elara whispers, her voice a dry rustle like parchment, "is the hunger."
 */
const PATTERN_BEFORE_EXTENDED = new RegExp(
  String.raw`${NAME_CAPTURE}\s+(?:finally\s+)?(?:${SPEECH_VERBS})[,]?\s+[^"""\u201C\u201D]{1,200}?[,]\s*${DIALOGUE_CAPTURE}`,
  'g',
);

const PATTERN_AFTER = new RegExp(
  String.raw`${DIALOGUE_CAPTURE}[,.]?\s*(?:${SPEECH_VERBS})\s+${NAME_CAPTURE}`,
  'g',
);

const PATTERN_AFTER_PRONOUN = new RegExp(
  String.raw`${DIALOGUE_CAPTURE}[,.]?\s*(?:he|she|they)\s+(?:${SPEECH_VERBS})`,
  'g',
);

/**
 * Pattern: Name [action, 1-200 chars]. "dialogue"
 * Handles the very common AI pattern where a character performs an action
 * then speaks, without using an explicit speech verb before the dialogue.
 * e.g. Master Eldrin shivers, pulling his shoulders up. "I... it isn't art."
 *
 * To avoid false positives we require:
 * - The name is at (or near) the start of a sentence
 * - The gap between the name and the dialogue is ≤ 200 characters
 * - No other capitalized two-word name appears between the matched name
 *   and the dialogue (handled in dedup / override logic)
 */
const PATTERN_ACTION_THEN_SPEECH = new RegExp(
  String.raw`${NAME_CAPTURE}[^""\u201C\u201D]{1,200}?[.!?]\s*${DIALOGUE_CAPTURE}`,
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

function inferContextualSpeakerName(context: string) {
  const namePattern = new RegExp(NAME_CAPTURE, 'g');
  let lastName = '';
  let match: RegExpExecArray | null;

  while ((match = namePattern.exec(context)) !== null) {
    lastName = resolveMatchedName(match[1], match[2]);
  }

  return lastName;
}

export function parseNarratorMessage(text: string): MessageSegment[] {
  if (!text) return [{ type: 'narration', text }];

  const matches: RawMatch[] = [];

  for (const pattern of [PATTERN_BEFORE, PATTERN_BEFORE_EXTENDED, PATTERN_AFTER, PATTERN_AFTER_PRONOUN, PATTERN_ACTION_THEN_SPEECH]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const isBeforePattern = pattern === PATTERN_BEFORE || pattern === PATTERN_BEFORE_EXTENDED;
      const isAfterPattern = pattern === PATTERN_AFTER;
      const isActionThenSpeech = pattern === PATTERN_ACTION_THEN_SPEECH;
      const speakerName = (isBeforePattern || isActionThenSpeech)
        ? resolveMatchedName(match[1], match[2])
        : isAfterPattern
          ? resolveMatchedName(match[2], match[3])
          : inferContextualSpeakerName(text.slice(Math.max(0, match.index - 160), match.index));
      const dialogue = ((isBeforePattern || isActionThenSpeech) ? match[3] : match[1])?.trim() ?? '';

      if (!speakerName || !dialogue) continue;

      // For the action-then-speech pattern, verify no other named character
      // appears closer to the dialogue (to avoid mis-attribution).
      if (isActionThenSpeech) {
        const fullMatch = match[0];
        // Only scan the action gap (before the opening quote) for inner names
        const quoteIndex = fullMatch.slice(speakerName.length).search(/["""\u201C]/);
        const actionGap = quoteIndex >= 0
          ? fullMatch.slice(speakerName.length, speakerName.length + quoteIndex)
          : fullMatch.slice(speakerName.length);
        const innerNamePattern = new RegExp(NAME_CAPTURE, 'g');
        let innerMatch: RegExpExecArray | null;
        let lastInnerName = '';
        while ((innerMatch = innerNamePattern.exec(actionGap)) !== null) {
          const candidate = resolveMatchedName(innerMatch[1], innerMatch[2]);
          // Only consider multi-word names (NPC names) to avoid false positives like "I", "The"
          if (candidate && candidate !== speakerName && candidate.includes(' ')) {
            lastInnerName = candidate;
          }
        }
        // If a different named character is closer to the dialogue, attribute to them instead
        const effectiveSpeaker = lastInnerName || speakerName;
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          speakerName: effectiveSpeaker,
          dialogue,
        });
        continue;
      }

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
      if (narration && /[\p{L}\p{N}]/u.test(narration)) {
        segments.push({ type: 'narration', text: narration });
      }
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
    if (narration && /[\p{L}\p{N}]/u.test(narration)) {
      segments.push({ type: 'narration', text: narration });
    }
  }

  return segments;
}

/**
 * Resolve NPC display name.
 * If the NPC's name appears in knownNpcNames, show the canonical form.
 * Otherwise show the parser-extracted name directly (it was parsed from the narrator text).
 * Only fall back to "Name Unknown" if speakerName is empty/missing.
 */
export function resolveNpcDisplayName(
  speakerName: string,
  knownNpcNames: Set<string>,
): string {
  if (!speakerName || !speakerName.trim()) return '*Name Unknown*';
  for (const known of knownNpcNames) {
    if (known.toLowerCase() === speakerName.toLowerCase()) return known;
  }
  return speakerName;
}
