/**
 * Density Analyzer — Step 2
 * 
 * Calculates volume density from scene language,
 * determining structure counts, prop density, and openness.
 */

import type { DensityLevel, DensityProfile, BiomeBase } from './types';

const DENSITY_WORDS: Record<DensityLevel, string[]> = {
  barren: ['barren', 'empty', 'desolate', 'void', 'wasteland', 'flat'],
  sparse: ['sparse', 'open', 'wide', 'spacious', 'exposed', 'clear', 'minimal'],
  moderate: ['moderate', 'normal', 'standard', 'average'],
  dense: ['dense', 'thick', 'crowded', 'tight', 'packed', 'cluttered', 'ruined', 'collapsed'],
  overgrown: ['overgrown', 'infested', 'lush', 'verdant', 'jungle', 'tangled', 'choked'],
};

const DENSITY_PROFILES: Record<DensityLevel, Omit<DensityProfile, 'level'>> = {
  barren:    { structureMultiplier: 0.25, propMultiplier: 0.15, openness: 0.95, atmosphereDensity: 0.1 },
  sparse:    { structureMultiplier: 0.45, propMultiplier: 0.35, openness: 0.8,  atmosphereDensity: 0.2 },
  moderate:  { structureMultiplier: 0.7,  propMultiplier: 0.65, openness: 0.55, atmosphereDensity: 0.35 },
  dense:     { structureMultiplier: 1.0,  propMultiplier: 1.0,  openness: 0.3,  atmosphereDensity: 0.55 },
  overgrown: { structureMultiplier: 1.3,  propMultiplier: 1.4,  openness: 0.15, atmosphereDensity: 0.7 },
};

/** Biome base density defaults (when no keywords found) */
const BIOME_DEFAULT_DENSITY: Partial<Record<BiomeBase, DensityLevel>> = {
  forest: 'dense',
  jungle: 'overgrown',
  swamp: 'dense',
  desert: 'sparse',
  snowfield: 'sparse',
  canyon: 'sparse',
  mountain: 'sparse',
  cave: 'moderate',
  volcanic: 'moderate',
  bridge: 'moderate',
  city_rooftop: 'moderate',
  urban_interior: 'dense',
  industrial: 'dense',
  dam: 'moderate',
  reactor_facility: 'dense',
  airship: 'moderate',
  underwater: 'moderate',
  alien_biome: 'moderate',
  holy_ruins: 'moderate',
  ruins: 'moderate',
};

export function analyzeDensity(
  text: string,
  biome: BiomeBase,
): DensityProfile {
  const lower = text.toLowerCase();

  // Check for explicit density words
  for (const level of ['overgrown', 'dense', 'sparse', 'barren'] as DensityLevel[]) {
    for (const word of DENSITY_WORDS[level]) {
      if (lower.includes(word)) {
        return { level, ...DENSITY_PROFILES[level] };
      }
    }
  }

  // Fall back to biome default
  const defaultLevel = BIOME_DEFAULT_DENSITY[biome] ?? 'moderate';
  return { level: defaultLevel, ...DENSITY_PROFILES[defaultLevel] };
}
