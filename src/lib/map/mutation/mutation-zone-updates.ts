/**
 * Mutation Zone Updates
 *
 * Translates TerrainMutation records into zone state changes
 * (stability, tactical properties, labels, elevation).
 */

import type {
  TerrainMutation,
  ZoneMutationEffect,
  MutationType,
} from './mutation-types';
import type { BattlefieldZone } from '@/lib/tactical-zones';

// ── Mutation → Zone Effect Mapping ──────────────────────────────

interface ZoneEffectRule {
  types: MutationType[];
  apply: (mutation: TerrainMutation) => Partial<ZoneMutationEffect>;
}

const ZONE_EFFECT_RULES: ZoneEffectRule[] = [
  {
    types: ['terrain_crack', 'terrain_broken_ground'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 20,
      tacticalChanges: { isUnstable: true, difficultFooting: true },
    }),
  },
  {
    types: ['terrain_collapse'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 40,
      tacticalChanges: { isUnstable: true, difficultFooting: true, destructibleTerrain: false },
      newLabel: 'Collapsed Section',
      newElevation: 'underground' as const,
    }),
  },
  {
    types: ['terrain_landslide'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 30,
      tacticalChanges: { difficultFooting: true, narrowMovement: true },
    }),
  },
  {
    types: ['terrain_crater'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 25,
      tacticalChanges: { hasCover: true, difficultFooting: true },
    }),
  },
  {
    types: ['terrain_frozen'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 5,
      tacticalChanges: { difficultFooting: true },
      newColorHint: 'ice',
    }),
  },
  {
    types: ['structure_damage', 'structure_buckle'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 20,
      tacticalChanges: { isUnstable: true, destructibleTerrain: true },
    }),
  },
  {
    types: ['structure_collapse'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 35,
      tacticalChanges: { isUnstable: true, hasCover: false, narrowMovement: true },
      newLabel: 'Collapsed Wreckage',
    }),
  },
  {
    types: ['structure_shatter'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 15,
      tacticalChanges: { hasCover: false },
    }),
  },
  {
    types: ['structure_explode'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 40,
      tacticalChanges: { fireSpread: true, isUnstable: true, destructibleTerrain: false },
      newColorHint: 'hazard',
    }),
  },
  {
    types: ['structure_open'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 5,
      tacticalChanges: { narrowMovement: false },
    }),
  },
  {
    types: ['surface_burn'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 8,
      tacticalChanges: { fireSpread: true },
      newColorHint: 'hazard',
    }),
  },
  {
    types: ['surface_corruption'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 10,
      tacticalChanges: { toxicGas: true, difficultFooting: true },
    }),
  },
  {
    types: ['surface_mud_spread'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 3,
      tacticalChanges: { difficultFooting: true },
    }),
  },
  {
    types: ['flood_rise'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 10,
      tacticalChanges: { flooding: true, difficultFooting: true },
      newColorHint: 'water',
    }),
  },
  {
    types: ['gas_spread'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 5,
      tacticalChanges: { toxicGas: true, poorVisibility: true },
    }),
  },
  {
    types: ['visibility_drop'],
    apply: (m) => ({
      stabilityDelta: 0,
      tacticalChanges: { poorVisibility: true },
    }),
  },
  {
    types: ['visibility_improve'],
    apply: (m) => ({
      stabilityDelta: 0,
      tacticalChanges: { poorVisibility: false },
    }),
  },
  {
    types: ['electrical_surge'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 12,
      tacticalChanges: { electricHazard: true },
      newColorHint: 'hazard',
    }),
  },
  {
    types: ['debris_spawn'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 8,
      tacticalChanges: { difficultFooting: true, hasCover: true },
    }),
  },
  {
    types: ['path_blocked'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 5,
      tacticalChanges: { narrowMovement: true },
    }),
  },
  {
    types: ['path_opened'],
    apply: () => ({
      stabilityDelta: -3,
      tacticalChanges: { narrowMovement: false },
    }),
  },
  {
    types: ['elevation_shift'],
    apply: (m) => ({
      stabilityDelta: -m.magnitude * 15,
      tacticalChanges: { isUnstable: true },
      newElevation: 'elevated' as const,
    }),
  },
];

// ── Generate Zone Effects ───────────────────────────────────────

export function computeZoneEffects(mutations: TerrainMutation[]): ZoneMutationEffect[] {
  const effectMap = new Map<string, ZoneMutationEffect>();

  for (const mutation of mutations) {
    const rule = ZONE_EFFECT_RULES.find(r => r.types.includes(mutation.type));
    if (!rule) continue;

    const partial = rule.apply(mutation);

    for (const zoneId of mutation.targetZoneIds) {
      const existing = effectMap.get(zoneId);
      if (existing) {
        existing.stabilityDelta += partial.stabilityDelta ?? 0;
        if (partial.tacticalChanges) {
          existing.tacticalChanges = { ...existing.tacticalChanges, ...partial.tacticalChanges };
        }
        if (partial.newLabel) existing.newLabel = partial.newLabel;
        if (partial.newElevation) existing.newElevation = partial.newElevation;
        if (partial.newColorHint) existing.newColorHint = partial.newColorHint;
      } else {
        effectMap.set(zoneId, {
          zoneId,
          stabilityDelta: partial.stabilityDelta ?? 0,
          tacticalChanges: partial.tacticalChanges ?? {},
          newLabel: partial.newLabel,
          newElevation: partial.newElevation,
          newColorHint: partial.newColorHint,
        });
      }
    }
  }

  return Array.from(effectMap.values());
}

// ── Apply Zone Effects to BattlefieldZones ──────────────────────

export function applyZoneEffects(
  zones: BattlefieldZone[],
  effects: ZoneMutationEffect[],
): BattlefieldZone[] {
  const effectLookup = new Map(effects.map(e => [e.zoneId, e]));

  return zones.map(zone => {
    const effect = effectLookup.get(zone.id);
    if (!effect) return zone;

    const newStability = Math.max(0, Math.min(100, zone.stability + effect.stabilityDelta));
    const newTactical = { ...zone.tactical, ...effect.tacticalChanges };
    const collapseWarning = newStability < 25 && newTactical.isUnstable;

    return {
      ...zone,
      stability: newStability,
      tactical: newTactical,
      label: effect.newLabel ?? zone.label,
      elevation: effect.newElevation ?? zone.elevation,
      colorHint: effect.newColorHint ?? zone.colorHint,
      collapseWarning,
      threatLevel: newStability < 15 ? 'imminent' as const
        : newStability < 30 ? 'critical' as const
        : collapseWarning ? 'unsafe' as const
        : zone.threatLevel,
    };
  });
}
