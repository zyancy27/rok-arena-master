/**
 * BiomeComposer — Main Orchestrator (Step 12)
 * 
 * The full generation pipeline:
 * 1. Parse narrator and location text
 * 2. Detect biome + subthemes
 * 3. Determine density and traversal style
 * 4. Generate terrain features
 * 5. Generate landmarks
 * 6. Build structure families
 * 7. Place hazards and atmosphere
 * 8. Create zone anchors from layout
 * 9. Assign color palette
 * 10. Return unified BiomeScenePlan
 */

import type { BiomeComposerInput, BiomeScenePlan } from './types';
import { detectBiome } from './biomeDetector';
import { analyzeDensity } from './densityAnalyzer';
import { generateTerrain } from './terrainGenerator';
import { generateLandmarks } from './landmarkGenerator';
import { buildStructureFamilies } from './structureFamilies';
import { generateAtmosphere } from './atmosphereGenerator';
import { integrateHazards } from './hazardIntegrator';
import { generateZoneLayout } from './zoneLayoutGenerator';
import { getBiomePalette } from './colorPalettes';
import { analyzeTraversal } from './traversalAnalyzer';
import { hashString } from './utils';

// ── Terrain base name mapping ───────────────────────────────────

const TERRAIN_BASE_NAMES: Record<string, string> = {
  forest: 'forest_floor', jungle: 'jungle_undergrowth', swamp: 'muddy_wetland',
  holy_ruins: 'sacred_stone', industrial: 'concrete_grating', dam: 'wet_concrete',
  city_rooftop: 'rooftop_concrete', urban_interior: 'broken_tile', bridge: 'bridge_asphalt',
  cave: 'cave_stone', canyon: 'canyon_sandstone', mountain: 'rocky_terrain',
  snowfield: 'frozen_ground', volcanic: 'volcanic_basalt', underwater: 'ocean_floor',
  alien_biome: 'alien_surface', airship: 'wooden_deck', reactor_facility: 'steel_plating',
  desert: 'sand', ruins: 'cracked_stone',
};

/**
 * Compose a complete biome scene plan from input parameters.
 * This is the main entry point for BiomeComposer.
 */
export function composeBiomeScene(input: BiomeComposerInput): BiomeScenePlan {
  const mode = input.mode ?? 'battle';

  // Step 1-2: Detect biome
  const biome = detectBiome(
    input.locationName,
    input.narratorDescription,
    input.scenarioEnvironment,
  );

  // Build combined text for density analysis
  const combinedText = [
    input.locationName ?? '',
    input.narratorDescription ?? '',
    input.scenarioSituation ?? '',
  ].join(' ');

  // Step 3: Density
  const density = analyzeDensity(combinedText, biome.primary);

  // Apply performance tier scaling
  if (input.performanceTier === 'low') {
    density.structureMultiplier *= 0.5;
    density.propMultiplier *= 0.4;
  } else if (input.performanceTier === 'medium') {
    density.structureMultiplier *= 0.75;
    density.propMultiplier *= 0.7;
  }

  // Campaign mode: slightly denser for exploration feel
  if (mode === 'campaign') {
    density.atmosphereDensity = Math.min(1, density.atmosphereDensity * 1.2);
    density.propMultiplier = Math.min(1.5, density.propMultiplier * 1.1);
  }

  // Seed
  const seed = hashString(input.seed ?? input.locationName ?? 'default-biome');

  // Step 10: Palette (needed early for terrain colors)
  const palette = getBiomePalette(biome.primary, biome.modifiers);

  // Step 4: Terrain
  const terrainFeatures = generateTerrain(biome.primary, biome.modifiers, density, palette, seed);

  // Step 5: Landmarks
  const landmarks = generateLandmarks(biome.primary, biome.modifiers, density, seed + 1000);

  // Step 6: Structure families
  const structureFamilies = buildStructureFamilies(biome.primary, biome.modifiers, density, seed + 2000);

  // Step 7a: Atmosphere
  const atmosphere = generateAtmosphere(biome.primary, biome.modifiers, density);

  // Step 7b: Hazards
  const hazardSources = integrateHazards(
    input.activeHazards ?? [],
    input.arenaConditionTags ?? [],
    biome.primary,
    seed + 3000,
  );

  // Step 3b: Traversal
  const { verticality, traversalStyle } = analyzeTraversal(biome.primary, biome.modifiers, density);

  // Step 8: Zone layout
  const zoneAnchors = generateZoneLayout(biome.primary, biome.modifiers, landmarks, mode, seed + 4000);

  // Arena damage affects density
  if (input.arenaStability !== undefined && input.arenaStability < 50) {
    density.structureMultiplier *= 0.7;
  }

  const terrainBase = TERRAIN_BASE_NAMES[biome.primary] ?? 'unknown_terrain';

  return {
    biome,
    terrainBase,
    density,
    terrainFeatures,
    structureFamilies,
    landmarks,
    atmosphere,
    hazardSources,
    zoneAnchors,
    palette,
    verticality,
    traversalStyle,
    mode,
  };
}
