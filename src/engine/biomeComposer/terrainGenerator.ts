/**
 * Terrain Generator — Step 3
 * 
 * Creates terrain height features before props.
 * Uses noise-based variation and biome rules.
 */

import type { BiomeBase, BiomeModifier, TerrainFeature, TerrainFeatureType, DensityProfile, BiomePalette } from './types';
import { seeded } from './utils';

interface TerrainRule {
  features: TerrainFeatureType[];
  elevationRange: [number, number];
  radiusRange: [number, number];
  count: [number, number];
}

const BIOME_TERRAIN: Record<string, TerrainRule> = {
  forest:           { features: ['hill', 'slope', 'uneven_ground', 'ridge'],         elevationRange: [0.1, 0.5],  radiusRange: [1.5, 4],   count: [4, 8] },
  jungle:           { features: ['hill', 'ravine', 'slope', 'uneven_ground'],        elevationRange: [0.15, 0.6], radiusRange: [1, 3.5],   count: [5, 9] },
  swamp:            { features: ['mud_flat', 'swamp_pool', 'uneven_ground', 'pit'],  elevationRange: [-0.3, 0.15], radiusRange: [1.5, 4],  count: [5, 10] },
  holy_ruins:       { features: ['stair_elevation', 'platform', 'slope'],            elevationRange: [0.1, 0.8],  radiusRange: [1, 3],     count: [3, 6] },
  industrial:       { features: ['platform', 'catwalk', 'broken_pavement'],          elevationRange: [0.1, 0.4],  radiusRange: [1, 3],     count: [3, 6] },
  dam:              { features: ['platform', 'catwalk', 'slope', 'cliff'],           elevationRange: [0.2, 1.0],  radiusRange: [1.5, 3.5], count: [4, 7] },
  city_rooftop:     { features: ['rooftop_edge', 'platform', 'stair_elevation'],     elevationRange: [0.1, 0.5],  radiusRange: [1, 3],     count: [3, 6] },
  urban_interior:   { features: ['collapsed_floor', 'stair_elevation', 'broken_pavement'], elevationRange: [-0.2, 0.4], radiusRange: [1, 3], count: [3, 7] },
  bridge:           { features: ['platform', 'slope', 'cliff'],                     elevationRange: [0.2, 1.2],  radiusRange: [1, 4],     count: [3, 5] },
  cave:             { features: ['rocky_ledge', 'pit', 'slope', 'cliff'],            elevationRange: [-0.4, 0.8], radiusRange: [1, 3],     count: [5, 9] },
  canyon:           { features: ['cliff', 'ravine', 'rocky_ledge', 'ridge'],         elevationRange: [0.3, 1.5],  radiusRange: [2, 5],     count: [4, 7] },
  mountain:         { features: ['cliff', 'ridge', 'slope', 'rocky_ledge'],          elevationRange: [0.3, 1.5],  radiusRange: [2, 5],     count: [4, 8] },
  snowfield:        { features: ['dune', 'slope', 'ice_sheet', 'ridge'],             elevationRange: [0.05, 0.4], radiusRange: [2, 5],     count: [4, 7] },
  volcanic:         { features: ['crater', 'ridge', 'rocky_ledge', 'pit'],           elevationRange: [-0.5, 1.0], radiusRange: [1.5, 4],   count: [4, 8] },
  underwater:       { features: ['slope', 'ravine', 'ridge'],                        elevationRange: [-0.3, 0.5], radiusRange: [2, 5],     count: [3, 6] },
  alien_biome:      { features: ['hill', 'pit', 'ridge', 'crater'],                  elevationRange: [-0.3, 0.8], radiusRange: [1.5, 4],   count: [4, 8] },
  airship:          { features: ['platform', 'catwalk', 'stair_elevation'],          elevationRange: [0.05, 0.3], radiusRange: [1, 2.5],   count: [2, 5] },
  reactor_facility: { features: ['platform', 'catwalk', 'broken_pavement'],          elevationRange: [0.1, 0.5],  radiusRange: [1, 3],     count: [3, 6] },
  desert:           { features: ['dune', 'sand_drift', 'slope', 'ridge'],            elevationRange: [0.1, 0.6],  radiusRange: [2, 5],     count: [4, 7] },
  ruins:            { features: ['collapsed_floor', 'stair_elevation', 'slope', 'pit'], elevationRange: [-0.3, 0.6], radiusRange: [1, 3],  count: [4, 7] },
};

export function generateTerrain(
  biome: BiomeBase,
  modifiers: BiomeModifier[],
  density: DensityProfile,
  palette: BiomePalette,
  seed: number,
): TerrainFeature[] {
  const rule = BIOME_TERRAIN[biome] ?? BIOME_TERRAIN.ruins;
  const features: TerrainFeature[] = [];

  // Determine count based on density
  const baseCount = rule.count[0] + Math.floor(seeded(seed) * (rule.count[1] - rule.count[0] + 1));
  const count = Math.round(baseCount * (0.6 + density.structureMultiplier * 0.6));

  for (let i = 0; i < count; i++) {
    const s = seed + i * 73;
    const featureType = rule.features[Math.floor(seeded(s) * rule.features.length)];
    const angle = seeded(s + 1) * Math.PI * 2;
    const dist = 1 + seeded(s + 2) * 8;
    const [eMin, eMax] = rule.elevationRange;
    const elevation = eMin + seeded(s + 3) * (eMax - eMin);
    const [rMin, rMax] = rule.radiusRange;
    const radius = rMin + seeded(s + 4) * (rMax - rMin);

    // Modifiers can adjust terrain
    let elevMult = 1;
    if (modifiers.includes('collapsed')) elevMult = 0.6;
    if (modifiers.includes('vertical')) elevMult = 1.5;

    features.push({
      type: featureType,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      elevation: elevation * elevMult,
      radius,
      color: seeded(s + 5) > 0.5 ? palette.ground : palette.groundAccent,
    });
  }

  return features;
}
