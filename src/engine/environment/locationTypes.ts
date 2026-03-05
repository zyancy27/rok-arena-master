/**
 * Location Types
 *
 * Modular building blocks for procedural environment generation.
 */

export interface LocationType {
  id: string;
  name: string;
  description: string;
  tags: string[];
  /** Base terrain modifiers that affect combat */
  terrainModifiers: string[];
  /** Compatible hazard type IDs */
  compatibleHazards: string[];
  /** Ambient audio cues */
  ambientSounds: string[];
  /** Visual atmosphere description */
  atmosphere: string;
}

export const LOCATION_TYPES: LocationType[] = [
  {
    id: 'open_field',
    name: 'Open Battlefield',
    description: 'A wide, flat expanse with no cover. Pure combat skill determines the outcome.',
    tags: ['outdoor', 'flat', 'exposed'],
    terrainModifiers: ['no cover', 'full visibility'],
    compatibleHazards: ['meteor_strike', 'energy_surge', 'seismic_tremor'],
    ambientSounds: ['wind', 'distant thunder'],
    atmosphere: 'Open sky stretches endlessly above. The ground is scarred from previous battles.',
  },
  {
    id: 'urban_ruins',
    name: 'Urban Ruins',
    description: 'Crumbling buildings and debris-strewn streets offer cover and environmental weapons.',
    tags: ['urban', 'cover', 'debris', 'vertical'],
    terrainModifiers: ['partial cover', 'debris weapons', 'unstable structures'],
    compatibleHazards: ['structural_collapse', 'gas_leak', 'electrical_hazard'],
    ambientSounds: ['crumbling concrete', 'settling metal', 'distant sirens'],
    atmosphere: 'Shattered skyscrapers lean at impossible angles. Rubble crunches underfoot.',
  },
  {
    id: 'volcanic_crater',
    name: 'Volcanic Crater',
    description: 'Molten lava flows between obsidian platforms. The heat is suffocating.',
    tags: ['volcanic', 'hot', 'hazardous', 'unstable'],
    terrainModifiers: ['lava hazard', 'heat exhaustion', 'unstable ground'],
    compatibleHazards: ['lava_eruption', 'ground_collapse', 'ash_cloud', 'heat_wave'],
    ambientSounds: ['bubbling lava', 'hissing steam', 'cracking rock'],
    atmosphere: 'Orange light pulses from rivers of molten rock. The air shimmers with extreme heat.',
  },
  {
    id: 'frozen_wasteland',
    name: 'Frozen Wasteland',
    description: 'An endless expanse of ice and snow. Blizzards reduce visibility and drain stamina.',
    tags: ['tundra', 'cold', 'slippery', 'low_visibility'],
    terrainModifiers: ['slippery footing', 'cold drain', 'reduced visibility'],
    compatibleHazards: ['ice_crack', 'blizzard_surge', 'avalanche', 'freezing_wind'],
    ambientSounds: ['howling wind', 'cracking ice', 'snow crunching'],
    atmosphere: 'White stretches to every horizon. Ice crystals hang in the frozen air.',
  },
  {
    id: 'floating_islands',
    name: 'Floating Islands',
    description: 'Gravity-defying chunks of earth hover in the void. Falling means oblivion.',
    tags: ['floating', 'vertical', 'gaps', 'aerial'],
    terrainModifiers: ['platform gaps', 'altitude changes', 'falling risk'],
    compatibleHazards: ['platform_shift', 'platform_collision', 'gravity_flux'],
    ambientSounds: ['wind rushing', 'stone grinding', 'energy humming'],
    atmosphere: 'Islands of rock drift through an endless sky. Chains of light connect some platforms.',
  },
  {
    id: 'crystal_cavern',
    name: 'Crystal Cavern',
    description: 'Massive crystal formations reflect and amplify energy attacks unpredictably.',
    tags: ['underground', 'crystal', 'reflective', 'enclosed'],
    terrainModifiers: ['energy reflection', 'crystal shrapnel', 'echo amplification'],
    compatibleHazards: ['crystal_shatter', 'resonance_wave', 'light_refraction'],
    ambientSounds: ['crystal humming', 'dripping water', 'echoing footsteps'],
    atmosphere: 'Prismatic light dances across towering crystal spires. Every sound echoes endlessly.',
  },
  {
    id: 'storm_plateau',
    name: 'Storm Plateau',
    description: 'A high plateau battered by perpetual lightning storms. Metal is dangerous.',
    tags: ['outdoor', 'storm', 'elevated', 'electric'],
    terrainModifiers: ['lightning strikes', 'strong winds', 'metal conductivity'],
    compatibleHazards: ['lightning_strike', 'thunder_blast', 'wind_gust'],
    ambientSounds: ['constant thunder', 'howling gale', 'crackling electricity'],
    atmosphere: 'Purple clouds churn overhead. Lightning forks down every few seconds.',
  },
  {
    id: 'underwater_ruin',
    name: 'Underwater Ruins',
    description: 'Submerged ancient structures. Movement is slowed but grappling is enhanced.',
    tags: ['underwater', 'submerged', 'slow', 'pressure'],
    terrainModifiers: ['water resistance', 'reduced speed', 'pressure effects'],
    compatibleHazards: ['tidal_surge', 'whirlpool', 'pressure_crush'],
    ambientSounds: ['muffled currents', 'whale songs', 'bubbles rising'],
    atmosphere: 'Ancient pillars rise from the ocean floor. Bioluminescent creatures drift past.',
  },
  {
    id: 'desert_coliseum',
    name: 'Desert Coliseum',
    description: 'An ancient arena half-buried in sand. Sandstorms roll through periodically.',
    tags: ['desert', 'arena', 'hot', 'sand'],
    terrainModifiers: ['sand footing', 'heat exhaustion', 'sandstorm risk'],
    compatibleHazards: ['sandstorm', 'quicksand', 'dust_devil', 'heat_mirage'],
    ambientSounds: ['sand shifting', 'hot wind', 'distant roar'],
    atmosphere: 'Sun-bleached stone walls rise from shifting dunes. Heat waves distort the horizon.',
  },
  {
    id: 'void_arena',
    name: 'Void Arena',
    description: 'A platform suspended in absolute nothingness. Reality bends at the edges.',
    tags: ['void', 'isolated', 'reality_bending', 'cosmic'],
    terrainModifiers: ['reality distortion', 'no environment', 'void edge'],
    compatibleHazards: ['reality_tear', 'gravity_inversion', 'void_pull'],
    ambientSounds: ['absolute silence', 'reality humming', 'distant echoes'],
    atmosphere: 'A single platform floats in infinite darkness. Stars that aren\'t stars shimmer at the edges.',
  },
  {
    id: 'suspension_bridge',
    name: 'Suspension Bridge',
    description: 'A massive bridge spanning a bottomless chasm. Structural integrity is questionable.',
    tags: ['bridge', 'narrow', 'high', 'unstable'],
    terrainModifiers: ['narrow footing', 'unstable structure', 'falling risk'],
    compatibleHazards: ['structural_collapse', 'wind_gust', 'cable_snap'],
    ambientSounds: ['metal creaking', 'wind whistling', 'cables straining'],
    atmosphere: 'Cables groan under tension. The bridge sways with every step. Don\'t look down.',
  },
  {
    id: 'forest_canopy',
    name: 'Forest Canopy',
    description: 'Combat takes place among massive treetops. Vertical movement and cover abound.',
    tags: ['forest', 'vertical', 'cover', 'organic'],
    terrainModifiers: ['branch platforms', 'vine swinging', 'leaf cover'],
    compatibleHazards: ['branch_break', 'forest_fire', 'beast_swarm'],
    ambientSounds: ['rustling leaves', 'bird calls', 'creaking branches'],
    atmosphere: 'Ancient trees tower hundreds of feet. Sunlight filters through the canopy in golden shafts.',
  },
];

/**
 * Get a location by ID
 */
export function getLocationType(id: string): LocationType | undefined {
  return LOCATION_TYPES.find(l => l.id === id);
}

/**
 * Get locations matching specific tags
 */
export function getLocationsByTags(tags: string[]): LocationType[] {
  return LOCATION_TYPES.filter(loc =>
    tags.some(tag => loc.tags.includes(tag))
  );
}

/**
 * Get a random location
 */
export function getRandomLocation(): LocationType {
  return LOCATION_TYPES[Math.floor(Math.random() * LOCATION_TYPES.length)];
}
