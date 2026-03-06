/**
 * Tactical Map Generator
 *
 * Converts battle state and arena data into TacticalMapData
 * for the TacticalBattleMap component.
 * Now supports zone-based layout, battlefield image layers,
 * fog of awareness, and narrator markers.
 */

import type { TacticalMapData } from '@/components/battles/TacticalBattleMap';
import type { ArenaState } from '@/lib/living-arena';
import type { DistanceZone } from '@/lib/battle-dice';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { NarratorMarker, CinematicFrame, MovementShadow } from '@/lib/narrator-markers';
import type { AwarenessResult } from '@/lib/fog-of-awareness';
import { generateZones, updateZonesFromArenaState } from '@/lib/tactical-zones';
import { composeBattlefieldLayers } from '@/lib/battlefield-layers';
import { generateMarkersFromConditions } from '@/lib/narrator-markers';

// ── Input Types ─────────────────────────────────────────────────

interface BattleParticipant {
  characterId: string;
  name: string;
  isPlayer: boolean;
  turnOrder: number;
}

interface GenerateMapOptions {
  participants: BattleParticipant[];
  currentPlayerId: string;
  distanceZone?: DistanceZone;
  arenaState?: ArenaState;
  locationName?: string | null;
  terrainTags?: string[];
  constructs?: Array<{ id: string; name: string; creatorId: string }>;
  lastMovements?: Record<string, 'forward' | 'backward' | 'left' | 'right' | 'up' | 'none'>;
  /** External awareness result (from fog-of-awareness system) */
  awareness?: AwarenessResult;
  /** External narrator markers */
  narratorMarkers?: NarratorMarker[];
  /** External cinematic frame */
  cinematicFrame?: CinematicFrame | null;
  /** External movement shadows */
  movementShadows?: MovementShadow[];
  /** Battle phase for layer intensity */
  battlePhase?: 'early' | 'mid' | 'late' | 'critical';
}

// ── Distance Zone Gaps ──────────────────────────────────────────

const DISTANCE_ZONE_GAPS: Record<DistanceZone, number> = {
  melee: 8,
  close: 15,
  mid: 30,
  long: 50,
  extreme: 70,
};

// ── Entity Positioning ──────────────────────────────────────────

function positionEntitiesInZones(
  participants: BattleParticipant[],
  zones: BattlefieldZone[],
  currentPlayerId: string,
): TacticalMapData['entities'] {
  const entities: TacticalMapData['entities'] = [];
  const players = participants.filter(p => p.isPlayer);
  const enemies = participants.filter(p => !p.isPlayer);

  // Find suitable zones for each side
  const sortedByY = [...zones].sort((a, b) => a.y - b.y);
  const topZones = sortedByY.filter(z => z.y < 50);
  const bottomZones = sortedByY.filter(z => z.y >= 50);
  const centerZone = zones.find(z => z.label.toLowerCase().includes('center'));

  // Place enemies in top zones
  enemies.forEach((p, i) => {
    const zone = topZones[i % Math.max(1, topZones.length)] || centerZone || zones[0];
    const jitter = (i - (enemies.length - 1) / 2) * 4;
    zone.occupants.push(p.characterId);
    entities.push({
      id: p.characterId, name: p.name, type: 'enemy',
      x: zone.x + jitter, y: zone.y + (Math.random() - 0.5) * 4,
      zoneId: zone.id,
    });
  });

  // Place players in bottom zones
  players.forEach((p, i) => {
    const zone = bottomZones[i % Math.max(1, bottomZones.length)] || centerZone || zones[zones.length - 1];
    const jitter = (i - (players.length - 1) / 2) * 4;
    zone.occupants.push(p.characterId);
    entities.push({
      id: p.characterId, name: p.name, type: 'player',
      x: zone.x + jitter, y: zone.y + (Math.random() - 0.5) * 4,
      zoneId: zone.id,
    });
  });

  return entities;
}

function positionEntitiesLegacy(
  participants: BattleParticipant[],
  currentPlayerId: string,
  distanceZone?: DistanceZone,
): TacticalMapData['entities'] {
  const gap = DISTANCE_ZONE_GAPS[distanceZone ?? 'mid'];
  const centerY = 50;
  const centerX = 50;
  const players = participants.filter(p => p.isPlayer);
  const enemies = participants.filter(p => !p.isPlayer);
  const entities: TacticalMapData['entities'] = [];

  players.forEach((p, i) => {
    const xOffset = players.length > 1 ? (i - (players.length - 1) / 2) * 15 : 0;
    entities.push({ id: p.characterId, name: p.name, type: 'player', x: centerX + xOffset, y: centerY + gap / 2 });
  });

  enemies.forEach((p, i) => {
    const xOffset = enemies.length > 1 ? (i - (enemies.length - 1) / 2) * 15 : 0;
    entities.push({ id: p.characterId, name: p.name, type: 'enemy', x: centerX + xOffset, y: centerY - gap / 2 });
  });

  return entities;
}

// ── Feature Generation (legacy) ─────────────────────────────────

const TAG_TO_FEATURES: Record<string, { type: any; label: string; w: number; h: number }[]> = {
  bridge: [{ type: 'structure', label: 'Bridge', w: 25, h: 5 }],
  building: [{ type: 'structure', label: 'Building', w: 12, h: 10 }],
  wall: [{ type: 'cover', label: 'Wall', w: 15, h: 3 }],
  vehicle: [{ type: 'vehicle', label: 'Vehicle', w: 8, h: 5 }],
  water: [{ type: 'water', label: 'Water', w: 20, h: 12 }],
  tree: [{ type: 'vegetation', label: 'Trees', w: 8, h: 8 }],
  forest: [{ type: 'vegetation', label: 'Forest', w: 18, h: 14 }],
  platform: [{ type: 'platform', label: 'Platform', w: 12, h: 6 }],
  crater: [{ type: 'crater', label: 'Crater', w: 10, h: 10 }],
  ruins: [{ type: 'structure', label: 'Ruins', w: 14, h: 10 }],
  pillar: [{ type: 'cover', label: 'Pillar', w: 4, h: 4 }],
  rock: [{ type: 'cover', label: 'Rock', w: 6, h: 5 }],
};

function generateFeatures(tags: string[]): TacticalMapData['features'] {
  const features: TacticalMapData['features'] = [];
  const usedPositions: Array<{ x: number; y: number }> = [];

  const findFreePos = () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 10 + Math.random() * 70;
      const y = 10 + Math.random() * 70;
      const tooClose = usedPositions.some(p => Math.abs(p.x - x) < 15 && Math.abs(p.y - y) < 12);
      if (!tooClose) { usedPositions.push({ x, y }); return { x, y }; }
    }
    return { x: 10 + Math.random() * 70, y: 10 + Math.random() * 70 };
  };

  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    for (const [key, defs] of Object.entries(TAG_TO_FEATURES)) {
      if (normalized.includes(key)) {
        for (const def of defs) {
          const pos = findFreePos();
          features.push({ id: `feat-${key}-${features.length}`, label: def.label, type: def.type, x: pos.x, y: pos.y, width: def.w, height: def.h });
        }
        break;
      }
    }
  }

  return features;
}

// ── Hazard Generation ───────────────────────────────────────────

const CONDITION_TO_HAZARD: Record<string, { type: any; label: string }> = {
  burning: { type: 'fire', label: 'Fire Zone' },
  explosive_damage: { type: 'fire', label: 'Blast Zone' },
  flooding: { type: 'flood', label: 'Flood' },
  frozen: { type: 'ice', label: 'Ice' },
  structural_damage: { type: 'collapse', label: 'Unstable' },
  minor_damage: { type: 'debris', label: 'Debris' },
  seismic_activity: { type: 'collapse', label: 'Seismic' },
  spatial_distortion: { type: 'generic', label: 'Distortion' },
  terrain_altered: { type: 'generic', label: 'Altered' },
};

function generateHazards(arenaState?: ArenaState): TacticalMapData['hazards'] {
  if (!arenaState) return [];
  const hazards: TacticalMapData['hazards'] = [];
  for (const tag of arenaState.conditionTags) {
    const def = CONDITION_TO_HAZARD[tag];
    if (def) {
      hazards.push({
        id: `hazard-${tag}`, label: def.label, type: def.type,
        x: 15 + Math.random() * 70, y: 15 + Math.random() * 70,
        radius: 5 + Math.random() * 6,
      });
    }
  }
  return hazards;
}

// ── Main Generator ──────────────────────────────────────────────

export function generateTacticalMap(opts: GenerateMapOptions): TacticalMapData {
  const tags = opts.terrainTags ?? [];
  const useZones = tags.length > 0;

  // Generate zones
  let zones: BattlefieldZone[] | undefined;
  let entities: TacticalMapData['entities'];

  if (useZones) {
    zones = generateZones(tags, opts.locationName);
    if (opts.arenaState) {
      zones = updateZonesFromArenaState(zones, opts.arenaState);
    }
    entities = positionEntitiesInZones(opts.participants, zones, opts.currentPlayerId);
  } else {
    entities = positionEntitiesLegacy(opts.participants, opts.currentPlayerId, opts.distanceZone);
  }

  // Add constructs
  if (opts.constructs) {
    for (const c of opts.constructs) {
      const isOwned = c.creatorId === opts.currentPlayerId;
      entities.push({
        id: c.id, name: c.name, type: 'construct',
        x: 30 + Math.random() * 40,
        y: isOwned ? 60 + Math.random() * 15 : 25 + Math.random() * 15,
      });
    }
  }

  // Apply movement arrows
  if (opts.lastMovements) {
    for (const entity of entities) {
      const dir = opts.lastMovements[entity.id];
      if (dir && dir !== 'none') {
        const delta = 8;
        entity.prevX = entity.x;
        entity.prevY = entity.y;
        switch (dir) {
          case 'forward': entity.prevY = entity.y + delta; break;
          case 'backward': entity.prevY = entity.y - delta; break;
          case 'left': entity.prevX = entity.x + delta; break;
          case 'right': entity.prevX = entity.x - delta; break;
          case 'up': entity.prevY = entity.y + delta; break;
        }
      }
    }
  }

  const features = useZones ? [] : generateFeatures(tags);
  const hazards = generateHazards(opts.arenaState);

  // Compose battlefield image layers
  const imageStack = composeBattlefieldLayers({
    terrainTags: tags,
    locationName: opts.locationName,
    arenaState: opts.arenaState,
    battlePhase: opts.battlePhase,
  });

  // Auto-generate narrator markers from conditions
  let narratorMarkers = opts.narratorMarkers ?? [];
  if (opts.arenaState && zones) {
    const autoMarkers = generateMarkersFromConditions(opts.arenaState.conditionTags, zones);
    narratorMarkers = [...narratorMarkers, ...autoMarkers];
  }

  return {
    entities,
    features,
    hazards,
    arenaName: opts.locationName ?? undefined,
    distanceZone: opts.distanceZone,
    arenaState: opts.arenaState,
    zones,
    imageStack,
    awareness: opts.awareness,
    narratorMarkers,
    cinematicFrame: opts.cinematicFrame,
    movementShadows: opts.movementShadows,
  };
}
