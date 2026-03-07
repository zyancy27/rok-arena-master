/**
 * Atmosphere Generator — Step 6
 * 
 * Generates visual atmosphere layer per biome.
 */

import type { BiomeBase, BiomeModifier, AtmosphereLayer, AtmosphereEffect, DensityProfile } from './types';

interface AtmosphereTemplate {
  effects: AtmosphereEffect[];
  fogColor: string;
  fogDensity: number;
  ambientColor: string;
  ambientIntensity: number;
  skyColor: string;
}

const BIOME_ATMOSPHERES: Record<string, AtmosphereTemplate> = {
  forest:           { effects: ['mist', 'insects'],              fogColor: '#2a4a2a', fogDensity: 0.4,  ambientColor: '#1a3a1a', ambientIntensity: 0.75, skyColor: '#1a2a1a' },
  jungle:           { effects: ['mist', 'insects', 'dripping_water'], fogColor: '#1a3a1a', fogDensity: 0.55, ambientColor: '#0a2a0a', ambientIntensity: 0.6,  skyColor: '#0a1a0a' },
  swamp:            { effects: ['green_fog', 'insects', 'low_haze'], fogColor: '#2a3a1a', fogDensity: 0.6,  ambientColor: '#1a2a10', ambientIntensity: 0.5,  skyColor: '#1a2a15' },
  holy_ruins:       { effects: ['mist', 'drifting_particles'],   fogColor: '#2a2a3a', fogDensity: 0.3,  ambientColor: '#2a2a3a', ambientIntensity: 0.75, skyColor: '#1a1a2a' },
  industrial:       { effects: ['steam', 'sparks'],              fogColor: '#2a2a30', fogDensity: 0.15, ambientColor: '#22222a', ambientIntensity: 0.6,  skyColor: '#1a1a22' },
  dam:              { effects: ['mist', 'steam'],                fogColor: '#2a3040', fogDensity: 0.3,  ambientColor: '#1a2030', ambientIntensity: 0.65, skyColor: '#1a2035' },
  city_rooftop:     { effects: ['low_haze'],                     fogColor: '#2a2a35', fogDensity: 0.1,  ambientColor: '#25252d', ambientIntensity: 0.65, skyColor: '#15152a' },
  urban_interior:   { effects: ['dust_shafts', 'low_haze'],     fogColor: '#2a2a30', fogDensity: 0.15, ambientColor: '#22222a', ambientIntensity: 0.6,  skyColor: '#1a1a22' },
  bridge:           { effects: ['mist', 'low_haze'],             fogColor: '#3a4050', fogDensity: 0.25, ambientColor: '#2a3040', ambientIntensity: 0.7,  skyColor: '#1a2030' },
  cave:             { effects: ['dust_shafts', 'low_haze', 'dripping_water'], fogColor: '#1a1815', fogDensity: 0.5,  ambientColor: '#1a1815', ambientIntensity: 0.45, skyColor: '#0a0a0a' },
  canyon:           { effects: ['dust_shafts', 'low_haze'],      fogColor: '#3a2a20', fogDensity: 0.2,  ambientColor: '#2a2015', ambientIntensity: 0.65, skyColor: '#2a1a10' },
  mountain:         { effects: ['mist', 'low_haze'],             fogColor: '#3a4050', fogDensity: 0.3,  ambientColor: '#2a3040', ambientIntensity: 0.7,  skyColor: '#2a3040' },
  snowfield:        { effects: ['snow', 'mist'],                 fogColor: '#4a5a6a', fogDensity: 0.35, ambientColor: '#3a4a5a', ambientIntensity: 0.75, skyColor: '#3a4a5a' },
  volcanic:         { effects: ['ash_fall', 'heat_haze', 'ember_glow'], fogColor: '#3a2015', fogDensity: 0.35, ambientColor: '#2a1510', ambientIntensity: 0.55, skyColor: '#1a0a05' },
  underwater:       { effects: ['caustic_light', 'drifting_particles'], fogColor: '#0a2a4a', fogDensity: 0.6,  ambientColor: '#0a2040', ambientIntensity: 0.5,  skyColor: '#0a1530' },
  alien_biome:      { effects: ['spore_particles', 'drifting_particles'], fogColor: '#2a1a3a', fogDensity: 0.4,  ambientColor: '#1a0a2a', ambientIntensity: 0.55, skyColor: '#0a0520' },
  airship:          { effects: ['mist', 'low_haze'],             fogColor: '#3a4050', fogDensity: 0.2,  ambientColor: '#2a3040', ambientIntensity: 0.65, skyColor: '#1a2535' },
  reactor_facility: { effects: ['steam', 'sparks'],              fogColor: '#2a2a35', fogDensity: 0.2,  ambientColor: '#1a1a2a', ambientIntensity: 0.55, skyColor: '#0a0a15' },
  desert:           { effects: ['heat_haze', 'dust_shafts'],     fogColor: '#4a3a20', fogDensity: 0.15, ambientColor: '#3a2a15', ambientIntensity: 0.8,  skyColor: '#3a3020' },
  ruins:            { effects: ['dust_shafts', 'mist'],          fogColor: '#3a3530', fogDensity: 0.2,  ambientColor: '#2a2520', ambientIntensity: 0.65, skyColor: '#1a1815' },
};

export function generateAtmosphere(
  biome: BiomeBase,
  modifiers: BiomeModifier[],
  density: DensityProfile,
): AtmosphereLayer {
  const template = BIOME_ATMOSPHERES[biome] ?? BIOME_ATMOSPHERES.ruins;

  const effects = [...template.effects];

  // Modifiers add atmosphere effects
  if (modifiers.includes('infested')) effects.push('spore_particles', 'green_fog');
  if (modifiers.includes('burning')) effects.push('ember_glow', 'ash_fall');
  if (modifiers.includes('frozen')) effects.push('snow');
  if (modifiers.includes('toxic')) effects.push('green_fog');
  if (modifiers.includes('flooded')) effects.push('mist');
  if (modifiers.includes('mystical')) effects.push('drifting_particles');

  // Deduplicate
  const uniqueEffects = [...new Set(effects)] as AtmosphereEffect[];

  return {
    effects: uniqueEffects,
    fogColor: template.fogColor,
    fogDensity: template.fogDensity * (0.5 + density.atmosphereDensity),
    ambientColor: template.ambientColor,
    ambientIntensity: template.ambientIntensity,
    skyColor: template.skyColor,
  };
}
