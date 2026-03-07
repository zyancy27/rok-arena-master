/**
 * System 2 — Structural Stress Simulation
 *
 * Tracks stability of human-made structures. Stress escalates from
 * hazards, impacts, narrative pressure, and Living Arena state.
 * Provides narrator descriptions at each threshold.
 */

import type { StructuralStressRecord, StressState } from './types';

// ── Thresholds ──────────────────────────────────────────────────

const STATE_THRESHOLDS: { max: number; state: StressState }[] = [
  { max: 20, state: 'stable' },
  { max: 40, state: 'strained' },
  { max: 60, state: 'cracking' },
  { max: 85, state: 'failing' },
  { max: 100, state: 'collapsed' },
];

function stateFromLevel(level: number): StressState {
  const clamped = Math.max(0, Math.min(100, level));
  for (const t of STATE_THRESHOLDS) {
    if (clamped <= t.max) return t.state;
  }
  return 'collapsed';
}

// ── Default Narrator Descriptions ───────────────────────────────

function defaultDescriptions(label: string): Record<StressState, string> {
  return {
    stable: `${label} stands firm and steady.`,
    strained: `${label} creaks under pressure — something is not right.`,
    cracking: `Visible cracks spread across ${label}. Dust falls from the joints.`,
    failing: `${label} groans loudly. Sections begin to buckle and give way.`,
    collapsed: `${label} collapses with a thunderous crash, sending debris everywhere.`,
  };
}

// ── Public API ──────────────────────────────────────────────────

let _structureIdCounter = 0;

export function createStressRecord(
  label: string,
  zoneId: string,
  initialStress = 0,
  descriptions?: Partial<Record<StressState, string>>,
): StructuralStressRecord {
  const merged = { ...defaultDescriptions(label), ...descriptions };
  return {
    structureId: `struct_${++_structureIdCounter}`,
    label,
    zoneId,
    state: stateFromLevel(initialStress),
    stressLevel: initialStress,
    stateDescriptions: merged,
    lastUpdateTurn: 0,
  };
}

export interface StressUpdateResult {
  record: StructuralStressRecord;
  stateChanged: boolean;
  previousState: StressState;
  narratorDescription: string;
  /** True when structure just collapsed */
  collapsed: boolean;
}

/**
 * Apply stress delta and return the updated record plus narrator context.
 */
export function applyStress(
  record: StructuralStressRecord,
  delta: number,
  turn: number,
): StressUpdateResult {
  if (record.state === 'collapsed') {
    return {
      record,
      stateChanged: false,
      previousState: 'collapsed',
      narratorDescription: record.stateDescriptions.collapsed,
      collapsed: false,
    };
  }

  const previousState = record.state;
  const newLevel = Math.max(0, Math.min(100, record.stressLevel + delta));
  const newState = stateFromLevel(newLevel);
  const stateChanged = newState !== previousState;

  const updated: StructuralStressRecord = {
    ...record,
    stressLevel: newLevel,
    state: newState,
    lastUpdateTurn: turn,
  };

  return {
    record: updated,
    stateChanged,
    previousState,
    narratorDescription: updated.stateDescriptions[newState],
    collapsed: newState === 'collapsed' && stateChanged,
  };
}

/**
 * Bulk-apply environmental pressure to all tracked structures.
 */
export function applyEnvironmentalPressure(
  records: StructuralStressRecord[],
  pressureLevel: number,
  turn: number,
): StressUpdateResult[] {
  // Higher pressure = higher per-structure delta, scaled 0–15
  const delta = Math.round((pressureLevel / 100) * 15);
  if (delta <= 0) return [];
  return records
    .filter((r) => r.state !== 'collapsed')
    .map((r) => applyStress(r, delta, turn));
}

export function getNarratorDescription(record: StructuralStressRecord): string {
  return record.stateDescriptions[record.state];
}
