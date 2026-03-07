/**
 * BiomeComposer — Public API
 * 
 * Biome-driven procedural arena generation system for R.O.K.
 * Replaces simple tag-based structure spawning with deeper
 * biome detection, structure families, landmark generation,
 * atmosphere layers, and zone layout from narrative input.
 */

export { composeBiomeScene } from './biomeComposer';
export { detectBiome } from './biomeDetector';
export { analyzeDensity } from './densityAnalyzer';
export { generateTerrain } from './terrainGenerator';
export { generateLandmarks } from './landmarkGenerator';
export { buildStructureFamilies } from './structureFamilies';
export { generateAtmosphere } from './atmosphereGenerator';
export { integrateHazards } from './hazardIntegrator';
export { generateZoneLayout } from './zoneLayoutGenerator';
export { getBiomePalette } from './colorPalettes';
export { analyzeTraversal } from './traversalAnalyzer';
export { seeded, hashString, vary } from './utils';

// Re-export all types
export type {
  BiomeBase, BiomeModifier, BiomeIdentity,
  DensityLevel, DensityProfile,
  TerrainFeatureType, TerrainFeature,
  Landmark,
  StructureFamilyMember, StructureFamily,
  AtmosphereEffect, AtmosphereLayer,
  HazardSource,
  ZoneAnchor,
  BiomePalette,
  VerticalityLevel, TraversalStyle,
  BiomeScenePlan,
  BiomeComposerInput,
} from './types';
