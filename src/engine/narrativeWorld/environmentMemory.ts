/**
 * System 5 — Environment Memory
 *
 * Persistent memory of environmental changes so broken walls stay broken,
 * collapsed structures stay collapsed, and the narrator can reference
 * past events.
 */

import type { EnvironmentMemoryState, EnvironmentChange } from './types';

let _changeId = 0;

// ── Create / Initialize ─────────────────────────────────────────

export function createEnvironmentMemory(): EnvironmentMemoryState {
  return { changes: [], zoneChanges: {} };
}

// ── Record Changes ──────────────────────────────────────────────

export function recordChange(
  memory: EnvironmentMemoryState,
  zoneId: string,
  description: string,
  turn: number,
  narratorReference: string,
  persistent = true,
): EnvironmentMemoryState {
  const change: EnvironmentChange = {
    id: `envchange_${++_changeId}`,
    description,
    zoneId,
    turnApplied: turn,
    persistent,
    narratorReference,
  };

  const changes = [...memory.changes, change];
  const zoneChanges = { ...memory.zoneChanges };
  zoneChanges[zoneId] = [...(zoneChanges[zoneId] ?? []), change.id];

  return { changes, zoneChanges };
}

// ── Query ───────────────────────────────────────────────────────

export function getZoneHistory(
  memory: EnvironmentMemoryState,
  zoneId: string,
): EnvironmentChange[] {
  const ids = memory.zoneChanges[zoneId] ?? [];
  return memory.changes.filter((c) => ids.includes(c.id));
}

export function getPersistentChanges(memory: EnvironmentMemoryState): EnvironmentChange[] {
  return memory.changes.filter((c) => c.persistent);
}

/**
 * Build narrator context referencing past changes for a given zone.
 */
export function buildNarratorMemoryContext(
  memory: EnvironmentMemoryState,
  zoneId: string,
): string {
  const history = getZoneHistory(memory, zoneId).filter((c) => c.persistent);
  if (history.length === 0) return '';

  const refs = history.map((c) => c.narratorReference);
  return `Environmental context: ${refs.join(' ')}`;
}

/**
 * Build a full narrator summary of all persistent changes.
 */
export function buildFullMemorySummary(memory: EnvironmentMemoryState): string {
  const persistent = getPersistentChanges(memory);
  if (persistent.length === 0) return 'The environment shows no lasting changes.';
  return persistent.map((c) => c.narratorReference).join(' ');
}
