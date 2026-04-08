/**
 * Entity Layer Updates
 *
 * Lightweight update functions for the entity layer of the normalized map.
 * These enable granular updates without rebuilding the full map model.
 */

import type {
  MapEntityLayer,
  MapEntityToken,
  MapMovementTrail,
  MapLastKnown,
  MapEventMarker,
} from './normalized-map-types';

/**
 * Move an entity to a new position, recording the trail.
 */
export function moveEntity(
  layer: MapEntityLayer,
  entityId: string,
  newX: number,
  newY: number,
): MapEntityLayer {
  const updateToken = (tokens: MapEntityToken[]) =>
    tokens.map(t => {
      if (t.id !== entityId) return t;
      return { ...t, prevX: t.x, prevY: t.y, x: newX, y: newY };
    });

  // Add to movement trail
  const existingTrail = layer.movementTrails.find(t => t.entityId === entityId);
  const trailPoint = { x: newX, y: newY };
  let updatedTrails: MapMovementTrail[];

  if (existingTrail) {
    updatedTrails = layer.movementTrails.map(t => {
      if (t.entityId !== entityId) return t;
      const points = [...t.points, trailPoint].slice(-5); // Keep last 5 points
      return { ...t, points, age: 0, opacity: 0.6 };
    });
  } else {
    updatedTrails = [
      ...layer.movementTrails,
      { entityId, points: [trailPoint], age: 0, opacity: 0.6 },
    ];
  }

  return {
    ...layer,
    players: updateToken(layer.players),
    enemies: updateToken(layer.enemies),
    npcs: updateToken(layer.npcs),
    constructs: updateToken(layer.constructs),
    movementTrails: updatedTrails,
  };
}

/**
 * Add or update a last-known position for an entity that has gone hidden.
 */
export function recordLastKnown(
  layer: MapEntityLayer,
  entityId: string,
  entityName: string,
  x: number,
  y: number,
): MapEntityLayer {
  const existing = layer.lastKnownPositions.findIndex(l => l.entityId === entityId);
  const newEntry: MapLastKnown = { entityId, entityName, x, y, turnsSinceLastSeen: 0 };

  let updated: MapLastKnown[];
  if (existing >= 0) {
    updated = layer.lastKnownPositions.map((l, i) => i === existing ? newEntry : l);
  } else {
    updated = [...layer.lastKnownPositions, newEntry];
  }

  return { ...layer, lastKnownPositions: updated };
}

/**
 * Age all movement trails and last-known positions by one turn.
 * Removes expired trails (opacity < 0.1) and very old last-known positions.
 */
export function ageEntityLayer(layer: MapEntityLayer): MapEntityLayer {
  const updatedTrails = layer.movementTrails
    .map(t => ({ ...t, age: t.age + 1, opacity: t.opacity * 0.7 }))
    .filter(t => t.opacity >= 0.1);

  const updatedLastKnown = layer.lastKnownPositions
    .map(l => ({ ...l, turnsSinceLastSeen: l.turnsSinceLastSeen + 1 }))
    .filter(l => l.turnsSinceLastSeen < 10);

  return {
    ...layer,
    movementTrails: updatedTrails,
    lastKnownPositions: updatedLastKnown,
  };
}

/**
 * Add an event ping marker (e.g., combat hit, discovery, alert).
 */
export function addEventPing(
  layer: MapEntityLayer,
  marker: MapEventMarker,
): MapEntityLayer {
  return {
    ...layer,
    eventMarkers: [...layer.eventMarkers, marker],
  };
}

/**
 * Remove expired event markers.
 */
export function pruneEventMarkers(layer: MapEntityLayer): MapEntityLayer {
  const updated = layer.eventMarkers
    .map(m => m.expiresIn != null ? { ...m, expiresIn: m.expiresIn - 1 } : m)
    .filter(m => m.expiresIn == null || m.expiresIn > 0);

  return { ...layer, eventMarkers: updated };
}

/**
 * Update status tags on an entity (e.g., "bleeding", "stunned", "hidden").
 */
export function setEntityStatus(
  layer: MapEntityLayer,
  entityId: string,
  statusTags: string[],
): MapEntityLayer {
  const updateToken = (tokens: MapEntityToken[]) =>
    tokens.map(t => t.id === entityId ? { ...t, statusTags } : t);

  return {
    ...layer,
    players: updateToken(layer.players),
    enemies: updateToken(layer.enemies),
    npcs: updateToken(layer.npcs),
    constructs: updateToken(layer.constructs),
  };
}
