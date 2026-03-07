/**
 * System 8 — Discovery Moments
 *
 * Generates rare, exciting discoveries during campaign mode.
 * These are infrequent events that enrich storytelling.
 */

import type { DiscoveryMoment, DiscoveryRarity, SignaturePattern } from './types';

// ── Discovery Templates ─────────────────────────────────────────

interface DiscoveryTemplate {
  type: DiscoveryMoment['type'];
  rarity: DiscoveryRarity;
  names: string[];
  descriptions: string[];
  reveals: string[];
}

const TEMPLATES: DiscoveryTemplate[] = [
  {
    type: 'hidden_entrance',
    rarity: 'uncommon',
    names: ['Concealed Passage', 'Hidden Doorway', 'Secret Hatch'],
    descriptions: [
      'A section of wall shifts slightly when pressure is applied.',
      'The ground here sounds hollow beneath your feet.',
      'Vines cover what appears to be a doorframe carved into the rock.',
    ],
    reveals: [
      'The wall slides open, revealing a narrow passage beyond.',
      'The floor gives way to a hidden hatch leading below.',
      'Pulling the vines aside reveals a carved entrance.',
    ],
  },
  {
    type: 'forgotten_item',
    rarity: 'rare',
    names: ['Forgotten Journal', 'Sealed Container', 'Wrapped Bundle'],
    descriptions: [
      'Something glints beneath a pile of rubble.',
      'A container, carefully sealed, sits wedged between stones.',
      'A bundle wrapped in weathered cloth rests in a crevice.',
    ],
    reveals: [
      'Inside you find pages filled with observations about this place.',
      'The seal breaks to reveal something carefully preserved.',
      'Unwrapping the cloth reveals an object untouched by time.',
    ],
  },
  {
    type: 'secret_path',
    rarity: 'uncommon',
    names: ['Forgotten Trail', 'Underground Route', 'Ridge Path'],
    descriptions: [
      'A narrow path, nearly invisible, runs along the cliff edge.',
      'A drainage channel large enough to crawl through leads somewhere.',
      'Stones are placed in a deliberate pattern, forming stepping points.',
    ],
    reveals: [
      'The path opens to a vantage point overlooking the area.',
      'The channel opens into a space beyond the main route.',
      'Following the stones leads to an area not visible from the main path.',
    ],
  },
  {
    type: 'ancient_relic',
    rarity: 'legendary',
    names: ['Resonant Crystal', 'Bound Manuscript', 'Etched Medallion'],
    descriptions: [
      'A faint vibration hums from somewhere nearby.',
      'Dust-covered pages bound in metal rest on a pedestal.',
      'A medallion embedded in stone catches the light.',
    ],
    reveals: [
      'The crystal pulses when touched, resonating with something unseen.',
      'The manuscript contains knowledge that feels important, even if not fully understood.',
      'Prying the medallion free reveals intricate etchings on both sides.',
    ],
  },
  {
    type: 'hidden_message',
    rarity: 'rare',
    names: ['Scratched Warning', 'Encoded Note', 'Wall Inscription'],
    descriptions: [
      'Words are scratched into the wall in uneven letters.',
      'A folded note is tucked into a crack in the masonry.',
      'Symbols are painted on the floor, partially scuffed away.',
    ],
    reveals: [
      'The message reads: a warning from someone who came before.',
      'The note contains coordinates or directions to another location.',
      'The symbols form a pattern that seems to correspond to the local terrain.',
    ],
  },
  {
    type: 'buried_cache',
    rarity: 'rare',
    names: ['Supply Cache', 'Survival Kit', 'Hidden Stockpile'],
    descriptions: [
      'Disturbed earth suggests something was buried here deliberately.',
      'A marked stone sits atop what appears to be freshly packed dirt.',
    ],
    reveals: [
      'Digging reveals a sealed container of supplies.',
      'Beneath the stone you find a carefully hidden stockpile.',
    ],
  },
];

// ── Generation ──────────────────────────────────────────────────

let _discoveryId = 0;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const RARITY_WEIGHTS: Record<DiscoveryRarity, number> = {
  uncommon: 0.6,
  rare: 0.3,
  legendary: 0.1,
};

function rollRarity(): DiscoveryRarity {
  const roll = Math.random();
  if (roll < RARITY_WEIGHTS.legendary) return 'legendary';
  if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.rare) return 'rare';
  return 'uncommon';
}

/**
 * Attempt to generate a discovery moment. Returns null if the roll doesn't hit.
 */
export function attemptDiscovery(
  dayCount: number,
  dominantPattern?: SignaturePattern,
  zoneId?: string,
): DiscoveryMoment | null {
  // Base chance: ~12% per day, scaling slightly with progression
  const chance = Math.min(0.25, 0.08 + dayCount * 0.005);
  if (Math.random() > chance) return null;

  // Bias toward investigation-friendly discoveries
  const rarity = rollRarity();

  let candidates = TEMPLATES.filter((t) => t.rarity === rarity);
  if (candidates.length === 0) candidates = TEMPLATES;

  // If dominant pattern is investigation, bias toward hidden items
  if (dominantPattern === 'investigation') {
    const investigationBias = candidates.filter(
      (t) => t.type === 'hidden_message' || t.type === 'forgotten_item' || t.type === 'ancient_relic',
    );
    if (investigationBias.length > 0) candidates = investigationBias;
  }

  if (dominantPattern === 'exploration') {
    const exploreBias = candidates.filter(
      (t) => t.type === 'hidden_entrance' || t.type === 'secret_path',
    );
    if (exploreBias.length > 0) candidates = exploreBias;
  }

  const template = pickRandom(candidates);

  return {
    id: `discovery_${++_discoveryId}`,
    type: template.type,
    name: pickRandom(template.names),
    description: pickRandom(template.descriptions),
    rarity: template.rarity,
    revealText: pickRandom(template.reveals),
    zoneId,
  };
}

/**
 * Force-generate a discovery of a specific type (for narrator-triggered moments).
 */
export function forceDiscovery(
  type: DiscoveryMoment['type'],
  zoneId?: string,
): DiscoveryMoment {
  const template = TEMPLATES.find((t) => t.type === type) ?? TEMPLATES[0];
  return {
    id: `discovery_${++_discoveryId}`,
    type: template.type,
    name: pickRandom(template.names),
    description: pickRandom(template.descriptions),
    rarity: template.rarity,
    revealText: pickRandom(template.reveals),
    zoneId,
  };
}
