/**
 * System 9 — Emotional Environment Pressure
 *
 * A stability meter representing narrative tension. The environment
 * builds suspense as pressure rises from hazards, damage, combat,
 * and narrator escalation.
 */

import type { EmotionalPressureMeter, EmotionalPressureState } from './types';

// ── State Thresholds ────────────────────────────────────────────

function stateFromLevel(level: number): EmotionalPressureState {
  if (level <= 20) return 'stable';
  if (level <= 40) return 'strained';
  if (level <= 60) return 'unstable';
  if (level <= 85) return 'critical';
  return 'collapse';
}

const NARRATOR_HINTS: Record<EmotionalPressureState, string> = {
  stable: 'The environment feels calm and steady. Narrate with measured pacing.',
  strained: 'Tension is building. Introduce subtle environmental cues — creaks, flickering, distant sounds.',
  unstable: 'The environment is under stress. Structures may shift. Hazards intensify. Increase urgency.',
  critical: 'The area is on the verge of failure. Major changes are imminent. Narrate with mounting dread.',
  collapse: 'The environment is actively failing. Catastrophic changes are underway. Maximum narrative intensity.',
};

// ── Create ──────────────────────────────────────────────────────

export function createPressureMeter(): EmotionalPressureMeter {
  return {
    level: 0,
    state: 'stable',
    tensionFactors: [],
    narratorHint: NARRATOR_HINTS.stable,
  };
}

// ── Update ──────────────────────────────────────────────────────

export interface PressureUpdateResult {
  meter: EmotionalPressureMeter;
  stateChanged: boolean;
  previousState: EmotionalPressureState;
}

export function applyPressure(
  meter: EmotionalPressureMeter,
  delta: number,
  factor: string,
): PressureUpdateResult {
  const previousState = meter.state;
  const newLevel = Math.max(0, Math.min(100, meter.level + delta));
  const newState = stateFromLevel(newLevel);

  const tensionFactors = factor
    ? [...meter.tensionFactors.filter((f) => f !== factor), factor]
    : meter.tensionFactors;

  return {
    meter: {
      level: newLevel,
      state: newState,
      tensionFactors,
      narratorHint: NARRATOR_HINTS[newState],
    },
    stateChanged: newState !== previousState,
    previousState,
  };
}

/**
 * Slowly reduce pressure over time (natural de-escalation).
 */
export function decayPressure(
  meter: EmotionalPressureMeter,
  amount = 3,
): PressureUpdateResult {
  return applyPressure(meter, -amount, '');
}

// ── Pressure Sources ────────────────────────────────────────────

export interface PressureSource {
  factor: string;
  delta: number;
}

const STANDARD_SOURCES: Record<string, PressureSource> = {
  hazard_active: { factor: 'Active hazard', delta: 8 },
  structure_damage: { factor: 'Structural damage', delta: 10 },
  structure_collapse: { factor: 'Structure collapsed', delta: 20 },
  combat_heavy: { factor: 'Heavy combat', delta: 12 },
  combat_light: { factor: 'Light combat', delta: 5 },
  narrator_escalation: { factor: 'Narrator escalation', delta: 15 },
  environment_mutation: { factor: 'Environment mutation', delta: 8 },
  player_destruction: { factor: 'Player destructive action', delta: 10 },
  flood_rise: { factor: 'Rising water', delta: 12 },
  fire_spread: { factor: 'Fire spreading', delta: 10 },
  gas_expansion: { factor: 'Toxic gas expanding', delta: 8 },
  calm_moment: { factor: 'Moment of calm', delta: -10 },
};

export function getStandardSource(key: string): PressureSource | undefined {
  return STANDARD_SOURCES[key];
}

export function applyStandardPressure(
  meter: EmotionalPressureMeter,
  sourceKey: string,
): PressureUpdateResult {
  const source = STANDARD_SOURCES[sourceKey];
  if (!source) return { meter, stateChanged: false, previousState: meter.state };
  return applyPressure(meter, source.delta, source.factor);
}
