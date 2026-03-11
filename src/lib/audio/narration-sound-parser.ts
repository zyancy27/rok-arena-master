/**
 * Narration Sound Parser — extracts sound cues from narrator text.
 * Only returns cues that the narrator has explicitly described.
 */

import { ALL_SOUND_CUES, type SoundCue } from './narration-sound-cues';

export interface ParsedSoundEvent {
  cue: SoundCue;
  /** Character offset in text where the keyword was found (for ordering) */
  textOffset: number;
}

/**
 * Parse narrator text and return matching sound cues, ordered by appearance.
 */
export function parseNarrationForSounds(text: string): ParsedSoundEvent[] {
  const events: ParsedSoundEvent[] = [];
  const seenFamilies = new Set<string>();

  for (const cue of ALL_SOUND_CUES) {
    for (const pattern of cue.patterns) {
      const match = pattern.exec(text);
      if (match) {
        // Limit to 1 cue per family to avoid stacking similar sounds
        if (seenFamilies.has(cue.family)) continue;
        seenFamilies.add(cue.family);

        events.push({
          cue,
          textOffset: match.index ?? 0,
        });
        break; // one pattern match per cue is enough
      }
    }
  }

  // Sort by text position — trigger sounds in order they appear
  events.sort((a, b) => a.textOffset - b.textOffset);

  return events;
}

/**
 * Classify the overall scene intensity from narrator text.
 * Used to control density and volume ceilings.
 */
export type SceneIntensity = 'quiet' | 'tense' | 'combat';

export function classifySceneIntensity(text: string): SceneIntensity {
  const t = text.toLowerCase();

  if (/\b(attack|strike|slash|fight|combat|clash|charge|dodge|parry|block|battle|explo|destroy|smash|blast)\b/.test(t)) {
    return 'combat';
  }
  if (/\b(danger|threat|rumbl|shadow|lurk|growl|hiss|scream|trembl|ominous|dread|warning|ambush|trap|unstable|collapse|creak|groan|strain)\b/.test(t)) {
    return 'tense';
  }
  return 'quiet';
}
