/**
 * Narrator Voice Script Builder
 *
 * Compiles a narrator-led "speech script" for a single narrated beat.
 * The narrator voice should speak the FULL exchange — narrator exposition,
 * NPC dialogue, opponent lines, and any quoted dialogue inside narration —
 * not just the narrator-only string.
 *
 * UI rendering still uses `response.narration` (unchanged). The voice
 * playback consumes the script returned by `buildNarratorVoiceScript`.
 */

interface SceneBeatLike {
  type?: string;
  content?: string;
  speaker?: string | null;
}

interface NarratorResponseLike {
  narration?: string;
  sceneBeats?: SceneBeatLike[] | null;
  npcLines?: Array<{ speaker?: string | null; content?: string }> | null;
  opponentDialogue?: Array<{ speaker?: string | null; content?: string }> | null;
}

/** Beats whose content represents *spoken* lines that belong in the script. */
const SPOKEN_BEAT_TYPES = new Set([
  'narrator',
  'narration',
  'npc_dialogue',
  'dialogue',
  'opponent',
  'opponent_dialogue',
  'environment',
  'consequence',
  'combat_exchange',
]);

/** Beats we deliberately skip (UI cues, not voice). */
const SKIP_BEAT_TYPES = new Set([
  'hook',
  'hook_surface',
  'opportunity_surface',
  'transition',
]);

function cleanForSpeech(text: string): string {
  return text
    // Strip markdown emphasis
    .replace(/[*_`]+/g, '')
    // Strip leading speaker labels like "Lyra:" so we don't say them awkwardly
    .replace(/^\s*[A-Z][\w' -]{1,40}:\s*/u, (match) => {
      // Keep short labels (<=20 chars) as a spoken cue followed by a pause.
      const label = match.replace(/:$/, '').trim();
      return `${label}: `;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function pushIfNonEmpty(parts: string[], value: string | undefined | null) {
  if (!value) return;
  const cleaned = cleanForSpeech(String(value));
  if (cleaned.length === 0) return;
  // De-duplicate adjacent identical segments (the narration string and the
  // first scene beat often overlap).
  const last = parts[parts.length - 1];
  if (last && last.toLowerCase() === cleaned.toLowerCase()) return;
  parts.push(cleaned);
}

/**
 * Build the full narrator voice script for a beat.
 *
 * Falls back to the bare `narration` string when no structured beats or
 * dialogue arrays are present, so existing single-string narration keeps
 * working unchanged.
 */
export function buildNarratorVoiceScript(
  narration: string | null | undefined,
  response?: NarratorResponseLike | null,
): string {
  const baseNarration = typeof narration === 'string' ? narration.trim() : '';
  const beats = Array.isArray(response?.sceneBeats) ? response!.sceneBeats! : [];
  const npcLines = Array.isArray(response?.npcLines) ? response!.npcLines! : [];
  const opponentLines = Array.isArray(response?.opponentDialogue) ? response!.opponentDialogue! : [];

  // No structured extras → just speak the narration string as-is.
  if (beats.length === 0 && npcLines.length === 0 && opponentLines.length === 0) {
    return baseNarration;
  }

  const parts: string[] = [];

  // Prefer structured scene beats when available — they carry NPC dialogue
  // alongside narrator exposition in the order the LLM intended.
  if (beats.length > 0) {
    for (const beat of beats) {
      const type = (beat?.type || '').toLowerCase();
      if (SKIP_BEAT_TYPES.has(type)) continue;
      if (type && !SPOKEN_BEAT_TYPES.has(type)) continue;

      const content = beat?.content || '';
      if (!content) continue;

      const speaker = (beat?.speaker || '').trim();
      const isDialogueBeat = type === 'npc_dialogue' || type === 'dialogue' || type === 'opponent' || type === 'opponent_dialogue';

      if (isDialogueBeat && speaker) {
        pushIfNonEmpty(parts, `${speaker} says: ${content}`);
      } else {
        pushIfNonEmpty(parts, content);
      }
    }
  } else if (baseNarration) {
    // No beats but extra lines — start with the narrator prose, then append.
    pushIfNonEmpty(parts, baseNarration);
  }

  for (const line of npcLines) {
    const speaker = (line?.speaker || '').trim();
    const content = line?.content || '';
    if (!content) continue;
    pushIfNonEmpty(parts, speaker ? `${speaker} says: ${content}` : content);
  }

  for (const line of opponentLines) {
    const speaker = (line?.speaker || '').trim();
    const content = line?.content || '';
    if (!content) continue;
    pushIfNonEmpty(parts, speaker ? `${speaker} says: ${content}` : content);
  }

  const script = parts.join(' ').trim();
  return script.length > 0 ? script : baseNarration;
}
