/**
 * NarratorTerrainMutationEngine — Type Definitions
 *
 * All mutation primitives, intensity levels, and pipeline types.
 */

// ── Mutation Categories ─────────────────────────────────────────

export type MutationCategory = 'terrain' | 'structure' | 'atmosphere' | 'hazard';

export type MutationType =
  // Terrain
  | 'terrain_crack'
  | 'terrain_collapse'
  | 'terrain_landslide'
  | 'terrain_crater'
  | 'terrain_frozen'
  | 'terrain_broken_ground'
  // Structure
  | 'structure_damage'
  | 'structure_collapse'
  | 'structure_shatter'
  | 'structure_buckle'
  | 'structure_explode'
  | 'structure_open'
  // Surface / spread
  | 'surface_burn'
  | 'surface_corruption'
  | 'surface_mud_spread'
  // Fluid
  | 'flood_rise'
  | 'gas_spread'
  // Visibility
  | 'visibility_drop'
  | 'visibility_improve'
  // Electrical / energy
  | 'electrical_surge'
  // Debris
  | 'debris_spawn'
  // Pathing
  | 'path_blocked'
  | 'path_opened'
  // Elevation
  | 'elevation_shift';

export type MutationIntensity = 'minor' | 'moderate' | 'severe' | 'catastrophic';

export type MutationSource = 'narrator' | 'player_action' | 'living_arena' | 'hazard_progression' | 'scenario_brain';

// ── Mutation Record ─────────────────────────────────────────────

export interface TerrainMutation {
  id: string;
  type: MutationType;
  category: MutationCategory;
  intensity: MutationIntensity;
  source: MutationSource;

  /** Which zone(s) are affected */
  targetZoneIds: string[];
  /** Optional specific structure/landmark label hit */
  targetLabel?: string;

  /** Human-readable description for narrator context */
  description: string;

  /** Numeric value 0–1 representing magnitude of the change */
  magnitude: number;

  /** Turn number when mutation occurred */
  turnNumber: number;
  /** Timestamp */
  timestamp: number;

  /** Whether this mutation has been visually applied to the 3D scene */
  applied: boolean;
}

// ── Mutation Effect on Zones ────────────────────────────────────

export interface ZoneMutationEffect {
  zoneId: string;
  stabilityDelta: number;
  tacticalChanges: Partial<{
    hasCover: boolean;
    isUnstable: boolean;
    difficultFooting: boolean;
    fireSpread: boolean;
    flooding: boolean;
    poorVisibility: boolean;
    narrowMovement: boolean;
    destructibleTerrain: boolean;
    electricHazard: boolean;
    toxicGas: boolean;
  }>;
  /** New label if zone identity changes (e.g. "Center Skybridge" → "Collapsed Span") */
  newLabel?: string;
  /** New elevation if terrain shifts */
  newElevation?: 'underground' | 'ground' | 'elevated' | 'high' | 'aerial';
  /** New color hint */
  newColorHint?: string;
}

// ── Scene Graph Mutation Instruction ────────────────────────────

export type SceneMutationOp =
  | 'swap_mesh'
  | 'add_decal'
  | 'remove_mesh'
  | 'add_debris'
  | 'raise_water'
  | 'add_particles'
  | 'tint_material'
  | 'add_emissive'
  | 'deform_mesh';

export interface SceneMutationInstruction {
  op: SceneMutationOp;
  /** Target object label or zone id */
  target: string;
  /** Parameters for the operation */
  params: Record<string, number | string | boolean>;
}

// ── Pipeline Input ──────────────────────────────────────────────

export interface MutationInput {
  /** Raw text that triggered the mutation (narrator or player) */
  text: string;
  source: MutationSource;
  /** Current turn number */
  turnNumber: number;
  /** Current arena state metrics */
  arenaStability: number;
  arenaHazardLevel: number;
  arenaEscalation: number;
  /** Available zone IDs in current battlefield */
  zoneIds: string[];
  /** Available zone labels for targeting */
  zoneLabels: string[];
}

// ── Pipeline Output ─────────────────────────────────────────────

export interface MutationResult {
  mutations: TerrainMutation[];
  zoneEffects: ZoneMutationEffect[];
  sceneInstructions: SceneMutationInstruction[];
  /** Optional narrator marker to place */
  narratorMarker?: {
    label: string;
    zoneId: string;
    urgency: 'low' | 'medium' | 'high';
  };
  /** Whether this warrants a cinematic moment */
  cinematic: boolean;
}
