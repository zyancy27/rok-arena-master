/**
 * Random Location & Campaign Name Generator
 * Generates evocative, theme-engine-compatible names using combinatorial word pools.
 */

// ── Location building blocks ────────────────────────────────────

const TERRAIN = [
  'Mountains', 'Valley', 'Canyon', 'Ridge', 'Plateau', 'Cliffs',
  'Gorge', 'Mesa', 'Peaks', 'Highlands', 'Lowlands', 'Ravine',
];

const BIOME = [
  'Forest', 'Jungle', 'Desert', 'Tundra', 'Swamp', 'Marsh',
  'Plains', 'Savanna', 'Steppe', 'Taiga', 'Wetlands', 'Oasis',
];

const STRUCTURE = [
  'Fortress', 'Citadel', 'Tower', 'Temple', 'Cathedral', 'Prison',
  'Arena', 'Colosseum', 'Castle', 'Bunker', 'Outpost', 'Vault',
  'Laboratory', 'Hospital', 'Library', 'Courthouse', 'Warehouse',
  'Office Complex', 'Spire', 'Lighthouse', 'Observatory', 'Sanctum',
];

const URBAN = [
  'City Streets', 'Rooftop', 'Alleyway', 'Underground Station',
  'Penthouse Lobby', 'Parking Garage', 'Market District', 'Harbor',
  'Dockyard', 'Shipyard', 'Train Station', 'Bridge', 'Plaza',
  'Corridor Complex', 'Grand Hall', 'Office Floor', 'Tavern',
];

const ELEMENTAL = [
  'Volcanic', 'Frozen', 'Crystal', 'Toxic', 'Burning', 'Flooded',
  'Electrified', 'Haunted', 'Celestial', 'Corrupted', 'Radiant',
  'Smoky', 'Overgrown', 'Rusted', 'Shattered', 'Sunken', 'Floating',
  'Stormy', 'Foggy', 'Neon-lit', 'Acid-scarred', 'Holy', 'Cursed',
];

const ATMOSPHERE = [
  'Abandoned', 'Ancient', 'Crumbling', 'Forbidden', 'Lost',
  'Besieged', 'Ruined', 'Forgotten', 'Sacred', 'Infested',
  'Desolate', 'Thriving', 'War-torn', 'Mysterious', 'Legendary',
  'Decaying', 'Pristine', 'Shimmering', 'Darkened', 'Blazing',
];

const WATER = [
  'Coastline', 'Deep Sea Trench', 'Underwater Ruins', 'Frozen Lake',
  'River Delta', 'Waterfall Basin', 'Coral Reef', 'Ship Deck',
  'Pirate Galleon', 'Sunken Ship', 'Tidal Caves', 'Hot Springs',
];

const COSMIC = [
  'Space Station', 'Asteroid Field', 'Orbital Platform', 'Void Rift',
  'Nebula Cloud', 'Black Hole Edge', 'Warp Gate', 'Star Forge',
  'Moon Base', 'Gravity Well', 'Time Rift', 'Mirror Dimension',
];

const ALL_LOCATIONS = [TERRAIN, BIOME, STRUCTURE, URBAN, WATER, COSMIC];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random battle/campaign location string.
 * Combines atmosphere + (elemental) + place for rich, theme-engine-compatible names.
 */
export function generateRandomLocation(): string {
  const pool = pick(ALL_LOCATIONS);
  const place = pick(pool);
  
  // 70% chance to add atmosphere prefix
  const hasAtmosphere = Math.random() < 0.7;
  // 40% chance to add elemental modifier
  const hasElemental = Math.random() < 0.4;

  const parts: string[] = [];
  if (hasAtmosphere) parts.push(pick(ATMOSPHERE));
  if (hasElemental) parts.push(pick(ELEMENTAL));
  parts.push(place);

  return parts.join(' ');
}

// ── Campaign name building blocks ───────────────────────────────

const NAME_PREFIX = [
  'The', 'Rise of the', 'Fall of the', 'Chronicles of the',
  'Siege of the', 'Quest for the', 'The Last', 'The Lost',
  'Beyond the', 'Beneath the', 'The Shattered', 'The Eternal',
  'Curse of the', 'Echoes of the', 'The Forgotten', 'Legend of the',
  'Wrath of the', 'Shadow of the', 'Heart of the', 'Dawn of the',
];

const NAME_CORE = [
  'Crown', 'Blade', 'Throne', 'Gate', 'Citadel', 'Empire',
  'Kingdom', 'Realm', 'Star', 'Moon', 'Sun', 'Storm',
  'Shadow', 'Flame', 'Frost', 'Void', 'Dragon', 'Phoenix',
  'Titan', 'Oracle', 'Serpent', 'Raven', 'Iron', 'Crystal',
  'Obsidian', 'Emerald', 'Crimson', 'Golden', 'Silver', 'Arcane',
];

const NAME_SUFFIX = [
  '', '', '', // Empty = no suffix (higher chance)
  'of Ashes', 'of Stars', 'of Ruin', 'of Legends',
  'Reborn', 'Awakened', 'Unbound', 'Eternal',
  'of the Deep', 'of the Fallen', 'of Twilight',
];

/**
 * Generate a random campaign name.
 */
export function generateRandomCampaignName(): string {
  const prefix = pick(NAME_PREFIX);
  const core = pick(NAME_CORE);
  const suffix = pick(NAME_SUFFIX);

  return [prefix, core, suffix].filter(Boolean).join(' ').trim();
}
