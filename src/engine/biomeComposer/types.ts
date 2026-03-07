/**
 * BiomeComposer Types
 * 
 * Unified scene plan output and all supporting types for the
 * biome-driven procedural arena generation system.
 */

// ── Biome Detection ─────────────────────────────────────────────

export type BiomeBase =
  | 'forest' | 'jungle' | 'swamp'
  | 'holy_ruins' | 'industrial' | 'dam'
  | 'city_rooftop' | 'urban_interior' | 'bridge'
  | 'cave' | 'canyon' | 'mountain'
  | 'snowfield' | 'volcanic' | 'underwater'
  | 'alien_biome' | 'airship' | 'reactor_facility'
  | 'desert' | 'ruins';

export type BiomeModifier =
  | 'infested' | 'holy' | 'flooded' | 'collapsed'
  | 'burning' | 'frozen' | 'corrupted' | 'overgrown'
  | 'vertical' | 'underground' | 'aerial' | 'toxic'
  | 'ancient' | 'abandoned' | 'high_tech' | 'mystical';

export interface BiomeIdentity {
  primary: BiomeBase;
  secondary?: BiomeBase;
  modifiers: BiomeModifier[];
  confidence: number;
}

// ── Density ─────────────────────────────────────────────────────

export type DensityLevel = 'barren' | 'sparse' | 'moderate' | 'dense' | 'overgrown';

export interface DensityProfile {
  level: DensityLevel;
  /** 0-1 multiplier for tree/structure count */
  structureMultiplier: number;
  /** 0-1 multiplier for props/clutter */
  propMultiplier: number;
  /** 0-1 how open movement lanes are */
  openness: number;
  /** 0-1 fog/atmosphere density */
  atmosphereDensity: number;
}

// ── Terrain ─────────────────────────────────────────────────────

export type TerrainFeatureType =
  | 'hill' | 'cliff' | 'ravine' | 'riverbed' | 'lake'
  | 'mud_flat' | 'swamp_pool' | 'rocky_ledge' | 'dune'
  | 'broken_pavement' | 'rooftop_edge' | 'collapsed_floor'
  | 'platform' | 'catwalk' | 'stair_elevation'
  | 'crater' | 'ridge' | 'slope' | 'pit'
  | 'uneven_ground' | 'ice_sheet' | 'sand_drift';

export interface TerrainFeature {
  type: TerrainFeatureType;
  /** World position */
  x: number;
  z: number;
  /** Height/depth offset */
  elevation: number;
  /** Radius of influence */
  radius: number;
  /** Ground color override */
  color: string;
}

// ── Landmarks ───────────────────────────────────────────────────

export interface Landmark {
  id: string;
  name: string;
  /** Descriptive tag for narrator */
  narratorTag: string;
  x: number;
  z: number;
  /** Visual scale factor */
  scale: number;
  /** Associated zone anchor ID */
  zoneAnchorId?: string;
}

// ── Structure Families ──────────────────────────────────────────

export interface StructureFamilyMember {
  role: 'primary' | 'secondary' | 'accent' | 'scatter';
  geom: 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus';
  color: string;
  baseScale: [number, number, number];
  emissive?: boolean;
  emissiveColor?: string;
  tall?: boolean;
  cap?: {
    geom: 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus';
    color: string;
    offset: [number, number, number];
    scale: [number, number, number];
  };
}

export interface StructureFamily {
  id: string;
  name: string;
  members: StructureFamilyMember[];
  /** How many clusters to spawn */
  clusterCount: number;
  /** Items per cluster */
  itemsPerCluster: number;
  /** Cluster spread radius */
  spreadRadius: number;
}

// ── Atmosphere ──────────────────────────────────────────────────

export type AtmosphereEffect =
  | 'mist' | 'green_fog' | 'spore_particles' | 'steam'
  | 'dust_shafts' | 'ash_fall' | 'heat_haze' | 'caustic_light'
  | 'drifting_particles' | 'rain' | 'snow' | 'ember_glow'
  | 'low_haze' | 'insects' | 'dripping_water' | 'sparks';

export interface AtmosphereLayer {
  effects: AtmosphereEffect[];
  fogColor: string;
  fogDensity: number;
  /** Ambient light color */
  ambientColor: string;
  ambientIntensity: number;
  /** Sky/background color hint */
  skyColor: string;
}

// ── Hazard Sources ──────────────────────────────────────────────

export interface HazardSource {
  type: string;
  /** Visual source geometry */
  sourceType: 'pit' | 'vent' | 'pool' | 'crack' | 'arc' | 'ember_zone' | 'flood_line' | 'spore_cloud';
  x: number;
  z: number;
  radius: number;
  color: string;
  emissiveColor?: string;
  /** Descriptive label for narrator */
  label: string;
}

// ── Zone Anchors ────────────────────────────────────────────────

export interface ZoneAnchor {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: 'underground' | 'ground' | 'elevated' | 'high' | 'aerial';
  /** Source landmark that created this zone */
  landmarkId?: string;
  tacticalHints: {
    hasCover: boolean;
    isUnstable: boolean;
    isHighGround: boolean;
    difficultFooting: boolean;
    poorVisibility: boolean;
    narrowMovement: boolean;
  };
}

// ── Color Palette ───────────────────────────────────────────────

export interface BiomePalette {
  ground: string;
  groundAccent: string;
  structures: string;
  structureAccent: string;
  props: string;
  fog: string;
  emissive: string;
  sky: string;
  /** Named colors for narrator context */
  descriptors: string[];
}

// ── Traversal ───────────────────────────────────────────────────

export type VerticalityLevel = 'flat' | 'light' | 'moderate' | 'heavy' | 'extreme';
export type TraversalStyle =
  | 'open_field' | 'lane_based' | 'obstructed_and_dense'
  | 'vertical_climb' | 'narrow_corridors' | 'mixed_elevation'
  | 'island_hopping' | 'free_roam';

// ── Final Scene Plan ────────────────────────────────────────────

export interface BiomeScenePlan {
  /** Detected biome identity */
  biome: BiomeIdentity;

  /** Terrain base descriptor */
  terrainBase: string;

  /** Density profile */
  density: DensityProfile;

  /** Terrain height features */
  terrainFeatures: TerrainFeature[];

  /** Structure family placements */
  structureFamilies: StructureFamily[];

  /** Notable landmarks */
  landmarks: Landmark[];

  /** Atmosphere layer */
  atmosphere: AtmosphereLayer;

  /** Hazard source visuals */
  hazardSources: HazardSource[];

  /** Generated zone anchors */
  zoneAnchors: ZoneAnchor[];

  /** Color palette */
  palette: BiomePalette;

  /** Verticality assessment */
  verticality: VerticalityLevel;

  /** Traversal style */
  traversalStyle: TraversalStyle;

  /** Game mode hint */
  mode: 'battle' | 'campaign';
}

// ── Composer Input ──────────────────────────────────────────────

export interface BiomeComposerInput {
  /** Arena or location name */
  locationName?: string | null;
  /** Narrator scene description text */
  narratorDescription?: string | null;
  /** ScenarioBrain environment type */
  scenarioEnvironment?: string | null;
  /** ScenarioBrain situation */
  scenarioSituation?: string | null;
  /** Active hazard type names */
  activeHazards?: string[];
  /** Living Arena state */
  arenaStability?: number;
  arenaHazardLevel?: number;
  arenaConditionTags?: string[];
  /** Battlefield memory — damaged structures */
  battlefieldDamage?: string[];
  /** Game mode */
  mode?: 'battle' | 'campaign';
  /** Seed for deterministic generation */
  seed?: string;
  /** Performance tier: limits prop counts */
  performanceTier?: 'low' | 'medium' | 'high';
}
