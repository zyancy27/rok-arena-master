/**
 * Combat Engine Types
 *
 * Shared type definitions used across all combat subsystems.
 */

import type { DiceRollResult, HitDetermination } from '@/lib/battle-dice';
import type { OverchargeResult } from '@/lib/battle-overcharge';
import type { MoveIntent } from '@/lib/intent-interpreter';
import type { ClampResult } from '@/lib/hard-clamp';
import type { CombatAction } from '../intent/classifyAction';

export type CombatMode = 'pvp' | 'pvpvp' | 'pve' | 'eve' | 'campaign';

export interface CombatResolutionInput {
  /** The classified action from the intent layer */
  action: CombatAction;
  /** The acting character's ID */
  attackerId: string;
  /** The target character's ID (if any) */
  defenderId: string | null;
  /** Clamp result from hard-clamp layer */
  clampResult: ClampResult;
  /** Whether overcharge is toggled */
  overchargeActive: boolean;
  /** Combat mode */
  mode: CombatMode;
}

export interface CombatResolutionResult {
  /** Whether a hit check was performed */
  hitCheckPerformed: boolean;
  /** Hit determination result (null if no hit check) */
  hitDetermination: HitDetermination | null;
  /** Whether the attack connected */
  didHit: boolean | null;
  /** Damage level if hit */
  damageLevel: 'light' | 'moderate' | 'heavy' | null;
  /** Dice rolls performed */
  diceRolls: DiceRollResult[];
  /** Overcharge result (null if not overcharged) */
  overchargeResult: OverchargeResult | null;
  /** Defense check performed */
  defenseCheckPerformed: boolean;
  /** Defense success (null if no defense check) */
  defenseSuccess: boolean | null;
  /** Narrator context strings to inject */
  narratorContext: string[];
  /** Whether concentration is available (gap <= 5) */
  concentrationAvailable: boolean;
  /** Gap between attack and defense (for concentration threshold) */
  gap: number;
}
