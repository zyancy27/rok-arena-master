/**
 * Normalized Map Model — Type Definitions
 *
 * Provides a layered model for tactical maps that works across
 * both battle and campaign modes. The existing TacticalMapData
 * is preserved — this is an adapter layer on top.
 *
 * Three layers:
 * 1. Base Layer — terrain, structures, borders, fixed features
 * 2. State Layer — hazards, atmosphere, quest pressure, damage, fog
 * 3. Entity Layer — players, enemies, NPCs, constructs, markers, trails
 */

import type { DistanceZone } from '@/lib/battle-dice';
import type { BattlefieldZone } from '@/lib/tactical-zones';
import type { ArenaState } from '@/lib/living-arena';

// ─── Base Layer ─────────────────────────────────────────────────

export interface MapBaseLayer {
  /** Arena/location name */
  arenaName?: string;
  /** Terrain zones with geometry */
  zones: MapNormalizedZone[];
  /** Fixed structures (walls, buildings, platforms) */
  structures: MapStructure[];
  /** Terrain type tags */
  terrainTags: string[];
  /** Distance zone for battle context */
  distanceZone?: DistanceZone;
}

export interface MapNormalizedZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  elevation?: string;
  terrain?: string;
  cover?: string;
  tags: string[];
}

export interface MapStructure {
  id: string;
  label: string;
  type: 'wall' | 'building' | 'cover' | 'platform' | 'water' | 'vegetation' | 'vehicle' | 'crater' | 'generic';
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── State Layer ────────────────────────────────────────────────

export interface MapStateLayer {
  /** Active hazards */
  hazards: MapActiveHazard[];
  /** Atmospheric conditions */
  atmosphere: MapAtmosphere;
  /** Quest/narrative pressure overlay */
  questPressure?: MapQuestPressure;
  /** Damage/destruction state */
  damageMarkers: MapDamageMarker[];
  /** Visibility/fog settings */
  visibility: MapVisibility;
}

export interface MapActiveHazard {
  id: string;
  label: string;
  type: 'fire' | 'electric' | 'flood' | 'collapse' | 'debris' | 'ice' | 'poison' | 'generic';
  x: number;
  y: number;
  radius: number;
  severity: 'low' | 'medium' | 'high';
  /** Which zone this hazard is in, if applicable */
  zoneId?: string;
}

export interface MapAtmosphere {
  /** Overall visibility level */
  visibility: 'clear' | 'hazy' | 'obscured' | 'dark';
  /** Weather or environmental effect */
  weatherEffect?: string;
  /** Arena state from living-arena system */
  arenaState?: ArenaState;
}

export interface MapQuestPressure {
  /** Pressure level for visual overlay */
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** Zone IDs with elevated pressure */
  hotZones: string[];
  /** Brief description */
  description?: string;
}

export interface MapDamageMarker {
  id: string;
  x: number;
  y: number;
  type: 'crater' | 'scorch' | 'collapse' | 'blood' | 'debris';
  age: number; // turns since created
}

export interface MapVisibility {
  /** Fog of war enabled */
  fogEnabled: boolean;
  /** Awareness radius for player */
  awarenessRadius?: number;
  /** Per-zone awareness levels */
  zoneAwareness?: Record<string, 'full' | 'partial' | 'hidden'>;
  /** Per-entity awareness */
  entityAwareness?: Record<string, 'visible' | 'partial' | 'hidden'>;
}

// ─── Entity Layer ───────────────────────────────────────────────

export interface MapEntityLayer {
  /** Player characters */
  players: MapEntityToken[];
  /** Enemy tokens */
  enemies: MapEntityToken[];
  /** NPC tokens */
  npcs: MapEntityToken[];
  /** Constructs (barriers, summons, etc.) */
  constructs: MapEntityToken[];
  /** Event markers from narrator */
  eventMarkers: MapEventMarker[];
  /** Recent movement trails */
  movementTrails: MapMovementTrail[];
  /** Last-known positions for hidden entities */
  lastKnownPositions: MapLastKnown[];
}

export interface MapEntityToken {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Previous position for animation */
  prevX?: number;
  prevY?: number;
  /** Which zone this entity is in */
  zoneId?: string;
  /** Visual color */
  color?: string;
  /** Current status tags */
  statusTags?: string[];
  /** Whether this entity is the current player */
  isCurrentPlayer?: boolean;
}

export interface MapEventMarker {
  id: string;
  x: number;
  y: number;
  type: 'alert' | 'quest' | 'danger' | 'discovery' | 'npc';
  label?: string;
  urgency: 'low' | 'medium' | 'high';
  /** Auto-expire after N turns */
  expiresIn?: number;
}

export interface MapMovementTrail {
  entityId: string;
  /** Trail points from oldest to newest */
  points: Array<{ x: number; y: number }>;
  /** Age in turns */
  age: number;
  /** Opacity decay factor */
  opacity: number;
}

export interface MapLastKnown {
  entityId: string;
  entityName: string;
  x: number;
  y: number;
  /** How many turns since last seen */
  turnsSinceLastSeen: number;
}

// ─── Combined Normalized Map ────────────────────────────────────

export interface NormalizedMapModel {
  base: MapBaseLayer;
  state: MapStateLayer;
  entities: MapEntityLayer;
}
