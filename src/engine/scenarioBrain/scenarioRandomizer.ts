/**
 * Scenario Randomizer
 *
 * Provides weighted random selection, combinatorial layer mixing,
 * and variation ranges so no two generated scenarios feel identical.
 */

// ── Layer Pools ─────────────────────────────────────────────────

export const ENVIRONMENT_TYPES = [
  // Urban
  'subway station', 'skyscraper lobby', 'rooftop plaza', 'highway overpass',
  'parking structure', 'shopping mall', 'train terminal', 'harbor dockyard',
  'airport runway', 'city intersection', 'residential tower', 'underground market',
  // Industrial
  'oil refinery', 'steel foundry', 'chemical plant', 'power substation',
  'water treatment facility', 'mining shaft', 'shipyard drydock', 'assembly line',
  'grain silo complex', 'fuel depot', 'smelting forge', 'waste processing center',
  // Natural
  'river gorge', 'volcanic caldera', 'glacier crevasse', 'coral atoll',
  'mangrove delta', 'salt flat', 'geothermal springs', 'tidal cave system',
  'redwood canopy', 'karst sinkhole', 'lava tube', 'permafrost ridge',
  // Transport
  'cargo freighter deck', 'suspension bridge', 'monorail track', 'ferry terminal',
  'helipad tower', 'bullet train cabin', 'tanker hull', 'gondola cable line',
  // Infrastructure
  'hydroelectric dam', 'radio telescope array', 'sewage overflow tunnel',
  'aqueduct viaduct', 'lighthouse cliff', 'wind turbine field', 'gas pipeline junction',
  // Military
  'missile silo', 'aircraft carrier deck', 'bunker corridor', 'radar outpost',
  'munitions depot', 'forward operating base', 'anti-aircraft emplacement',
  // Scientific
  'particle accelerator ring', 'deep sea research lab', 'cryogenics vault',
  'biocontainment wing', 'zero-g experiment chamber', 'seismology station',
  // Space
  'orbital research station', 'derelict freighter', 'asteroid mining rig',
  'space elevator tether', 'lunar excavation site', 'warp gate scaffold',
  // Alien
  'bioluminescent hive', 'crystal spire nexus', 'living architecture colony',
  'gravity well temple', 'spore forest', 'obsidian monolith plaza',
] as const;

export const SITUATION_STATES = [
  'stable', 'unstable', 'collapsing', 'exploding', 'flooding',
  'burning', 'malfunctioning', 'falling', 'under attack',
  'pressurizing', 'decompressing', 'fracturing', 'overheating',
  'freezing over', 'losing power', 'chain-reacting', 'sinking',
  'spinning out of control', 'breached', 'evacuating',
] as const;

export const HAZARD_TYPES = [
  'fire', 'electricity', 'pressure', 'radiation', 'gravity anomalies',
  'debris', 'toxic gas', 'structural collapse', 'energy overload',
  'flooding water', 'explosive shrapnel', 'extreme cold', 'molten metal',
  'chemical spill', 'plasma discharge', 'vacuum exposure', 'sonic shockwave',
  'falling infrastructure', 'magnetic interference', 'seismic tremors',
  'steam venting', 'oil slick ignition', 'dust explosion', 'biological contamination',
] as const;

export const URGENCY_LEVELS = ['minor', 'moderate', 'severe', 'catastrophic'] as const;

export type EnvironmentType = typeof ENVIRONMENT_TYPES[number] | string;
export type SituationState = typeof SITUATION_STATES[number] | string;
export type HazardType = typeof HAZARD_TYPES[number] | string;
export type UrgencyLevel = typeof URGENCY_LEVELS[number];

// ── Random Utilities ────────────────────────────────────────────

/** Seeded PRNG (xoshiro128**) for deterministic generation when needed */
export function createSeededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  let a = h | 0, b = h >>> 16, c = h ^ 0x9e3779b9, d = h ^ 0x6a09e667;
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (a + d) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const result = ((t << 1) | (t >>> 31)) + a;
    return (result >>> 0) / 4294967296;
  };
}

/** Pick a random item from an array */
export function pick<T>(arr: readonly T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Pick N unique items from an array */
export function pickN<T>(arr: readonly T[], n: number, rng: () => number = Math.random): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

/** Weighted random selection */
export function weightedPick<T>(
  items: readonly T[],
  weights: number[],
  rng: () => number = Math.random,
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── Variation Ranges ────────────────────────────────────────────

export interface VariationRange {
  particleDensity: number;   // 0-1
  animationSpeed: number;    // 0.5-2.0 multiplier
  colorIntensity: number;    // 0-1
  soundVariation: number;    // 0-1
}

/** Generate random variation parameters */
export function generateVariation(rng: () => number = Math.random): VariationRange {
  return {
    particleDensity: 0.3 + rng() * 0.7,
    animationSpeed: 0.5 + rng() * 1.5,
    colorIntensity: 0.4 + rng() * 0.6,
    soundVariation: rng(),
  };
}

// ── Urgency Weighting by Battle Intensity ───────────────────────

/**
 * Get urgency weights based on battle intensity (0-1 scale).
 * Calm battles → minor/moderate; intense battles → severe/catastrophic.
 */
export function getUrgencyWeights(intensity: number): number[] {
  const calm = 1 - intensity;
  return [
    calm * 0.5,           // minor
    calm * 0.3 + 0.2,     // moderate
    intensity * 0.4,      // severe
    intensity * 0.3,      // catastrophic
  ];
}
