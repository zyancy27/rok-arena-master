/**
 * Normalized Map Adapter
 *
 * Converts existing TacticalMapData into the normalized map model
 * and back. This adapter preserves full backwards compatibility
 * while enabling the layered update model.
 *
 * Integration points:
 * - TacticalBattleMap.tsx → consumes TacticalMapData (unchanged)
 * - CampaignTacticalMap.tsx → consumes TacticalMapData (unchanged)
 * - New systems can use NormalizedMapModel and convert when rendering
 */

import type { TacticalMapData } from '@/components/battles/TacticalBattleMap';
import type {
  NormalizedMapModel,
  MapBaseLayer,
  MapStateLayer,
  MapEntityLayer,
  MapNormalizedZone,
  MapStructure,
  MapActiveHazard,
  MapEntityToken,
  MapEventMarker,
  MapMovementTrail,
} from './normalized-map-types';

// ─── TacticalMapData → NormalizedMapModel ───────────────────────

/**
 * Convert existing TacticalMapData into the normalized layered model.
 * Non-destructive: the original data is preserved in each layer's mapping.
 */
export function toNormalizedMap(data: TacticalMapData): NormalizedMapModel {
  return {
    base: extractBaseLayer(data),
    state: extractStateLayer(data),
    entities: extractEntityLayer(data),
  };
}

function extractBaseLayer(data: TacticalMapData): MapBaseLayer {
  const zones: MapNormalizedZone[] = (data.zones ?? []).map(z => ({
    id: z.id,
    label: z.label || z.id,
    x: z.x,
    y: z.y,
    width: z.width,
    height: z.height,
    elevation: z.elevation,
    terrain: z.terrain,
    cover: z.cover,
    tags: z.tags ?? [],
  }));

  const structures: MapStructure[] = (data.features ?? []).map(f => ({
    id: f.id,
    label: f.label,
    type: mapFeatureType(f.type),
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
  }));

  return {
    arenaName: data.arenaName,
    zones,
    structures,
    terrainTags: data.arenaName ? [data.arenaName] : [],
    distanceZone: data.distanceZone,
  };
}

function extractStateLayer(data: TacticalMapData): MapStateLayer {
  const hazards: MapActiveHazard[] = (data.hazards ?? []).map(h => ({
    id: h.id,
    label: h.label,
    type: h.type === 'generic' ? 'generic' : h.type,
    x: h.x,
    y: h.y,
    radius: h.radius,
    severity: h.radius > 15 ? 'high' : h.radius > 8 ? 'medium' : 'low',
  }));

  return {
    hazards,
    atmosphere: {
      visibility: 'clear',
      arenaState: data.arenaState,
    },
    damageMarkers: [],
    visibility: {
      fogEnabled: !!data.awareness,
      awarenessRadius: data.awareness?.awarenessRadius,
      zoneAwareness: data.awareness?.zoneAwareness,
      entityAwareness: data.awareness?.entityAwareness as Record<string, 'visible' | 'partial' | 'hidden'> | undefined,
    },
  };
}

function extractEntityLayer(data: TacticalMapData): MapEntityLayer {
  const players: MapEntityToken[] = [];
  const enemies: MapEntityToken[] = [];
  const constructs: MapEntityToken[] = [];

  for (const e of data.entities) {
    const token: MapEntityToken = {
      id: e.id,
      name: e.name,
      x: e.x,
      y: e.y,
      prevX: e.prevX,
      prevY: e.prevY,
      zoneId: e.zoneId,
      color: e.color,
    };

    switch (e.type) {
      case 'player':
        players.push({ ...token, isCurrentPlayer: true });
        break;
      case 'enemy':
        enemies.push(token);
        break;
      case 'construct':
        constructs.push(token);
        break;
    }
  }

  const eventMarkers: MapEventMarker[] = (data.narratorMarkers ?? []).map(m => ({
    id: m.id,
    x: m.x,
    y: m.y,
    type: mapMarkerType(m.urgency),
    label: m.label,
    urgency: m.urgency,
    expiresIn: m.ttlMs ? Math.ceil(m.ttlMs / 6000) : undefined,
  }));

  const movementTrails: MapMovementTrail[] = (data.movementShadows ?? []).map(s => ({
    entityId: s.entityId,
    points: [{ x: s.projectedX, y: s.projectedY }],
    age: 0,
    opacity: s.opacity,
  }));

  return {
    players,
    enemies,
    npcs: [],
    constructs,
    eventMarkers,
    movementTrails,
    lastKnownPositions: [],
  };
}

// ─── NormalizedMapModel → TacticalMapData ───────────────────────

/**
 * Convert a NormalizedMapModel back to TacticalMapData for rendering
 * in existing map components.
 */
export function fromNormalizedMap(model: NormalizedMapModel): TacticalMapData {
  const entities = [
    ...model.entities.players.map(p => ({ id: p.id, name: p.name, type: 'player' as const, x: p.x, y: p.y, prevX: p.prevX, prevY: p.prevY, color: p.color, zoneId: p.zoneId })),
    ...model.entities.enemies.map(e => ({ id: e.id, name: e.name, type: 'enemy' as const, x: e.x, y: e.y, prevX: e.prevX, prevY: e.prevY, color: e.color, zoneId: e.zoneId })),
    ...model.entities.constructs.map(c => ({ id: c.id, name: c.name, type: 'construct' as const, x: c.x, y: c.y, prevX: c.prevX, prevY: c.prevY, color: c.color, zoneId: c.zoneId })),
  ];

  const features = model.base.structures.map(s => ({
    id: s.id,
    label: s.label,
    type: reverseMapFeatureType(s.type),
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
  }));

  const hazards = model.state.hazards.map(h => ({
    id: h.id,
    label: h.label,
    type: h.type === 'poison' ? 'generic' as const : h.type,
    x: h.x,
    y: h.y,
    radius: h.radius,
  }));

  return {
    entities,
    features,
    hazards,
    arenaName: model.base.arenaName,
    distanceZone: model.base.distanceZone,
    arenaState: model.state.atmosphere.arenaState,
    zones: model.base.zones.map(z => ({
      id: z.id,
      label: z.label,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      elevation: z.elevation,
      terrain: z.terrain,
      cover: z.cover,
      tags: z.tags,
    })) as any,
  };
}

// ─── Incremental Updates ────────────────────────────────────────

/**
 * Update only the entity layer without rebuilding the full map.
 * This avoids expensive re-renders of base terrain and structures.
 */
export function updateEntityLayer(
  model: NormalizedMapModel,
  updates: Partial<MapEntityLayer>,
): NormalizedMapModel {
  return {
    ...model,
    entities: { ...model.entities, ...updates },
  };
}

/**
 * Update only the state layer (hazards, atmosphere, fog).
 */
export function updateStateLayer(
  model: NormalizedMapModel,
  updates: Partial<MapStateLayer>,
): NormalizedMapModel {
  return {
    ...model,
    state: { ...model.state, ...updates },
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function mapFeatureType(type: string): MapStructure['type'] {
  const mapping: Record<string, MapStructure['type']> = {
    structure: 'building',
    cover: 'cover',
    hazard: 'generic',
    water: 'water',
    vegetation: 'vegetation',
    vehicle: 'vehicle',
    platform: 'platform',
    crater: 'crater',
  };
  return mapping[type] || 'generic';
}

function reverseMapFeatureType(type: MapStructure['type']): string {
  const mapping: Record<MapStructure['type'], string> = {
    wall: 'structure',
    building: 'structure',
    cover: 'cover',
    platform: 'platform',
    water: 'water',
    vegetation: 'vegetation',
    vehicle: 'vehicle',
    crater: 'crater',
    generic: 'structure',
  };
  return mapping[type] || 'structure';
}

function mapMarkerType(urgency: string): MapEventMarker['type'] {
  switch (urgency) {
    case 'high': return 'danger';
    case 'medium': return 'alert';
    default: return 'discovery';
  }
}
