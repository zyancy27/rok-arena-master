/**
 * Narration Sound Parser — extracts sound cues from narrator text.
 * Uses multi-pass analysis: exact phrases → compound context → single keywords.
 * Only returns cues that the narrator has explicitly described.
 */

import { ALL_SOUND_CUES, type SoundCue } from './narration-sound-cues';

export interface ParsedSoundEvent {
  cue: SoundCue;
  /** Character offset in text where the keyword was found (for ordering) */
  textOffset: number;
  /** Confidence: how strongly the text implies this cue (0-1) */
  confidence: number;
}

/**
 * Compound context patterns — multi-word phrases that strongly imply a specific cue
 * even when individual words might not match. Checked before single-pattern cues.
 */
const COMPOUND_CONTEXTS: Array<{ pattern: RegExp; cueId: string; confidence: number }> = [
  // Water + structure = industrial water sounds
  { pattern: /\b(water\s*(roar|echo|rush|thunder)s?\s*(below|beneath|under|around))\b/i, cueId: 'river', confidence: 0.95 },
  { pattern: /\b(dam|reservoir|sluice|spillway)\b/i, cueId: 'river', confidence: 0.85 },
  { pattern: /\b(flood(ed|ing)?|torrent|deluge)\b/i, cueId: 'river', confidence: 0.9 },
  // Tension + environment
  { pattern: /\b(air\s*(thick|heavy|dense|still)|silence\s*(press|weigh|hang|settle|thick))\b/i, cueId: 'wind', confidence: 0.5 },
  { pattern: /\b(mist\s*(roll|creep|curl|settle|hang|thick)|fog\s*(roll|creep|settle|thick|descend))\b/i, cueId: 'wind', confidence: 0.6 },
  // Structural stress compound phrases
  { pattern: /\b(structure|building|wall|ceiling|floor|bridge|platform|tower)\s*(shake|shudder|tremble|sway|buckle|crack|split)\b/i, cueId: 'building_groan', confidence: 0.9 },
  { pattern: /\b(under\s*(the\s+)?(weight|strain|pressure|stress))\b/i, cueId: 'creaking_metal', confidence: 0.75 },
  // Creature compound phrases  
  { pattern: /\b(eyes?\s*(glow|gleam|shine|flash|watch)\s*(in|from|through)\s*(the\s+)?(dark|shadow|gloom))\b/i, cueId: 'creature_movement', confidence: 0.8 },
  { pattern: /\b(something\s*(watch|follow|stalk|track|trail))\b/i, cueId: 'creature_movement', confidence: 0.75 },
  { pattern: /\b(claws?\s*(scrape|scratch|click|tap|drag)\s*(on|across|against|along))\b/i, cueId: 'creature_movement', confidence: 0.85 },
  // Fire + destruction
  { pattern: /\b(engulfed?\s*(in|by)\s*(flame|fire)|set\s*(on\s+)?fire|ablaze)\b/i, cueId: 'crackling_fire', confidence: 0.95 },
  // Weather compound
  { pattern: /\b(sky\s*(darken|crack|split|flash|light\s*up)|cloud[s]?\s*(gather|darken|roll\s*in))\b/i, cueId: 'thunder_distant', confidence: 0.8 },
  { pattern: /\b(storm\s*(break|rage|hit|arrive|approach|descend|unleash))\b/i, cueId: 'rain', confidence: 0.85 },
  // Impact + aftermath
  { pattern: /\b(dust\s*(and|,)\s*(debris|rubble)|aftermath|wreckage|devastation)\b/i, cueId: 'dust_settling', confidence: 0.85 },
  // Crowd + emotion
  { pattern: /\b(crowd\s*(erupt|roar|surge|scatter|panic|flee))\b/i, cueId: 'crowd_murmur', confidence: 0.9 },
  { pattern: /\b(marketplace|bazaar|festival|celebration|gathering)\b/i, cueId: 'crowd_murmur', confidence: 0.7 },
  // Underground / cave
  { pattern: /\b(echo(es)?\s*(off|through|around|in)\s*(the\s+)?(wall|stone|cavern|tunnel|chamber))\b/i, cueId: 'dripping_water', confidence: 0.6 },
  { pattern: /\b(stalactite|stalagmite|cavern\s*(open|stretch|yawn))\b/i, cueId: 'dripping_water', confidence: 0.8 },
  // Magic compound
  { pattern: /\b(rune[s]?\s*(glow|pulse|flare|activate|ignite)|glyph[s]?\s*(glow|pulse|flare|activate))\b/i, cueId: 'electrical_hum', confidence: 0.7 },
  { pattern: /\b(barrier\s*(shimmer|pulse|crack|weaken|shatter)|ward\s*(flicker|break|shatter|fail))\b/i, cueId: 'sparks', confidence: 0.75 },
];

/**
 * Parse narrator text and return matching sound cues, ordered by appearance.
 * Uses a multi-pass approach:
 * 1. Compound context phrases (highest confidence)
 * 2. Individual cue patterns
 * 3. Deduplication by family
 */
export function parseNarrationForSounds(text: string): ParsedSoundEvent[] {
  const events: ParsedSoundEvent[] = [];
  const seenFamilies = new Set<string>();
  const seenCueIds = new Set<string>();

  // Pass 1: Compound context patterns (high confidence multi-word matches)
  for (const compound of COMPOUND_CONTEXTS) {
    const match = compound.pattern.exec(text);
    if (!match) continue;

    const cue = ALL_SOUND_CUES.find(c => c.id === compound.cueId);
    if (!cue) continue;
    if (seenCueIds.has(cue.id)) continue;

    // Allow one cue per family
    if (seenFamilies.has(cue.family)) continue;

    seenFamilies.add(cue.family);
    seenCueIds.add(cue.id);
    events.push({
      cue,
      textOffset: match.index ?? 0,
      confidence: compound.confidence,
    });
  }

  // Pass 2: Standard cue patterns
  for (const cue of ALL_SOUND_CUES) {
    if (seenCueIds.has(cue.id)) continue;
    if (seenFamilies.has(cue.family)) continue;

    for (const pattern of cue.patterns) {
      // Reset regex lastIndex for safety
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) {
        seenFamilies.add(cue.family);
        seenCueIds.add(cue.id);

        events.push({
          cue,
          textOffset: match.index ?? 0,
          confidence: 0.7, // standard pattern match
        });
        break;
      }
    }
  }

  // Sort by text position — trigger sounds in order they appear
  events.sort((a, b) => a.textOffset - b.textOffset);

  return events;
}

/**
 * Classify the overall scene intensity from narrator text.
 * Uses weighted keyword scoring for more nuanced classification.
 */
export type SceneIntensity = 'quiet' | 'tense' | 'combat';

export function classifySceneIntensity(text: string): SceneIntensity {
  const t = text.toLowerCase();

  // Score-based: count weighted matches
  let combatScore = 0;
  let tenseScore = 0;

  // Combat indicators
  const combatPatterns = [
    { pattern: /\b(attack|strikes?|slash|fight|combat|clash|battle)\b/g, weight: 3 },
    { pattern: /\b(dodge|parry|block|charge|lunge)\b/g, weight: 2 },
    { pattern: /\b(explo|destroy|smash|blast|detonat|shatter)\b/g, weight: 3 },
    { pattern: /\b(blood|wound|injur|bleed|scar)\b/g, weight: 2 },
    { pattern: /\b(arrow|sword|blade|spear|axe|hammer|dagger|shield)\b/g, weight: 1 },
  ];

  // Tense indicators
  const tensePatterns = [
    { pattern: /\b(danger|threat|ominous|dread|foreboding)\b/g, weight: 3 },
    { pattern: /\b(shadow|lurk|growl|hiss|stalk|creep)\b/g, weight: 2 },
    { pattern: /\b(trembl|rumbl|unstable|collapse|creak|groan|strain)\b/g, weight: 2 },
    { pattern: /\b(scream|warning|ambush|trap|alarm|siren)\b/g, weight: 2 },
    { pattern: /\b(dark|eerie|sinister|menac|haunting)\b/g, weight: 1 },
  ];

  for (const { pattern, weight } of combatPatterns) {
    const matches = t.match(pattern);
    if (matches) combatScore += matches.length * weight;
  }

  for (const { pattern, weight } of tensePatterns) {
    const matches = t.match(pattern);
    if (matches) tenseScore += matches.length * weight;
  }

  if (combatScore >= 4) return 'combat';
  if (combatScore >= 2 || tenseScore >= 4) return 'tense';
  if (tenseScore >= 2) return 'tense';
  return 'quiet';
}
