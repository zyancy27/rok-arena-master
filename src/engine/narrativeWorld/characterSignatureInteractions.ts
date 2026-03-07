/**
 * System 7 — Character Signature Interactions
 *
 * Observes player decision patterns and adjusts environment
 * generation to feel responsive to each character's playstyle.
 */

import type { CharacterSignatureProfile, SignaturePattern } from './types';

// ── Profile Management ──────────────────────────────────────────

export function createSignatureProfile(characterId: string): CharacterSignatureProfile {
  return {
    characterId,
    patterns: {
      stealth: 0,
      investigation: 0,
      aggression: 0,
      protection: 0,
      diplomacy: 0,
      exploration: 0,
      destruction: 0,
    },
    dominantPattern: 'exploration',
    totalActions: 0,
  };
}

function computeDominant(patterns: Record<SignaturePattern, number>): SignaturePattern {
  let best: SignaturePattern = 'exploration';
  let max = -1;
  for (const [key, val] of Object.entries(patterns)) {
    if (val > max) {
      max = val;
      best = key as SignaturePattern;
    }
  }
  return best;
}

export function recordAction(
  profile: CharacterSignatureProfile,
  pattern: SignaturePattern,
  weight = 1,
): CharacterSignatureProfile {
  const patterns = { ...profile.patterns };
  patterns[pattern] += weight;
  return {
    ...profile,
    patterns,
    dominantPattern: computeDominant(patterns),
    totalActions: profile.totalActions + 1,
  };
}

// ── Action Parsing ──────────────────────────────────────────────

const ACTION_KEYWORDS: Record<SignaturePattern, RegExp> = {
  stealth: /sneak|hide|shadow|quiet|creep|slip|avoid|stealth/i,
  investigation: /inspect|examine|investigate|look|search|study|read|analyze/i,
  aggression: /attack|strike|slam|smash|punch|charge|rush|fight/i,
  protection: /protect|shield|guard|defend|cover|save|help|rescue/i,
  diplomacy: /talk|speak|negotiate|persuade|calm|reason|plea/i,
  exploration: /explore|wander|climb|jump|traverse|cross|enter|descend/i,
  destruction: /destroy|break|tear|rip|shatter|demolish|crush|burn/i,
};

/**
 * Analyze player text and update the signature profile.
 */
export function analyzePlayerAction(
  profile: CharacterSignatureProfile,
  text: string,
): CharacterSignatureProfile {
  let updated = profile;
  for (const [pattern, regex] of Object.entries(ACTION_KEYWORDS)) {
    if (regex.test(text)) {
      updated = recordAction(updated, pattern as SignaturePattern);
    }
  }
  return updated;
}

// ── Environment Suggestions ─────────────────────────────────────

export interface SignatureEnvironmentHint {
  pattern: SignaturePattern;
  suggestion: string;
  narratorHint: string;
}

const ENVIRONMENT_HINTS: Record<SignaturePattern, SignatureEnvironmentHint> = {
  stealth: {
    pattern: 'stealth',
    suggestion: 'Generate shadow corridors or concealment opportunities.',
    narratorHint: 'This character prefers stealth. Consider dim passages, cover-rich areas, or alternate quiet routes.',
  },
  investigation: {
    pattern: 'investigation',
    suggestion: 'Place inspectable clues and hidden details.',
    narratorHint: 'This character is curious. Place discoverable objects, unusual markings, or environmental puzzles.',
  },
  aggression: {
    pattern: 'aggression',
    suggestion: 'Create open confrontation spaces and destructible elements.',
    narratorHint: 'This character favors direct action. Open combat spaces or destructible barriers may trigger engagement.',
  },
  protection: {
    pattern: 'protection',
    suggestion: 'Include vulnerable NPCs or fragile structures to defend.',
    narratorHint: 'This character has a protective instinct. Consider endangered figures or critical structures.',
  },
  diplomacy: {
    pattern: 'diplomacy',
    suggestion: 'Place NPCs or situations that reward communication.',
    narratorHint: 'This character attempts dialogue. Consider NPCs or factional encounters.',
  },
  exploration: {
    pattern: 'exploration',
    suggestion: 'Open branching paths and hidden areas.',
    narratorHint: 'This character explores freely. Multiple paths, verticality, or hidden zones enrich their experience.',
  },
  destruction: {
    pattern: 'destruction',
    suggestion: 'Provide breakable walls, collapsible structures, and chain-reaction opportunities.',
    narratorHint: 'This character causes environmental damage. Fragile structures or chain-reaction hazards fit well.',
  },
};

export function getEnvironmentHint(
  profile: CharacterSignatureProfile,
): SignatureEnvironmentHint {
  return ENVIRONMENT_HINTS[profile.dominantPattern];
}

/**
 * Get top-N patterns for multi-factor environment generation.
 */
export function getTopPatterns(
  profile: CharacterSignatureProfile,
  count = 2,
): SignaturePattern[] {
  return Object.entries(profile.patterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([k]) => k as SignaturePattern);
}
