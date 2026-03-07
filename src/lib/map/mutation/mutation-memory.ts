/**
 * Mutation Memory — Battlefield Memory Integration
 *
 * Persists all terrain mutations across turns so the map
 * never resets changes mid-session. Provides query helpers
 * for the renderer and narrator.
 */

import type { TerrainMutation, MutationType } from './mutation-types';

export interface MutationMemory {
  /** All mutations applied this session, chronologically */
  mutations: TerrainMutation[];
  /** Cumulative damage per zone: zoneId → 0-1 total damage */
  zoneDamage: Record<string, number>;
  /** Zones that have fully collapsed */
  collapsedZones: Set<string>;
  /** Labels that have been renamed by mutations */
  renamedLabels: Record<string, string>;
}

export function createMutationMemory(): MutationMemory {
  return {
    mutations: [],
    zoneDamage: {},
    collapsedZones: new Set(),
    renamedLabels: {},
  };
}

export function recordMutation(memory: MutationMemory, mutation: TerrainMutation): MutationMemory {
  const next: MutationMemory = {
    mutations: [...memory.mutations, mutation],
    zoneDamage: { ...memory.zoneDamage },
    collapsedZones: new Set(memory.collapsedZones),
    renamedLabels: { ...memory.renamedLabels },
  };

  // Accumulate zone damage
  for (const zid of mutation.targetZoneIds) {
    const prev = next.zoneDamage[zid] ?? 0;
    next.zoneDamage[zid] = Math.min(1, prev + mutation.magnitude * 0.3);

    if (next.zoneDamage[zid] >= 0.9) {
      next.collapsedZones.add(zid);
    }
  }

  return next;
}

export function recordMutations(memory: MutationMemory, mutations: TerrainMutation[]): MutationMemory {
  let m = memory;
  for (const mut of mutations) {
    m = recordMutation(m, mut);
  }
  return m;
}

/** Get all mutations affecting a specific zone */
export function getZoneMutations(memory: MutationMemory, zoneId: string): TerrainMutation[] {
  return memory.mutations.filter(m => m.targetZoneIds.includes(zoneId));
}

/** Get unapplied mutations (for incremental scene updates) */
export function getUnappliedMutations(memory: MutationMemory): TerrainMutation[] {
  return memory.mutations.filter(m => !m.applied);
}

/** Mark mutations as applied */
export function markApplied(memory: MutationMemory, mutationIds: string[]): MutationMemory {
  const idSet = new Set(mutationIds);
  return {
    ...memory,
    mutations: memory.mutations.map(m =>
      idSet.has(m.id) ? { ...m, applied: true } : m
    ),
  };
}

/** Get summary for narrator context */
export function getMutationNarratorContext(memory: MutationMemory): string {
  if (memory.mutations.length === 0) return '';

  const recent = memory.mutations.slice(-6);
  const lines = recent.map(m => `- ${m.description} (${m.intensity})`);

  let ctx = '\nBATTLEFIELD MUTATIONS:';
  ctx += '\n' + lines.join('\n');

  if (memory.collapsedZones.size > 0) {
    ctx += `\n⚠ Collapsed zones: ${[...memory.collapsedZones].join(', ')}`;
  }

  return ctx;
}

/** Count mutations of a given type */
export function countMutationType(memory: MutationMemory, type: MutationType): number {
  return memory.mutations.filter(m => m.type === type).length;
}
