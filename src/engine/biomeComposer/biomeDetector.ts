/**
 * Biome Detector — Step 1
 * 
 * Parses location names, narrator text, and scenario data
 * to determine biome identity with hybrid composition.
 */

import type { BiomeBase, BiomeModifier, BiomeIdentity } from './types';

// ── Keyword → BiomeBase mapping ─────────────────────────────────

const BIOME_KEYWORDS: Record<BiomeBase, string[]> = {
  forest: ['forest', 'woods', 'grove', 'treeline', 'canopy', 'woodland', 'thicket'],
  jungle: ['jungle', 'rainforest', 'tropical'],
  swamp: ['swamp', 'bog', 'marsh', 'wetland', 'bayou', 'mire', 'fen'],
  holy_ruins: ['temple', 'shrine', 'cathedral', 'chapel', 'monastery', 'sacred', 'divine', 'blessed', 'holy'],
  industrial: ['factory', 'warehouse', 'plant', 'industrial', 'smelting', 'foundry', 'mill', 'refinery'],
  dam: ['dam', 'turbine', 'floodgate', 'reservoir', 'hydroelectric'],
  city_rooftop: ['rooftop', 'high-rise', 'highrise', 'skyscraper', 'tower', 'penthouse'],
  urban_interior: ['mall', 'office', 'apartment', 'store', 'lobby', 'corridor', 'hallway', 'station', 'terminal', 'market', 'plaza', 'village', 'town', 'settlement', 'street', 'alley', 'district', 'city', 'downtown', 'urban'],
  bridge: ['bridge', 'suspension', 'overpass', 'viaduct', 'crossing'],
  cave: ['cave', 'cavern', 'grotto', 'tunnel', 'mine', 'underground', 'sewer', 'catacombs'],
  canyon: ['canyon', 'gorge', 'ravine', 'chasm', 'crevasse'],
  mountain: ['mountain', 'peak', 'summit', 'cliff', 'alpine', 'ridge', 'highlands'],
  snowfield: ['snow', 'ice', 'glacier', 'tundra', 'arctic', 'frozen', 'permafrost', 'blizzard'],
  volcanic: ['volcanic', 'lava', 'magma', 'caldera', 'volcano', 'basalt', 'molten', 'eruption'],
  underwater: ['underwater', 'ocean', 'deep sea', 'aquatic', 'abyss', 'coral', 'submerged', 'seabed'],
  alien_biome: ['alien', 'xenomorph', 'otherworldly', 'extraterrestrial', 'void', 'dimension', 'astral', 'cosmic'],
  airship: ['airship', 'vessel', 'ship', 'deck', 'zeppelin', 'frigate', 'carrier', 'aircraft', 'flying'],
  reactor_facility: ['reactor', 'nuclear', 'meltdown', 'cooling', 'containment', 'lab', 'laboratory', 'research', 'facility', 'complex', 'bunker', 'compound'],
  desert: ['desert', 'sand', 'dune', 'arid', 'oasis', 'wasteland', 'badlands'],
  ruins: ['ruins', 'ancient', 'crumbl', 'collapsed', 'derelict', 'abandoned', 'dungeon', 'crypt', 'tomb', 'ruin'],
};

const MODIFIER_KEYWORDS: Record<BiomeModifier, string[]> = {
  infested: ['infested', 'corrupt', 'plague', 'hive', 'parasite', 'tainted', 'blight', 'swarm', 'infestation'],
  holy: ['holy', 'sacred', 'blessed', 'divine', 'consecrated', 'hallowed'],
  flooded: ['flooded', 'submerged', 'waterlogged', 'drowned', 'deluge', 'flood'],
  collapsed: ['collapsed', 'crumbled', 'ruined', 'shattered', 'destroyed', 'wrecked'],
  burning: ['burning', 'fire', 'flame', 'ablaze', 'inferno', 'scorched'],
  frozen: ['frozen', 'icy', 'frost', 'glacial', 'frigid'],
  corrupted: ['corrupted', 'dark', 'shadow', 'cursed', 'twisted', 'warped'],
  overgrown: ['overgrown', 'reclaimed', 'wild', 'verdant', 'lush'],
  vertical: ['vertical', 'freefall', 'descent', 'ascent', 'climbing', 'towering', 'tall'],
  underground: ['underground', 'subterranean', 'below', 'buried', 'deep'],
  aerial: ['aerial', 'floating', 'sky', 'cloud', 'airborne', 'hovering'],
  toxic: ['toxic', 'poison', 'chemical', 'acid', 'noxious', 'venomous', 'miasma'],
  ancient: ['ancient', 'old', 'primordial', 'timeless', 'forgotten'],
  abandoned: ['abandoned', 'deserted', 'forsaken', 'empty', 'desolate'],
  high_tech: ['high-tech', 'cyber', 'neon', 'digital', 'holographic', 'advanced'],
  mystical: ['mystical', 'magical', 'enchanted', 'ethereal', 'arcane', 'supernatural'],
};

/**
 * Detect biome identity from combined text input.
 */
export function detectBiome(
  locationName?: string | null,
  narratorText?: string | null,
  scenarioEnv?: string | null,
): BiomeIdentity {
  // Combine all text sources
  const combined = [
    locationName ?? '',
    narratorText ?? '',
    scenarioEnv ?? '',
  ].join(' ').toLowerCase();

  // Score each biome base
  const scores: Record<string, number> = {};
  for (const [biome, keywords] of Object.entries(BIOME_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        // Exact word in location name gets higher weight
        const inName = (locationName ?? '').toLowerCase().includes(kw);
        score += inName ? 3 : 1;
      }
    }
    if (score > 0) scores[biome] = score;
  }

  // Sort by score descending
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const primary: BiomeBase = (sorted[0]?.[0] as BiomeBase) ?? 'ruins';
  const secondary: BiomeBase | undefined = sorted[1]?.[1] > 0 ? (sorted[1][0] as BiomeBase) : undefined;
  const topScore = sorted[0]?.[1] ?? 0;
  const confidence = Math.min(1, topScore / 6);

  // Detect modifiers
  const modifiers: BiomeModifier[] = [];
  for (const [mod, keywords] of Object.entries(MODIFIER_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        modifiers.push(mod as BiomeModifier);
        break;
      }
    }
  }

  return { primary, secondary, modifiers, confidence };
}
