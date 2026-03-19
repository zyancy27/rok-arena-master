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
 *   - Name acts. "dialogue"
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

// Name: at least 2 alpha chars. Allows hyphenated names (e.g. Ka-Rin).
// Bold markdown names (**Name**) or plain capitalized names.
const NAME_CAPTURE = String.raw`(?:\*\*([^*]{2,})\*\*|([A-Z][A-Za-z]{1,}(?:[-'][A-Za-z]+)?(?:\s+[A-Z][A-Za-z]+(?:[-'][A-Za-z]+)?){0,3}))`;

// Match both straight and curly quotes for dialogue
const Q_OPEN = '["\\u201C]';
const Q_CLOSE = '["\\u201D]';
const DIALOGUE_CAPTURE = `${Q_OPEN}([^"\\u201D]+)${Q_CLOSE}`;

const SPEECH_CONNECTOR = String.raw`\s*(?:(?:${SPEECH_VERBS})\s*[,:]?\s*|[:;\u2014\u2013-]\s*)`;

// --- Patterns ---

const PATTERN_BEFORE = new RegExp(
  `${NAME_CAPTURE}${SPEECH_CONNECTOR}${DIALOGUE_CAPTURE}`,
  'g',
);

const PATTERN_BEFORE_EXTENDED = new RegExp(
  `${NAME_CAPTURE}\\s+(?:finally\\s+)?(?:${SPEECH_VERBS})[,]?\\s+[^"\\u201C\\u201D]{1,200}?[,]\\s*${DIALOGUE_CAPTURE}`,
  'g',
);

const PATTERN_AFTER = new RegExp(
  `${DIALOGUE_CAPTURE}[,.]?\\s*(?:${SPEECH_VERBS})\\s+${NAME_CAPTURE}`,
  'g',
);

const PATTERN_AFTER_PRONOUN = new RegExp(
  `${DIALOGUE_CAPTURE}[,.]?\\s*(?:he|she|they)\\s+(?:${SPEECH_VERBS})`,
  'g',
);

const PATTERN_ACTION_THEN_SPEECH = new RegExp(
  `${NAME_CAPTURE}[^"\\u201C\\u201D]{1,200}?[.!?]\\s*${DIALOGUE_CAPTURE}`,
  'g',
);

interface RawMatch {
  start: number;
  end: number;
  speakerName: string;
  dialogue: string;
}

// --- Name cleaning ---

const COMMON_WORDS = new Set([
  'The', 'This', 'That', 'They', 'Then', 'There', 'Here', 'With', 'From',
  'Into', 'Upon', 'What', 'When', 'Where', 'Which', 'While', 'After',
  'Before', 'Under', 'Above', 'Below', 'Each', 'Every', 'Some', 'Your',
  'Their', 'Its', 'She', 'Her', 'His', 'But', 'And', 'For', 'Not', 'You',
  'Are', 'Was', 'Were', 'Has', 'Had', 'Have', 'Can', 'May', 'Will',
  'Just', 'Now', 'Still', 'Yet', 'Too', 'Very', 'Only',
]);

function cleanSpeakerName(raw: string | undefined): string {
  if (!raw || !raw.trim()) return '';
  let name = raw.trim();
  // Strip trailing possessive 's / \u2019s
  name = name.replace(/['\u2019]s$/i, '');
  name = name.trim();
  if (name.length < 2) return '';
  if (COMMON_WORDS.has(name)) return '';
  return name;
}

function resolveMatchedName(...candidates: Array<string | undefined>): string {
  for (const c of candidates) {
    const cleaned = cleanSpeakerName(c);
    if (cleaned) return cleaned;
  }
  return '';
}

function inferContextualSpeakerName(context: string): string {
  const namePattern = new RegExp(NAME_CAPTURE, 'g');
  let lastName = '';
  let match: RegExpExecArray | null;
  while ((match = namePattern.exec(context)) !== null) {
    const candidate = resolveMatchedName(match[1], match[2]);
    if (candidate) lastName = candidate;
  }
  return lastName;
}

// --- Main parser ---

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

      let speakerName: string;
      if (isBeforePattern || isActionThenSpeech) {
        speakerName = resolveMatchedName(match[1], match[2]);
      } else if (isAfterPattern) {
        speakerName = resolveMatchedName(match[2], match[3]);
      } else {
        // Pronoun pattern – look backwards for the last named character
        speakerName = inferContextualSpeakerName(
          text.slice(Math.max(0, match.index - 160), match.index),
        );
      }

      const dialogue = ((isBeforePattern || isActionThenSpeech) ? match[3] : match[1])?.trim() ?? '';
      if (!speakerName || !dialogue) continue;

      // For action-then-speech, check if a different NPC name is closer to the quote
      if (isActionThenSpeech) {
        const fullMatch = match[0];
        const quoteIdx = fullMatch.slice(speakerName.length).search(/["\\u201C]/);
        const actionGap = quoteIdx >= 0
          ? fullMatch.slice(speakerName.length, speakerName.length + quoteIdx)
          : fullMatch.slice(speakerName.length);
        const innerNamePattern = new RegExp(NAME_CAPTURE, 'g');
        let innerMatch: RegExpExecArray | null;
        let lastInnerName = '';
        while ((innerMatch = innerNamePattern.exec(actionGap)) !== null) {
          const candidate = resolveMatchedName(innerMatch[1], innerMatch[2]);
          if (candidate && candidate !== speakerName && candidate.includes(' ')) {
            lastInnerName = candidate;
          }
        }
        speakerName = lastInnerName || speakerName;
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

  // Sort by position and deduplicate overlapping matches
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

  for (const m of deduped) {
    if (m.start > cursor) {
      const narration = text.slice(cursor, m.start).trim();
      if (narration && /[\p{L}\p{N}]/u.test(narration)) {
        segments.push({ type: 'narration', text: narration });
      }
    }
    segments.push({
      type: 'npc_dialogue',
      speakerName: m.speakerName,
      dialogue: m.dialogue,
    });
    cursor = m.end;
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
 * Otherwise show the parser-extracted name directly.
 * Only fall back to "Name Unknown" if speakerName is empty/missing.
 */
export function resolveNpcDisplayName(
  speakerName: string,
  knownNpcNames: Set<string>,
): string {
  if (!speakerName || !speakerName.trim()) return '*Name Unknown*';
  // Check for exact or case-insensitive match
  for (const known of knownNpcNames) {
    if (known.toLowerCase() === speakerName.toLowerCase()) return known;
  }
  // Also check if the known name contains this name or vice versa (partial match)
  for (const known of knownNpcNames) {
    if (known.toLowerCase().includes(speakerName.toLowerCase()) ||
        speakerName.toLowerCase().includes(known.toLowerCase())) {
      return known;
    }
  }
  return speakerName;
}
