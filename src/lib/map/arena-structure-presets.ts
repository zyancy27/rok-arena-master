/**
 * Arena Structure Presets
 *
 * Defines biome-specific structure families. Each biome maps to
 * a set of structure definitions (type, geometry, color, scale ranges)
 * that the procedural builder samples from.
 */

// ── Geometry primitives the 3D renderer understands ─────────────

export type StructureGeom = 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus';

export interface StructurePreset {
  /** Human label for narrator context */
  label: string;
  geom: StructureGeom;
  /** Base color (hex) */
  color: string;
  /** Secondary color for detail geometry */
  accent?: string;
  /** Base scale [w,h,d] — randomized ±30% at placement */
  baseScale: [number, number, number];
  /** Whether this is a "tall" structure (affects placement) */
  tall?: boolean;
  /** Whether it emits light (glow effect) */
  emissive?: boolean;
  /** Emissive color */
  emissiveColor?: string;
  /** Optional second part (e.g. tree canopy on top of trunk) */
  cap?: {
    geom: StructureGeom;
    color: string;
    offset: [number, number, number];
    scale: [number, number, number];
  };
  /** If true, can be instanced (repeated many times) */
  instanceable?: boolean;
  /** Elevation bias – positive = place on higher ground */
  elevationBias?: number;
}

export interface BiomePreset {
  /** Ground tint color */
  groundColor: string;
  /** Fog / atmosphere color (used for fog planes) */
  fogColor: string;
  fogDensity: number;
  /** Ambient light color override */
  ambientColor: string;
  ambientIntensity: number;
  /** Structures that populate the biome */
  structures: StructurePreset[];
  /** Small scatter props (stones, debris, etc.) */
  props: StructurePreset[];
  /** Zone landmark structures (one per zone) */
  landmarks: StructurePreset[];
}

// ── Biome Definitions ───────────────────────────────────────────

const FOREST: BiomePreset = {
  groundColor: '#1a2e12',
  fogColor: '#2a4a2a',
  fogDensity: 0.4,
  ambientColor: '#1a3a1a',
  ambientIntensity: 0.7,
  structures: [
    // Tree (trunk + canopy)
    {
      label: 'Tree', geom: 'cylinder', color: '#3d2b1a', baseScale: [0.15, 1.6, 0.15], tall: true, instanceable: true,
      cap: { geom: 'sphere', color: '#1a4a12', offset: [0, 1.1, 0], scale: [0.7, 0.9, 0.7] },
    },
    // Dead tree
    {
      label: 'Dead Tree', geom: 'cylinder', color: '#2a2018', baseScale: [0.12, 1.3, 0.12], tall: true, instanceable: true,
      cap: { geom: 'cone', color: '#3a3020', offset: [0, 0.8, 0], scale: [0.3, 0.6, 0.3] },
    },
    // Root cluster
    { label: 'Roots', geom: 'torus', color: '#3d2b1a', baseScale: [0.5, 0.12, 0.5], instanceable: true },
    // Fallen log
    { label: 'Fallen Log', geom: 'cylinder', color: '#2d1f10', baseScale: [0.12, 1.2, 0.12] },
  ],
  props: [
    { label: 'Stone', geom: 'sphere', color: '#4a4a4a', baseScale: [0.15, 0.12, 0.15], instanceable: true },
    { label: 'Bush', geom: 'sphere', color: '#1d3d12', baseScale: [0.3, 0.22, 0.3], instanceable: true },
    { label: 'Mushroom', geom: 'cone', color: '#6a3020', baseScale: [0.08, 0.12, 0.08], instanceable: true },
  ],
  landmarks: [
    { label: 'Ancient Stump', geom: 'cylinder', color: '#3d2b1a', baseScale: [0.5, 0.4, 0.5] },
    { label: 'Moss Boulder', geom: 'sphere', color: '#3a5a2a', baseScale: [0.6, 0.45, 0.6] },
    { label: 'Hollow Tree', geom: 'cylinder', color: '#2a1f10', baseScale: [0.35, 1.8, 0.35], tall: true,
      cap: { geom: 'sphere', color: '#0d2a0a', offset: [0, 1.2, 0], scale: [0.9, 0.7, 0.9] } },
  ],
};

const RUINS: BiomePreset = {
  groundColor: '#2a2520',
  fogColor: '#3a3530',
  fogDensity: 0.2,
  ambientColor: '#2a2520',
  ambientIntensity: 0.65,
  structures: [
    { label: 'Broken Pillar', geom: 'cylinder', color: '#5a5550', baseScale: [0.2, 1.2, 0.2], tall: true },
    { label: 'Wall Fragment', geom: 'box', color: '#4a4540', baseScale: [0.8, 0.9, 0.12] },
    { label: 'Rubble Pile', geom: 'box', color: '#3a3530', baseScale: [0.5, 0.2, 0.4], instanceable: true },
    { label: 'Arch Remnant', geom: 'box', color: '#5a5550', baseScale: [0.15, 1.4, 0.15], tall: true },
    { label: 'Fallen Column', geom: 'cylinder', color: '#4a4a45', baseScale: [0.18, 1.5, 0.18] },
  ],
  props: [
    { label: 'Broken Stone', geom: 'box', color: '#4a4540', baseScale: [0.2, 0.12, 0.18], instanceable: true },
    { label: 'Cracked Tile', geom: 'box', color: '#3a3835', baseScale: [0.3, 0.04, 0.3], instanceable: true },
  ],
  landmarks: [
    { label: 'Broken Altar', geom: 'box', color: '#5a5a55', baseScale: [0.6, 0.35, 0.4],
      cap: { geom: 'box', color: '#6a6a60', offset: [0, 0.25, 0], scale: [0.7, 0.08, 0.5] } },
    { label: 'Shattered Arch', geom: 'box', color: '#5a5550', baseScale: [0.12, 1.8, 0.12], tall: true },
    { label: 'Statue Base', geom: 'cylinder', color: '#5a5a55', baseScale: [0.4, 0.5, 0.4] },
  ],
};

const INDUSTRIAL: BiomePreset = {
  groundColor: '#1e1e22',
  fogColor: '#2a2a30',
  fogDensity: 0.15,
  ambientColor: '#22222a',
  ambientIntensity: 0.6,
  structures: [
    { label: 'Pipe', geom: 'cylinder', color: '#4a4a55', baseScale: [0.1, 2.0, 0.1], tall: true, instanceable: true },
    { label: 'Vent', geom: 'box', color: '#3a3a42', baseScale: [0.4, 0.3, 0.4] },
    { label: 'Catwalk', geom: 'box', color: '#3a3a45', baseScale: [1.5, 0.05, 0.3], elevationBias: 1 },
    { label: 'Control Panel', geom: 'box', color: '#2a2a35', baseScale: [0.4, 0.6, 0.15],
      emissive: true, emissiveColor: '#00ff44' },
    { label: 'Tank', geom: 'cylinder', color: '#3a3a45', baseScale: [0.4, 1.2, 0.4], tall: true },
    { label: 'Crate', geom: 'box', color: '#3d3825', baseScale: [0.35, 0.3, 0.35], instanceable: true },
  ],
  props: [
    { label: 'Barrel', geom: 'cylinder', color: '#4a3a2a', baseScale: [0.12, 0.25, 0.12], instanceable: true },
    { label: 'Debris', geom: 'box', color: '#3a3a3a', baseScale: [0.15, 0.08, 0.12], instanceable: true },
  ],
  landmarks: [
    { label: 'Reactor Core', geom: 'cylinder', color: '#2a3a4a', baseScale: [0.6, 1.5, 0.6], tall: true,
      emissive: true, emissiveColor: '#00aaff' },
    { label: 'Crane', geom: 'box', color: '#4a4a55', baseScale: [0.1, 2.0, 0.1], tall: true },
    { label: 'Generator', geom: 'box', color: '#3a3a42', baseScale: [0.5, 0.7, 0.5],
      emissive: true, emissiveColor: '#ffaa00' },
  ],
};

const BRIDGE: BiomePreset = {
  groundColor: '#2a2a30',
  fogColor: '#3a4050',
  fogDensity: 0.25,
  ambientColor: '#2a3040',
  ambientIntensity: 0.7,
  structures: [
    { label: 'Bridge Deck', geom: 'box', color: '#3a3a42', baseScale: [2.5, 0.08, 0.8] },
    { label: 'Support Pillar', geom: 'cylinder', color: '#4a4a55', baseScale: [0.25, 2.5, 0.25], tall: true },
    { label: 'Cable', geom: 'cylinder', color: '#5a5a65', baseScale: [0.03, 3.0, 0.03], tall: true },
    { label: 'Guardrail', geom: 'box', color: '#4a4a50', baseScale: [1.5, 0.3, 0.04] },
    { label: 'Broken Lane', geom: 'box', color: '#35353d', baseScale: [0.8, 0.06, 0.6] },
  ],
  props: [
    { label: 'Vehicle Wreck', geom: 'box', color: '#4a4040', baseScale: [0.4, 0.2, 0.25], instanceable: true },
    { label: 'Hanging Debris', geom: 'box', color: '#3a3a3a', baseScale: [0.15, 0.4, 0.1], elevationBias: 1 },
  ],
  landmarks: [
    { label: 'Tower Pylon', geom: 'box', color: '#4a4a55', baseScale: [0.3, 3.0, 0.3], tall: true },
    { label: 'Vehicle Pileup', geom: 'box', color: '#4a3a35', baseScale: [0.8, 0.35, 0.5] },
    { label: 'Collapsed Section', geom: 'box', color: '#2a2a30', baseScale: [1.0, 0.15, 0.6] },
  ],
};

const URBAN: BiomePreset = {
  groundColor: '#222228',
  fogColor: '#2a2a35',
  fogDensity: 0.1,
  ambientColor: '#25252d',
  ambientIntensity: 0.65,
  structures: [
    { label: 'Building Wall', geom: 'box', color: '#3a3a42', baseScale: [0.8, 1.8, 0.1], tall: true },
    { label: 'AC Unit', geom: 'box', color: '#4a4a50', baseScale: [0.3, 0.25, 0.3] },
    { label: 'Billboard Frame', geom: 'box', color: '#3a3a45', baseScale: [0.8, 0.5, 0.05], tall: true, elevationBias: 2 },
    { label: 'Fire Escape', geom: 'box', color: '#4a4a55', baseScale: [0.3, 1.5, 0.1], tall: true },
    { label: 'Dumpster', geom: 'box', color: '#2a3a2a', baseScale: [0.35, 0.25, 0.25] },
    { label: 'Ledge', geom: 'box', color: '#3a3a3e', baseScale: [1.0, 0.08, 0.3], elevationBias: 1 },
  ],
  props: [
    { label: 'Trash', geom: 'box', color: '#3a3535', baseScale: [0.1, 0.06, 0.1], instanceable: true },
    { label: 'Cone', geom: 'cone', color: '#cc6600', baseScale: [0.06, 0.15, 0.06], instanceable: true },
  ],
  landmarks: [
    { label: 'Water Tower', geom: 'cylinder', color: '#4a4a55', baseScale: [0.45, 0.8, 0.45],
      cap: { geom: 'cone', color: '#3a3a42', offset: [0, 0.55, 0], scale: [0.55, 0.3, 0.55] } },
    { label: 'Rooftop Edge', geom: 'box', color: '#3a3a42', baseScale: [1.5, 0.12, 0.12] },
    { label: 'Antenna', geom: 'cylinder', color: '#6a6a70', baseScale: [0.03, 2.0, 0.03], tall: true },
  ],
};

const CAVE: BiomePreset = {
  groundColor: '#1a1815',
  fogColor: '#1a1815',
  fogDensity: 0.5,
  ambientColor: '#1a1815',
  ambientIntensity: 0.45,
  structures: [
    { label: 'Stalagmite', geom: 'cone', color: '#3a3530', baseScale: [0.2, 1.0, 0.2], tall: true, instanceable: true },
    { label: 'Stalactite', geom: 'cone', color: '#3a3530', baseScale: [0.15, 0.8, 0.15], tall: true, elevationBias: 2 },
    { label: 'Rock Wall', geom: 'box', color: '#2a2520', baseScale: [1.2, 1.5, 0.3], tall: true },
    { label: 'Rock Pillar', geom: 'cylinder', color: '#3a3025', baseScale: [0.3, 1.8, 0.3], tall: true },
    { label: 'Boulder', geom: 'sphere', color: '#3a3530', baseScale: [0.5, 0.4, 0.45] },
  ],
  props: [
    { label: 'Pebbles', geom: 'sphere', color: '#3a3530', baseScale: [0.08, 0.06, 0.08], instanceable: true },
    { label: 'Crystal', geom: 'cone', color: '#4a5a6a', baseScale: [0.06, 0.18, 0.06], emissive: true, emissiveColor: '#4488cc', instanceable: true },
  ],
  landmarks: [
    { label: 'Crystal Cluster', geom: 'cone', color: '#3a5a7a', baseScale: [0.3, 0.8, 0.3], tall: true,
      emissive: true, emissiveColor: '#3388cc' },
    { label: 'Cavern Pillar', geom: 'cylinder', color: '#2a2520', baseScale: [0.5, 2.5, 0.5], tall: true },
    { label: 'Underground Pool', geom: 'cylinder', color: '#1a3040', baseScale: [0.8, 0.04, 0.8],
      emissive: true, emissiveColor: '#1a4060' },
  ],
};

const VOLCANIC: BiomePreset = {
  groundColor: '#1a1210',
  fogColor: '#3a2015',
  fogDensity: 0.35,
  ambientColor: '#2a1510',
  ambientIntensity: 0.55,
  structures: [
    { label: 'Lava Rock', geom: 'sphere', color: '#2a1a15', baseScale: [0.5, 0.35, 0.45] },
    { label: 'Obsidian Spike', geom: 'cone', color: '#1a1518', baseScale: [0.15, 1.2, 0.15], tall: true },
    { label: 'Cooled Flow', geom: 'box', color: '#1a1210', baseScale: [0.8, 0.08, 0.5] },
    { label: 'Vent', geom: 'cylinder', color: '#2a1a12', baseScale: [0.25, 0.3, 0.25],
      emissive: true, emissiveColor: '#ff4400' },
  ],
  props: [
    { label: 'Ember', geom: 'sphere', color: '#ff4400', baseScale: [0.04, 0.04, 0.04], emissive: true, emissiveColor: '#ff4400', instanceable: true },
    { label: 'Ash Pile', geom: 'box', color: '#2a2520', baseScale: [0.2, 0.05, 0.2], instanceable: true },
  ],
  landmarks: [
    { label: 'Lava Pool', geom: 'cylinder', color: '#cc3300', baseScale: [0.7, 0.05, 0.7],
      emissive: true, emissiveColor: '#ff4400' },
    { label: 'Basalt Column', geom: 'cylinder', color: '#1a1518', baseScale: [0.3, 2.0, 0.3], tall: true },
    { label: 'Caldera Edge', geom: 'torus', color: '#2a1a12', baseScale: [0.8, 0.15, 0.8] },
  ],
};

const HOLY: BiomePreset = {
  groundColor: '#1e1e28',
  fogColor: '#2a2a3a',
  fogDensity: 0.3,
  ambientColor: '#2a2a3a',
  ambientIntensity: 0.75,
  structures: [
    { label: 'Shrine Stone', geom: 'box', color: '#5a5a65', baseScale: [0.4, 0.8, 0.15] },
    { label: 'Sacred Pillar', geom: 'cylinder', color: '#6a6a75', baseScale: [0.15, 1.5, 0.15], tall: true },
    { label: 'Offering Table', geom: 'box', color: '#5a5560', baseScale: [0.5, 0.2, 0.3] },
    { label: 'Prayer Stone', geom: 'sphere', color: '#5a5a65', baseScale: [0.25, 0.2, 0.25],
      emissive: true, emissiveColor: '#aaccff' },
  ],
  props: [
    { label: 'Candle', geom: 'cylinder', color: '#ccc8a0', baseScale: [0.03, 0.1, 0.03],
      emissive: true, emissiveColor: '#ffcc44', instanceable: true },
    { label: 'Rune Stone', geom: 'box', color: '#5a5a65', baseScale: [0.12, 0.18, 0.06], instanceable: true },
  ],
  landmarks: [
    { label: 'Altar', geom: 'box', color: '#6a6a75', baseScale: [0.7, 0.4, 0.5],
      cap: { geom: 'sphere', color: '#8888cc', offset: [0, 0.5, 0], scale: [0.2, 0.2, 0.2] },
      emissive: true, emissiveColor: '#6666aa' },
    { label: 'Bell Tower', geom: 'box', color: '#5a5a65', baseScale: [0.3, 2.5, 0.3], tall: true },
    { label: 'Sacred Pool', geom: 'cylinder', color: '#3344aa', baseScale: [0.6, 0.04, 0.6],
      emissive: true, emissiveColor: '#4466cc' },
  ],
};

const UNDERWATER: BiomePreset = {
  groundColor: '#0a1a2a',
  fogColor: '#0a2a4a',
  fogDensity: 0.6,
  ambientColor: '#0a2040',
  ambientIntensity: 0.5,
  structures: [
    { label: 'Coral', geom: 'sphere', color: '#5a3040', baseScale: [0.35, 0.5, 0.3], instanceable: true },
    { label: 'Kelp Stalk', geom: 'cylinder', color: '#1a4a2a', baseScale: [0.05, 1.5, 0.05], tall: true, instanceable: true },
    { label: 'Reef Wall', geom: 'box', color: '#2a3a4a', baseScale: [1.0, 0.6, 0.2] },
    { label: 'Anemone', geom: 'cone', color: '#6a3050', baseScale: [0.2, 0.3, 0.2], instanceable: true },
  ],
  props: [
    { label: 'Shell', geom: 'sphere', color: '#6a6a5a', baseScale: [0.08, 0.05, 0.1], instanceable: true },
    { label: 'Bubble', geom: 'sphere', color: '#4488cc', baseScale: [0.06, 0.06, 0.06], emissive: true, emissiveColor: '#4488cc', instanceable: true },
  ],
  landmarks: [
    { label: 'Sunken Pillar', geom: 'cylinder', color: '#3a4a5a', baseScale: [0.35, 1.8, 0.35], tall: true },
    { label: 'Trench Edge', geom: 'box', color: '#1a2a3a', baseScale: [1.2, 0.3, 0.15] },
    { label: 'Bioluminescent Cluster', geom: 'sphere', color: '#2a5a6a', baseScale: [0.4, 0.35, 0.4],
      emissive: true, emissiveColor: '#22ccaa' },
  ],
};

const AIRSHIP: BiomePreset = {
  groundColor: '#22222a',
  fogColor: '#3a4050',
  fogDensity: 0.2,
  ambientColor: '#2a3040',
  ambientIntensity: 0.65,
  structures: [
    { label: 'Hull Plate', geom: 'box', color: '#3a3a42', baseScale: [1.2, 0.06, 0.6] },
    { label: 'Railing', geom: 'box', color: '#5a5a65', baseScale: [1.0, 0.35, 0.04] },
    { label: 'Mast', geom: 'cylinder', color: '#4a4a55', baseScale: [0.08, 2.5, 0.08], tall: true },
    { label: 'Cargo Crate', geom: 'box', color: '#3d3825', baseScale: [0.35, 0.3, 0.3], instanceable: true },
    { label: 'Engine Housing', geom: 'cylinder', color: '#3a3a45', baseScale: [0.4, 0.6, 0.4] },
  ],
  props: [
    { label: 'Rope Coil', geom: 'torus', color: '#4a3a2a', baseScale: [0.12, 0.04, 0.12], instanceable: true },
    { label: 'Lantern', geom: 'sphere', color: '#ffaa44', baseScale: [0.06, 0.06, 0.06], emissive: true, emissiveColor: '#ffaa44', instanceable: true },
  ],
  landmarks: [
    { label: 'Helm', geom: 'cylinder', color: '#3a2a20', baseScale: [0.3, 0.5, 0.3],
      cap: { geom: 'box', color: '#5a5a55', offset: [0, 0.35, 0], scale: [0.5, 0.06, 0.06] } },
    { label: 'Balloon Anchor', geom: 'cylinder', color: '#4a4a55', baseScale: [0.15, 3.0, 0.15], tall: true },
    { label: 'Observation Deck', geom: 'box', color: '#3a3a42', baseScale: [0.8, 0.06, 0.5], elevationBias: 2 },
  ],
};

const INFESTED: BiomePreset = {
  groundColor: '#15121a',
  fogColor: '#2a1a2a',
  fogDensity: 0.45,
  ambientColor: '#1a121a',
  ambientIntensity: 0.5,
  structures: [
    { label: 'Corrupted Growth', geom: 'cone', color: '#2a1a2a', baseScale: [0.2, 0.8, 0.2], tall: true, instanceable: true },
    { label: 'Pustule', geom: 'sphere', color: '#4a2a3a', baseScale: [0.25, 0.2, 0.25],
      emissive: true, emissiveColor: '#6a2a4a', instanceable: true },
    { label: 'Tendril', geom: 'cylinder', color: '#2a1520', baseScale: [0.06, 1.2, 0.06], tall: true, instanceable: true },
    { label: 'Nest Mass', geom: 'sphere', color: '#1a1018', baseScale: [0.6, 0.35, 0.5] },
  ],
  props: [
    { label: 'Spore', geom: 'sphere', color: '#6a4a5a', baseScale: [0.05, 0.05, 0.05],
      emissive: true, emissiveColor: '#8a4a6a', instanceable: true },
    { label: 'Slime Patch', geom: 'box', color: '#2a1a25', baseScale: [0.25, 0.03, 0.25], instanceable: true },
  ],
  landmarks: [
    { label: 'Hive Core', geom: 'sphere', color: '#2a1520', baseScale: [0.7, 0.6, 0.7],
      emissive: true, emissiveColor: '#5a1a3a' },
    { label: 'Corruption Pillar', geom: 'cylinder', color: '#2a1a25', baseScale: [0.3, 2.0, 0.3], tall: true,
      emissive: true, emissiveColor: '#4a1a3a' },
    { label: 'Egg Cluster', geom: 'sphere', color: '#3a2030', baseScale: [0.4, 0.3, 0.35] },
  ],
};

const FACILITY: BiomePreset = {
  ...INDUSTRIAL,
  groundColor: '#1e1e24',
  structures: [
    ...INDUSTRIAL.structures,
    { label: 'Lab Table', geom: 'box', color: '#4a4a55', baseScale: [0.6, 0.35, 0.3] },
    { label: 'Server Rack', geom: 'box', color: '#2a2a35', baseScale: [0.2, 1.2, 0.3], tall: true,
      emissive: true, emissiveColor: '#00ff44' },
  ],
};

const REACTOR: BiomePreset = {
  ...INDUSTRIAL,
  groundColor: '#1a1a22',
  ambientColor: '#1a1a2a',
  structures: [
    ...INDUSTRIAL.structures,
    { label: 'Cooling Tower', geom: 'cylinder', color: '#3a3a45', baseScale: [0.5, 2.0, 0.5], tall: true },
    { label: 'Warning Light', geom: 'sphere', color: '#ff2200', baseScale: [0.08, 0.08, 0.08],
      emissive: true, emissiveColor: '#ff2200', instanceable: true },
  ],
  landmarks: [
    { label: 'Main Reactor', geom: 'cylinder', color: '#2a3a4a', baseScale: [0.8, 2.0, 0.8], tall: true,
      emissive: true, emissiveColor: '#00aaff' },
    { label: 'Containment Ring', geom: 'torus', color: '#3a3a45', baseScale: [1.0, 0.15, 1.0] },
    ...INDUSTRIAL.landmarks,
  ],
};

// ── Biome Registry ──────────────────────────────────────────────

export const BIOME_PRESETS: Record<string, BiomePreset> = {
  forest: FOREST, ruins: RUINS, industrial: INDUSTRIAL, bridge: BRIDGE, urban: URBAN, cave: CAVE, volcanic: VOLCANIC, holy: HOLY,
  underwater: UNDERWATER, airship: AIRSHIP, infested: INFESTED, facility: FACILITY, reactor: REACTOR,
};

// Aliases
const ALIASES: Record<string, string> = {
  jungle: 'forest', woods: 'forest', grove: 'forest', canopy: 'forest',
  temple: 'holy', church: 'holy', shrine: 'holy', sacred: 'holy', cathedral: 'holy', chapel: 'holy',
  city: 'urban', rooftop: 'urban', street: 'urban', alley: 'urban', mall: 'urban', plaza: 'urban', market: 'urban', station: 'urban', terminal: 'urban', 'high-rise': 'urban', highrise: 'urban', tower: 'urban', skyscraper: 'urban',
  factory: 'industrial', plant: 'industrial', warehouse: 'industrial', dam: 'industrial', turbine: 'industrial', generator: 'industrial', refinery: 'industrial', foundry: 'industrial', pump: 'industrial', crane: 'industrial', mill: 'industrial',
  canyon: 'cave', gorge: 'cave', tunnel: 'cave', mine: 'cave', underground: 'cave', sewer: 'cave', catacombs: 'cave',
  lava: 'volcanic', magma: 'volcanic', caldera: 'volcanic', molten: 'volcanic',
  ocean: 'underwater', deep: 'underwater', abyss: 'underwater', aquatic: 'underwater', submerged: 'underwater',
  ship: 'airship', vessel: 'airship', deck: 'airship', carrier: 'airship', aircraft: 'airship',
  corruption: 'infested', plague: 'infested', hive: 'infested', parasite: 'infested', swarm: 'infested',
  lab: 'facility', laboratory: 'facility', research: 'facility', bunker: 'facility', compound: 'facility',
  nuclear: 'reactor', meltdown: 'reactor', containment: 'reactor',
  ancient: 'ruins', crumbl: 'ruins', collapsed: 'ruins', derelict: 'ruins', abandoned: 'ruins',
  suspension: 'bridge', overpass: 'bridge', viaduct: 'bridge',
  descent: 'urban', freefall: 'urban',
};

/** Resolve a tag to a biome preset key */
export function resolveBiomeKey(tag: string): string | null {
  const t = tag.toLowerCase().trim();
  if (BIOME_PRESETS[t]) return t;
  for (const [alias, biome] of Object.entries(ALIASES)) {
    if (t.includes(alias)) return biome;
  }
  return null;
}

/** Get merged biome preset from multiple tags (first match wins for base, extras add structures) */
export function getMergedBiome(tags: string[], locationName?: string | null): BiomePreset {
  const allTokens = [...tags];
  if (locationName) allTokens.push(...locationName.toLowerCase().split(/\s+/));

  const matchedKeys: string[] = [];
  for (const token of allTokens) {
    const key = resolveBiomeKey(token);
    if (key && !matchedKeys.includes(key)) matchedKeys.push(key);
  }

  if (matchedKeys.length === 0) {
    // Fallback: generic open field
    return {
      groundColor: '#1e1e28',
      fogColor: '#2a2a35',
      fogDensity: 0.1,
      ambientColor: '#1e1e28',
      ambientIntensity: 0.7,
      structures: [
        { label: 'Rock', geom: 'sphere', color: '#4a4a4a', baseScale: [0.4, 0.3, 0.35] },
        { label: 'Boulder', geom: 'sphere', color: '#3a3a3a', baseScale: [0.5, 0.35, 0.45] },
      ],
      props: [
        { label: 'Stone', geom: 'sphere', color: '#3a3a3a', baseScale: [0.12, 0.08, 0.1], instanceable: true },
      ],
      landmarks: [
        { label: 'Formation', geom: 'sphere', color: '#4a4a4a', baseScale: [0.6, 0.45, 0.55] },
      ],
    };
  }

  const base = { ...BIOME_PRESETS[matchedKeys[0]] };

  // Merge additional biomes (add their unique structures)
  for (let i = 1; i < matchedKeys.length; i++) {
    const extra = BIOME_PRESETS[matchedKeys[i]];
    base.structures = [...base.structures, ...extra.structures.slice(0, 2)];
    base.props = [...base.props, ...extra.props.slice(0, 1)];
    base.landmarks = [...base.landmarks, ...extra.landmarks.slice(0, 1)];
    // Mix fog/atmosphere
    base.fogDensity = Math.max(base.fogDensity, extra.fogDensity * 0.7);
  }

  return base;
}
