/**
 * Fog of Awareness System
 *
 * Determines what zones, entities, and hazards a player can
 * perceive based on their stats, position, and environment.
 */

import type { CharacterStats } from '@/lib/character-stats';
import type { BattlefieldZone, ZoneVisibility, ElevationLevel } from '@/lib/tactical-zones';
import { getElevationDifference } from '@/lib/tactical-zones';

// ── Types ───────────────────────────────────────────────────────

export type AwarenessLevel = 'full' | 'partial' | 'hidden';

export interface AwarenessResult {
  /** Zone ID → awareness level */
  zoneAwareness: Record<string, AwarenessLevel>;
  /** Entity ID → awareness level */
  entityAwareness: Record<string, AwarenessLevel>;
  /** Awareness radius in grid units (0-100 scale) */
  awarenessRadius: number;
}

// ── Core ────────────────────────────────────────────────────────

function calculateAwarenessRadius(stats: CharacterStats, tier: number): number {
  // Intelligence + BIQ + Speed contribute to awareness range
  const perceptionScore =
    (stats.stat_intelligence ?? 50) * 0.35 +
    (stats.stat_battle_iq ?? 50) * 0.40 +
    (stats.stat_speed ?? 50) * 0.25;

  // Base radius 20-60 grid units based on stats
  const base = 20 + (perceptionScore / 100) * 30;
  const tierBonus = (tier - 1) * 3;
  return Math.min(70, base + tierBonus);
}

function getZoneAwareness(
  playerZone: BattlefieldZone,
  targetZone: BattlefieldZone,
  awarenessRadius: number,
): AwarenessLevel {
  // Own zone is always fully aware
  if (playerZone.id === targetZone.id) return 'full';

  const dx = targetZone.x - playerZone.x;
  const dy = targetZone.y - playerZone.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Beyond radius → hidden
  if (distance > awarenessRadius) return 'hidden';

  // Within half radius and clear visibility → full
  if (distance < awarenessRadius * 0.5 && targetZone.visibility !== 'hidden') return 'full';

  // Visibility modifiers
  if (targetZone.visibility === 'hidden') return 'hidden';
  if (targetZone.visibility === 'obscured') return 'partial';

  // Elevation gives better awareness looking down
  const elevDiff = getElevationDifference(playerZone.elevation, targetZone.elevation);
  if (elevDiff < -1) return 'full'; // Looking down

  // Distance-based falloff
  if (distance > awarenessRadius * 0.75) return 'partial';

  return 'full';
}

export function computeAwareness(
  playerCharacterId: string,
  playerZoneId: string,
  playerStats: CharacterStats,
  playerTier: number,
  zones: BattlefieldZone[],
  entityZoneMap: Record<string, string>, // entityId → zoneId
): AwarenessResult {
  const awarenessRadius = calculateAwarenessRadius(playerStats, playerTier);
  const playerZone = zones.find(z => z.id === playerZoneId);

  if (!playerZone) {
    // No zone found — show everything
    const all: Record<string, AwarenessLevel> = {};
    zones.forEach(z => { all[z.id] = 'full'; });
    return { zoneAwareness: all, entityAwareness: {}, awarenessRadius };
  }

  const zoneAwareness: Record<string, AwarenessLevel> = {};
  zones.forEach(z => {
    zoneAwareness[z.id] = getZoneAwareness(playerZone, z, awarenessRadius);
  });

  // Entity awareness follows zone awareness, plus undiscovered zones hide entities
  const entityAwareness: Record<string, AwarenessLevel> = {};
  for (const [entityId, zoneId] of Object.entries(entityZoneMap)) {
    if (entityId === playerCharacterId) {
      entityAwareness[entityId] = 'full';
      continue;
    }
    const za = zoneAwareness[zoneId] || 'hidden';
    entityAwareness[entityId] = za;
  }

  return { zoneAwareness, entityAwareness, awarenessRadius };
}

/** Simple LOS line for SVG rendering between two points */
export interface LOSLine {
  x1: number; y1: number;
  x2: number; y2: number;
  status: 'clear' | 'partial' | 'blocked';
}

export function createLOSLine(
  fromX: number, fromY: number,
  toX: number, toY: number,
  status: 'clear' | 'partial' | 'blocked',
): LOSLine {
  return { x1: fromX, y1: fromY, x2: toX, y2: toY, status };
}

export const LOS_COLORS: Record<LOSLine['status'], string> = {
  clear: 'hsla(140, 60%, 50%, 0.5)',
  partial: 'hsla(45, 70%, 50%, 0.5)',
  blocked: 'hsla(0, 70%, 50%, 0.4)',
};
