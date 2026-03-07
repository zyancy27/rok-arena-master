/**
 * Color Palettes — Step 10
 * 
 * Assigns a coherent scene palette per biome.
 */

import type { BiomeBase, BiomeModifier, BiomePalette } from './types';

const BIOME_PALETTES: Record<string, BiomePalette> = {
  forest: {
    ground: '#1e3315', groundAccent: '#2a4020',
    structures: '#4e342e', structureAccent: '#5d4037',
    props: '#2e7d32', fog: '#2a4a2a', emissive: '#3aff6a',
    sky: '#1a2a1a', descriptors: ['moss green', 'bark brown', 'leaf green', 'earth brown'],
  },
  jungle: {
    ground: '#0a2a0a', groundAccent: '#1a3a15',
    structures: '#3a2a15', structureAccent: '#4e342e',
    props: '#1b5e20', fog: '#1a3a1a', emissive: '#44ff88',
    sky: '#0a1a0a', descriptors: ['deep green', 'vine brown', 'tropical green', 'dark earth'],
  },
  swamp: {
    ground: '#1a2a10', groundAccent: '#2a3a15',
    structures: '#3a2a15', structureAccent: '#2a3a20',
    props: '#4a6a3a', fog: '#2a3a1a', emissive: '#88cc44',
    sky: '#1a2a15', descriptors: ['murky green', 'mud brown', 'sickly yellow', 'dark water'],
  },
  holy_ruins: {
    ground: '#1e1e28', groundAccent: '#2a2a35',
    structures: '#5a5a65', structureAccent: '#6a6a75',
    props: '#8888cc', fog: '#2a2a3a', emissive: '#6666aa',
    sky: '#1a1a2a', descriptors: ['silver stone', 'pale gold', 'sacred blue', 'aged white'],
  },
  industrial: {
    ground: '#1e1e22', groundAccent: '#2a2a30',
    structures: '#4a4a55', structureAccent: '#3a3a42',
    props: '#3d3825', fog: '#2a2a30', emissive: '#00ff44',
    sky: '#1a1a22', descriptors: ['steel gray', 'rust orange', 'hazard yellow', 'concrete'],
  },
  dam: {
    ground: '#1e2228', groundAccent: '#2a3035',
    structures: '#3a3a45', structureAccent: '#4a4a55',
    props: '#3a4a55', fog: '#2a3040', emissive: '#00aaff',
    sky: '#1a2035', descriptors: ['steel gray', 'cold blue', 'wet concrete', 'spray white'],
  },
  city_rooftop: {
    ground: '#222228', groundAccent: '#2a2a30',
    structures: '#3a3a42', structureAccent: '#4a4a50',
    props: '#cc6600', fog: '#2a2a35', emissive: '#ffaa44',
    sky: '#15152a', descriptors: ['concrete gray', 'neon accent', 'metal dark', 'smog'],
  },
  urban_interior: {
    ground: '#222228', groundAccent: '#2a2a30',
    structures: '#3a3a42', structureAccent: '#4a4a50',
    props: '#3a3535', fog: '#2a2a30', emissive: '#ffcc44',
    sky: '#1a1a22', descriptors: ['concrete', 'dust gray', 'broken white', 'shadow'],
  },
  bridge: {
    ground: '#2a2a30', groundAccent: '#35353d',
    structures: '#4a4a55', structureAccent: '#3a3a42',
    props: '#4a4040', fog: '#3a4050', emissive: '#ffaa00',
    sky: '#1a2030', descriptors: ['steel', 'cable silver', 'road gray', 'sky blue'],
  },
  cave: {
    ground: '#1a1815', groundAccent: '#2a2520',
    structures: '#3a3530', structureAccent: '#2a2520',
    props: '#4a5a6a', fog: '#1a1815', emissive: '#4488cc',
    sky: '#0a0a0a', descriptors: ['dark stone', 'crystal blue', 'damp gray', 'deep shadow'],
  },
  canyon: {
    ground: '#2a2015', groundAccent: '#3a2a1a',
    structures: '#4a3a2a', structureAccent: '#5a4a35',
    props: '#6d6d6d', fog: '#3a2a20', emissive: '#ffaa44',
    sky: '#2a1a10', descriptors: ['sandstone', 'rust red', 'dry tan', 'shadow brown'],
  },
  mountain: {
    ground: '#2a2a30', groundAccent: '#3a3a40',
    structures: '#4a4a55', structureAccent: '#5a5a65',
    props: '#6d6d6d', fog: '#3a4050', emissive: '#aaccff',
    sky: '#2a3040', descriptors: ['granite gray', 'snow white', 'alpine blue', 'stone'],
  },
  snowfield: {
    ground: '#3a4a5a', groundAccent: '#4a5a6a',
    structures: '#5a6a7a', structureAccent: '#6a7a8a',
    props: '#88aacc', fog: '#4a5a6a', emissive: '#88ccee',
    sky: '#3a4a5a', descriptors: ['ice white', 'frost blue', 'pale gray', 'snow'],
  },
  volcanic: {
    ground: '#1a1210', groundAccent: '#2a1a12',
    structures: '#1a1518', structureAccent: '#2a1a15',
    props: '#ff4400', fog: '#3a2015', emissive: '#ff4400',
    sky: '#1a0a05', descriptors: ['obsidian', 'lava orange', 'ash gray', 'ember red'],
  },
  underwater: {
    ground: '#0a1a2a', groundAccent: '#0a2030',
    structures: '#2a3a4a', structureAccent: '#3a4a5a',
    props: '#5a3040', fog: '#0a2a4a', emissive: '#22ccaa',
    sky: '#0a1530', descriptors: ['deep blue', 'coral pink', 'kelp green', 'abyss'],
  },
  alien_biome: {
    ground: '#1a0a20', groundAccent: '#2a1530',
    structures: '#3a2a4a', structureAccent: '#4a3a5a',
    props: '#6a4a8a', fog: '#2a1a3a', emissive: '#aa44ff',
    sky: '#0a0520', descriptors: ['void purple', 'alien glow', 'cosmic dark', 'strange'],
  },
  airship: {
    ground: '#22222a', groundAccent: '#2a2a32',
    structures: '#3a3a42', structureAccent: '#4a4a55',
    props: '#3d3825', fog: '#3a4050', emissive: '#ffaa44',
    sky: '#1a2535', descriptors: ['wood brown', 'brass', 'canvas beige', 'sky blue'],
  },
  reactor_facility: {
    ground: '#1a1a22', groundAccent: '#22222a',
    structures: '#3a3a45', structureAccent: '#4a4a55',
    props: '#2a3a4a', fog: '#2a2a35', emissive: '#00aaff',
    sky: '#0a0a15', descriptors: ['hazard yellow', 'reactor blue', 'steel', 'warning red'],
  },
  desert: {
    ground: '#3a2a15', groundAccent: '#4a3a20',
    structures: '#5a4a35', structureAccent: '#6a5a45',
    props: '#6d6d6d', fog: '#4a3a20', emissive: '#ffcc44',
    sky: '#3a3020', descriptors: ['sand gold', 'sun white', 'rock brown', 'heat shimmer'],
  },
  ruins: {
    ground: '#2a2520', groundAccent: '#3a3530',
    structures: '#5a5550', structureAccent: '#4a4540',
    props: '#3a3835', fog: '#3a3530', emissive: '#aaccff',
    sky: '#1a1815', descriptors: ['weathered stone', 'moss gray', 'broken white', 'dust'],
  },
};

export function getBiomePalette(biome: BiomeBase, modifiers: BiomeModifier[]): BiomePalette {
  const base = BIOME_PALETTES[biome] ?? BIOME_PALETTES.ruins;

  // Modifier color overrides
  if (modifiers.includes('infested')) {
    return { ...base, fog: '#2a1a30', emissive: '#7a3a5a', descriptors: [...base.descriptors, 'sickly green', 'corruption purple'] };
  }
  if (modifiers.includes('burning')) {
    return { ...base, fog: '#3a2015', emissive: '#ff4400', descriptors: [...base.descriptors, 'scorched', 'ember'] };
  }
  if (modifiers.includes('frozen')) {
    return { ...base, fog: '#3a4a5a', emissive: '#88ccee', descriptors: [...base.descriptors, 'frost', 'ice'] };
  }

  return base;
}
