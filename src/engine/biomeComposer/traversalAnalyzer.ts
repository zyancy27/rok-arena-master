/**
 * Traversal & Verticality Analyzer
 * 
 * Determines movement style and elevation complexity.
 */

import type { BiomeBase, BiomeModifier, VerticalityLevel, TraversalStyle, DensityProfile } from './types';

const BIOME_VERTICALITY: Partial<Record<BiomeBase, VerticalityLevel>> = {
  forest: 'light', jungle: 'moderate', swamp: 'flat',
  holy_ruins: 'moderate', industrial: 'moderate', dam: 'heavy',
  city_rooftop: 'heavy', urban_interior: 'moderate', bridge: 'heavy',
  cave: 'moderate', canyon: 'heavy', mountain: 'extreme',
  snowfield: 'light', volcanic: 'moderate', underwater: 'moderate',
  alien_biome: 'moderate', airship: 'moderate', reactor_facility: 'moderate',
  desert: 'light', ruins: 'light',
};

const BIOME_TRAVERSAL: Partial<Record<BiomeBase, TraversalStyle>> = {
  forest: 'obstructed_and_dense', jungle: 'obstructed_and_dense', swamp: 'obstructed_and_dense',
  holy_ruins: 'mixed_elevation', industrial: 'lane_based', dam: 'lane_based',
  city_rooftop: 'vertical_climb', urban_interior: 'narrow_corridors', bridge: 'lane_based',
  cave: 'narrow_corridors', canyon: 'lane_based', mountain: 'vertical_climb',
  snowfield: 'open_field', volcanic: 'island_hopping', underwater: 'free_roam',
  alien_biome: 'free_roam', airship: 'lane_based', reactor_facility: 'narrow_corridors',
  desert: 'open_field', ruins: 'mixed_elevation',
};

export function analyzeTraversal(
  biome: BiomeBase,
  modifiers: BiomeModifier[],
  density: DensityProfile,
): { verticality: VerticalityLevel; traversalStyle: TraversalStyle } {
  let verticality = BIOME_VERTICALITY[biome] ?? 'light';
  let traversalStyle = BIOME_TRAVERSAL[biome] ?? 'mixed_elevation';

  // Modifiers can adjust
  if (modifiers.includes('vertical')) {
    verticality = verticality === 'flat' ? 'moderate' : verticality === 'light' ? 'heavy' : 'extreme';
    traversalStyle = 'vertical_climb';
  }
  if (modifiers.includes('collapsed')) {
    traversalStyle = 'obstructed_and_dense';
  }
  if (modifiers.includes('flooded')) {
    if (density.openness > 0.5) traversalStyle = 'island_hopping';
  }

  return { verticality, traversalStyle };
}
