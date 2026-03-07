/**
 * Hazard Integrator — Step 7
 * 
 * Integrates hazards into the biome layout with visible source logic.
 */

import type { HazardSource, BiomeBase } from './types';
import { seeded } from './utils';

interface HazardMapping {
  sourceType: HazardSource['sourceType'];
  color: string;
  emissiveColor?: string;
  label: string;
  radiusRange: [number, number];
}

const HAZARD_SOURCE_MAP: Record<string, HazardMapping> = {
  toxic_smoke:    { sourceType: 'vent',       color: '#2a4a2a', emissiveColor: '#3aff6a', label: 'Toxic Vent',        radiusRange: [0.5, 1.2] },
  toxic:          { sourceType: 'pool',       color: '#1a3a25', emissiveColor: '#3aff6a', label: 'Toxic Pool',        radiusRange: [0.8, 1.5] },
  electrical:     { sourceType: 'arc',        color: '#3a4a5a', emissiveColor: '#44aaff', label: 'Electrical Arc',    radiusRange: [0.3, 0.8] },
  fire:           { sourceType: 'ember_zone', color: '#4a1a0a', emissiveColor: '#ff4400', label: 'Fire Source',       radiusRange: [0.6, 1.2] },
  collapse:       { sourceType: 'crack',      color: '#3a3530', label: 'Cracked Structure',                          radiusRange: [0.5, 1.0] },
  flooding:       { sourceType: 'flood_line', color: '#1a3040', emissiveColor: '#1a4060', label: 'Water Line',       radiusRange: [1.0, 2.0] },
  corruption:     { sourceType: 'spore_cloud', color: '#3a1a2a', emissiveColor: '#7a3a5a', label: 'Corruption Spore', radiusRange: [0.6, 1.2] },
  poison:         { sourceType: 'pool',       color: '#2a3a15', emissiveColor: '#66aa33', label: 'Poison Pool',       radiusRange: [0.5, 1.0] },
  lava:           { sourceType: 'pool',       color: '#4a1a0a', emissiveColor: '#ff4400', label: 'Lava Pool',         radiusRange: [0.7, 1.5] },
  ice:            { sourceType: 'pool',       color: '#3a5a6a', emissiveColor: '#88ccee', label: 'Ice Patch',         radiusRange: [0.6, 1.2] },
  radiation:      { sourceType: 'vent',       color: '#2a3a2a', emissiveColor: '#44ff44', label: 'Radiation Source',  radiusRange: [0.5, 1.0] },
  debris:         { sourceType: 'crack',      color: '#3a3530', label: 'Debris Field',                               radiusRange: [0.8, 1.5] },
};

/** Map arena condition tags to hazard types */
const CONDITION_HAZARD_MAP: Record<string, string> = {
  burning: 'fire',
  flooding: 'flooding',
  frozen: 'ice',
  structural_damage: 'collapse',
  explosive_damage: 'debris',
  terrain_altered: 'collapse',
  seismic_activity: 'collapse',
  spatial_distortion: 'corruption',
};

export function integrateHazards(
  activeHazards: string[],
  conditionTags: string[],
  biome: BiomeBase,
  seed: number,
): HazardSource[] {
  const sources: HazardSource[] = [];
  const allHazardKeys = new Set<string>();

  // From explicit hazards
  for (const h of activeHazards) {
    const key = h.toLowerCase().replace(/[\s_-]+/g, '_');
    allHazardKeys.add(key);
    // Also try partial matches
    for (const mapKey of Object.keys(HAZARD_SOURCE_MAP)) {
      if (key.includes(mapKey)) allHazardKeys.add(mapKey);
    }
  }

  // From arena condition tags
  for (const tag of conditionTags) {
    const mapped = CONDITION_HAZARD_MAP[tag];
    if (mapped) allHazardKeys.add(mapped);
  }

  let i = 0;
  for (const key of allHazardKeys) {
    const mapping = HAZARD_SOURCE_MAP[key];
    if (!mapping) continue;

    const s = seed + i * 157;
    const angle = seeded(s) * Math.PI * 2;
    const dist = 1.5 + seeded(s + 1) * 5;
    const [rMin, rMax] = mapping.radiusRange;

    sources.push({
      type: key,
      sourceType: mapping.sourceType,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      radius: rMin + seeded(s + 2) * (rMax - rMin),
      color: mapping.color,
      emissiveColor: mapping.emissiveColor,
      label: mapping.label,
    });
    i++;
  }

  return sources;
}
