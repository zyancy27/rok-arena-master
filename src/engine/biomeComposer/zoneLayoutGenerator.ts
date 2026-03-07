/**
 * Zone Layout Generator — Step 8
 * 
 * Generates zones from landmarks and biome context.
 * Zones emerge naturally from the environment layout.
 */

import type { BiomeBase, Landmark, ZoneAnchor, DensityProfile, BiomeModifier } from './types';
import { seeded } from './utils';

interface ZoneTemplate {
  label: string;
  elevation: ZoneAnchor['elevation'];
  tacticalHints: ZoneAnchor['tacticalHints'];
}

// Base zones added per biome to complement landmarks
const BIOME_BASE_ZONES: Record<string, ZoneTemplate[]> = {
  forest:     [{ label: 'Dense Treeline', elevation: 'ground', tacticalHints: { hasCover: true, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: true, narrowMovement: false } }],
  jungle:     [{ label: 'Undergrowth', elevation: 'ground', tacticalHints: { hasCover: true, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: true, narrowMovement: true } }],
  swamp:      [{ label: 'Mud Hollow', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: false, narrowMovement: false } }],
  cave:       [{ label: 'Deep Chamber', elevation: 'underground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: true, narrowMovement: false } }],
  volcanic:   [{ label: 'Ash Field', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: true, narrowMovement: false } }],
  industrial: [{ label: 'Service Corridor', elevation: 'ground', tacticalHints: { hasCover: true, isUnstable: false, isHighGround: false, difficultFooting: false, poorVisibility: false, narrowMovement: true } }],
  dam:        [{ label: 'Service Deck', elevation: 'ground', tacticalHints: { hasCover: true, isUnstable: false, isHighGround: false, difficultFooting: false, poorVisibility: false, narrowMovement: false } }],
  bridge:     [{ label: 'Center Span', elevation: 'elevated', tacticalHints: { hasCover: false, isUnstable: true, isHighGround: true, difficultFooting: false, poorVisibility: false, narrowMovement: true } }],
  ruins:      [{ label: 'Open Rubble', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: false, narrowMovement: false } }],
  city_rooftop: [{ label: 'Rooftop Edge', elevation: 'high', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: true, difficultFooting: false, poorVisibility: false, narrowMovement: false } }],
  urban_interior: [{ label: 'Main Hall', elevation: 'ground', tacticalHints: { hasCover: true, isUnstable: false, isHighGround: false, difficultFooting: false, poorVisibility: false, narrowMovement: false } }],
  mountain:   [{ label: 'Mountain Path', elevation: 'elevated', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: true, difficultFooting: true, poorVisibility: false, narrowMovement: true } }],
  canyon:     [{ label: 'Canyon Floor', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: false, narrowMovement: true } }],
  desert:     [{ label: 'Open Sand', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: false, narrowMovement: false } }],
  snowfield:  [{ label: 'Frozen Expanse', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: false, narrowMovement: false } }],
  underwater: [{ label: 'Open Water', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: true, poorVisibility: true, narrowMovement: false } }],
  airship:    [{ label: 'Main Deck', elevation: 'high', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: true, difficultFooting: false, poorVisibility: false, narrowMovement: false } }],
  alien_biome: [{ label: 'Alien Clearing', elevation: 'ground', tacticalHints: { hasCover: false, isUnstable: false, isHighGround: false, difficultFooting: false, poorVisibility: false, narrowMovement: false } }],
  reactor_facility: [{ label: 'Control Room', elevation: 'elevated', tacticalHints: { hasCover: true, isUnstable: false, isHighGround: true, difficultFooting: false, poorVisibility: false, narrowMovement: false } }],
  holy_ruins: [{ label: 'Ruin Edge', elevation: 'ground', tacticalHints: { hasCover: true, isUnstable: true, isHighGround: false, difficultFooting: true, poorVisibility: false, narrowMovement: false } }],
};

const defaultTactical: ZoneAnchor['tacticalHints'] = {
  hasCover: false, isUnstable: false, isHighGround: false,
  difficultFooting: false, poorVisibility: false, narrowMovement: false,
};

export function generateZoneLayout(
  biome: BiomeBase,
  modifiers: BiomeModifier[],
  landmarks: Landmark[],
  mode: 'battle' | 'campaign',
  seed: number,
): ZoneAnchor[] {
  const zones: ZoneAnchor[] = [];

  // Create zones from landmarks
  landmarks.forEach((lm, i) => {
    const s = seed + i * 89;
    // Convert world coords to grid coords (0-100)
    const gx = 50 + lm.x * 5;
    const gy = 50 + lm.z * 5;

    zones.push({
      id: lm.zoneAnchorId ?? `zone-lm-${i}`,
      label: lm.name,
      description: lm.narratorTag,
      x: gx,
      y: gy,
      width: 16 + seeded(s) * 8,
      height: 12 + seeded(s + 1) * 6,
      elevation: 'ground',
      landmarkId: lm.id,
      tacticalHints: { ...defaultTactical },
    });
  });

  // Add biome base zones
  const baseZones = BIOME_BASE_ZONES[biome] ?? BIOME_BASE_ZONES.ruins;
  baseZones.forEach((bz, i) => {
    const s = seed + 500 + i * 67;
    const angle = seeded(s) * Math.PI * 2;
    const dist = 20 + seeded(s + 1) * 15;

    zones.push({
      id: `zone-base-${i}`,
      label: bz.label,
      description: `Part of the ${biome.replace(/_/g, ' ')} area.`,
      x: 50 + Math.cos(angle) * dist,
      y: 50 + Math.sin(angle) * dist,
      width: 18 + seeded(s + 2) * 6,
      height: 14 + seeded(s + 3) * 5,
      elevation: bz.elevation,
      tacticalHints: bz.tacticalHints,
    });
  });

  // Always add a center engagement zone
  if (!zones.find(z => z.x > 40 && z.x < 60 && z.y > 40 && z.y < 60)) {
    zones.push({
      id: 'zone-center',
      label: mode === 'campaign' ? 'Central Area' : 'Engagement Zone',
      description: 'The primary area of engagement.',
      x: 50, y: 50, width: 22, height: 18,
      elevation: 'ground',
      tacticalHints: { ...defaultTactical },
    });
  }

  // Campaign mode: add exploration transition zones
  if (mode === 'campaign') {
    const extraCount = 2;
    for (let i = 0; i < extraCount; i++) {
      const s = seed + 700 + i * 53;
      const angle = seeded(s) * Math.PI * 2;
      const dist = 30 + seeded(s + 1) * 10;
      zones.push({
        id: `zone-explore-${i}`,
        label: i === 0 ? 'Hidden Path' : 'Unexplored Area',
        description: 'An area waiting to be discovered.',
        x: 50 + Math.cos(angle) * dist,
        y: 50 + Math.sin(angle) * dist,
        width: 14 + seeded(s + 2) * 5,
        height: 12 + seeded(s + 3) * 4,
        elevation: 'ground',
        tacticalHints: { ...defaultTactical, poorVisibility: true },
      });
    }
  }

  return zones;
}
