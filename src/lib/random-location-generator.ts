/**
 * Random Location & Campaign Name Generator
 * Generates evocative, theme-engine-compatible names using combinatorial word pools.
 * Includes session-scoped memory to prevent repetition.
 */

// ── Session memory for deduplication ────────────────────────────

const recentLocations: string[] = [];
const recentCampaignNames: string[] = [];
const MAX_MEMORY = 30;

function recordRecent(list: string[], value: string) {
  list.push(value);
  if (list.length > MAX_MEMORY) list.splice(0, list.length - MAX_MEMORY);
}

function isDuplicate(list: string[], candidate: string): boolean {
  const norm = candidate.toLowerCase().trim();
  return list.some((prev) => prev.toLowerCase().trim() === norm);
}

// ── Location building blocks ────────────────────────────────────

const TERRAIN = [
  'Mountains', 'Valley', 'Canyon', 'Ridge', 'Plateau', 'Cliffs',
  'Gorge', 'Mesa', 'Peaks', 'Highlands', 'Lowlands', 'Ravine',
  'Bluffs', 'Escarpment', 'Badlands', 'Caldera',
];

const BIOME = [
  'Forest', 'Jungle', 'Desert', 'Tundra', 'Swamp', 'Marsh',
  'Plains', 'Savanna', 'Steppe', 'Taiga', 'Wetlands', 'Oasis',
  'Mangrove', 'Reef Shelf', 'Boreal Fen', 'Salt Flat',
];

const STRUCTURE = [
  'Fortress', 'Citadel', 'Tower', 'Temple', 'Cathedral', 'Prison',
  'Arena', 'Colosseum', 'Castle', 'Bunker', 'Outpost', 'Vault',
  'Laboratory', 'Hospital', 'Library', 'Courthouse', 'Warehouse',
  'Office Complex', 'Spire', 'Lighthouse', 'Observatory', 'Sanctum',
  'Refinery', 'Foundry', 'Archive', 'Barracks',
];

const URBAN = [
  'City Streets', 'Rooftop', 'Alleyway', 'Underground Station',
  'Penthouse Lobby', 'Parking Garage', 'Market District', 'Harbor',
  'Dockyard', 'Shipyard', 'Train Station', 'Bridge', 'Plaza',
  'Corridor Complex', 'Grand Hall', 'Office Floor', 'Tavern',
  'Bazaar', 'Aqueduct Walk', 'Sky Terrace', 'Canal District',
];

const ELEMENTAL = [
  'Volcanic', 'Frozen', 'Crystal', 'Toxic', 'Burning', 'Flooded',
  'Electrified', 'Haunted', 'Celestial', 'Corrupted', 'Radiant',
  'Smoky', 'Overgrown', 'Rusted', 'Shattered', 'Sunken', 'Floating',
  'Stormy', 'Foggy', 'Neon-lit', 'Acid-scarred', 'Holy', 'Cursed',
  'Petrified', 'Molten', 'Irradiated', 'Verdant', 'Scorched',
];

const ATMOSPHERE = [
  'Abandoned', 'Ancient', 'Crumbling', 'Forbidden', 'Lost',
  'Besieged', 'Ruined', 'Forgotten', 'Sacred', 'Infested',
  'Desolate', 'Thriving', 'War-torn', 'Mysterious', 'Legendary',
  'Decaying', 'Pristine', 'Shimmering', 'Darkened', 'Blazing',
  'Quarantined', 'Submerged', 'Hollowed', 'Reclaimed', 'Uncharted',
];

const WATER = [
  'Coastline', 'Deep Sea Trench', 'Underwater Ruins', 'Frozen Lake',
  'River Delta', 'Waterfall Basin', 'Coral Reef', 'Ship Deck',
  'Pirate Galleon', 'Sunken Ship', 'Tidal Caves', 'Hot Springs',
  'Kelp Forest', 'Whirlpool Basin', 'Glacial Fjord',
];

const COSMIC = [
  'Space Station', 'Asteroid Field', 'Orbital Platform', 'Void Rift',
  'Nebula Cloud', 'Black Hole Edge', 'Warp Gate', 'Star Forge',
  'Moon Base', 'Gravity Well', 'Time Rift', 'Mirror Dimension',
  'Dyson Ring Fragment', 'Comet Tail', 'Solar Collector Array',
];

const ALL_LOCATIONS = [TERRAIN, BIOME, STRUCTURE, URBAN, WATER, COSMIC];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick from array avoiding recently used values */
function pickFresh<T extends string>(arr: readonly T[], avoid: string[], maxRetries = 8): T {
  for (let i = 0; i < maxRetries; i++) {
    const candidate = pick(arr);
    if (!avoid.includes(candidate)) return candidate;
  }
  return pick(arr); // fallback
}

/**
 * Generate a random battle/campaign location string.
 * Combines atmosphere + (elemental) + place for rich, theme-engine-compatible names.
 * Session-scoped memory prevents repeating recent results.
 */
export function generateRandomLocation(): string {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pool = pick(ALL_LOCATIONS);
    const place = pickFresh(pool as readonly string[], recentLocations.slice(-10));

    const hasAtmosphere = Math.random() < 0.7;
    const hasElemental = Math.random() < 0.4;

    const parts: string[] = [];
    if (hasAtmosphere) parts.push(pickFresh(ATMOSPHERE, recentLocations.slice(-5)));
    if (hasElemental) parts.push(pickFresh(ELEMENTAL, recentLocations.slice(-5)));
    parts.push(place);

    const result = parts.join(' ');

    if (!isDuplicate(recentLocations, result)) {
      recordRecent(recentLocations, result);
      return result;
    }
  }

  // Absolute fallback — always return something
  const pool = pick(ALL_LOCATIONS);
  const result = `${pick(ATMOSPHERE)} ${pick(ELEMENTAL)} ${pick(pool)}`;
  recordRecent(recentLocations, result);
  return result;
}

/** Get recent location history for deduplication in AI prompts */
export function getRecentLocations(): readonly string[] {
  return recentLocations;
}

/** Clear location memory (e.g. on session reset) */
export function clearLocationMemory(): void {
  recentLocations.length = 0;
}

// ── Campaign name building blocks ───────────────────────────────

const NAME_PREFIX = [
  'The', 'Rise of the', 'Fall of the', 'Chronicles of the',
  'Siege of the', 'Quest for the', 'The Last', 'The Lost',
  'Beyond the', 'Beneath the', 'The Shattered', 'The Eternal',
  'Curse of the', 'Echoes of the', 'The Forgotten', 'Legend of the',
  'Wrath of the', 'Shadow of the', 'Heart of the', 'Dawn of the',
  'Ashes of the', 'Trials of the', 'The Broken', 'Relics of the',
  'Whispers of the', 'Requiem for the', 'Song of the', 'Pact of the',
];

const NAME_CORE = [
  'Crown', 'Blade', 'Throne', 'Gate', 'Citadel', 'Empire',
  'Kingdom', 'Realm', 'Star', 'Moon', 'Sun', 'Storm',
  'Shadow', 'Flame', 'Frost', 'Void', 'Dragon', 'Phoenix',
  'Titan', 'Oracle', 'Serpent', 'Raven', 'Iron', 'Crystal',
  'Obsidian', 'Emerald', 'Crimson', 'Golden', 'Silver', 'Arcane',
  'Amber', 'Ivory', 'Onyx', 'Cobalt', 'Warden', 'Harbinger',
  'Sovereign', 'Exile', 'Herald', 'Sentinel', 'Revenant', 'Specter',
];

const NAME_SUFFIX = [
  '', '', '', // Empty = no suffix (higher chance)
  'of Ashes', 'of Stars', 'of Ruin', 'of Legends',
  'Reborn', 'Awakened', 'Unbound', 'Eternal',
  'of the Deep', 'of the Fallen', 'of Twilight',
  'in Chains', 'of Embers', 'Ascendant', 'Undone',
  'of the Exiled', 'of Iron', 'of the Forgotten',
];

/**
 * Generate a random campaign name.
 * Session-scoped memory prevents repeating recent results.
 */
export function generateRandomCampaignName(): string {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const prefix = pickFresh(NAME_PREFIX, recentCampaignNames.slice(-5));
    const core = pickFresh(NAME_CORE, recentCampaignNames.slice(-5));
    const suffix = pick(NAME_SUFFIX);

    const result = [prefix, core, suffix].filter(Boolean).join(' ').trim();

    if (!isDuplicate(recentCampaignNames, result)) {
      recordRecent(recentCampaignNames, result);
      return result;
    }
  }

  const result = `${pick(NAME_PREFIX)} ${pick(NAME_CORE)} ${pick(NAME_SUFFIX)}`.trim();
  recordRecent(recentCampaignNames, result);
  return result;
}

/** Get recent campaign name history */
export function getRecentCampaignNames(): readonly string[] {
  return recentCampaignNames;
}

/** Clear campaign name memory */
export function clearCampaignNameMemory(): void {
  recentCampaignNames.length = 0;
}
