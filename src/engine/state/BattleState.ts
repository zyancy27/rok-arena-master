/**
 * Central Battle State
 *
 * Single source of truth for all combat data within a battle instance.
 * All engine subsystems read from and write to this state.
 */

import type { CharacterStats } from '@/lib/character-stats';
import type { DistanceZone, DistanceState, Construct } from '@/lib/battle-dice';
import type { MomentumState } from '@/lib/battle-momentum';
import type { PsychologicalState } from '@/lib/battle-psychology';
import type { ChargeState } from '@/lib/battle-charge';
import type { ActiveBattlefieldEffect } from '@/lib/battlefield-effects';

// ─── Player State ────────────────────────────────────────────────

export interface BattlePlayer {
  characterId: string;
  userId: string;
  name: string;
  tier: number;
  stats: CharacterStats;
  powers: string | null;
  abilities: string | null;

  /** Concentration uses remaining (max 3) */
  concentrationUsesLeft: number;
  /** Stat penalty % for next action (from concentration use) */
  statPenalty: number;
  /** Count of consecutive high-force turns */
  consecutiveHighForceTurns: number;

  /** Momentum subsystem state */
  momentum: MomentumState;
  /** Psychological subsystem state */
  psychology: PsychologicalState;
  /** Charge subsystem state */
  charge: ChargeState;

  /** Turn order position (0-based) */
  turnOrder: number;
}

// ─── Central Battle State ────────────────────────────────────────

export interface CentralBattleState {
  /** Unique battle ID */
  battleId: string;
  /** Battle mode: pvp, pvpvp, pve, eve, campaign */
  mode: 'pvp' | 'pvpvp' | 'pve' | 'eve' | 'campaign';

  /** All participants keyed by characterId */
  players: Record<string, BattlePlayer>;
  /** Ordered list of character IDs for turn cycling */
  turnOrder: string[];
  /** Index into turnOrder for current turn */
  currentTurnIndex: number;
  /** Global turn counter */
  turnNumber: number;

  /** Distance between fighters (for 1v1; multi uses pairwise map) */
  distance: DistanceState;
  /** Pairwise distances for multi-fighter battles */
  pairwiseDistances?: Record<string, DistanceState>;

  /** Active constructs on the battlefield */
  constructs: Record<string, Construct>;

  /** Active battlefield visual/mechanical effects */
  activeEffects: ActiveBattlefieldEffect[];

  /** Environment metadata */
  environment: {
    locationName: string | null;
    locationDescription: string | null;
    planetName: string | null;
    gravity: number;
    terrainTags: string[];
    dynamicEnvironment: boolean;
    hazardFrequency: 'low' | 'medium' | 'high';
  };

  /** Accumulated narrator context for current turn */
  narratorContext: string[];

  /** Battle log of significant events (for AI context window) */
  battleLog: Array<{
    turnNumber: number;
    characterId: string;
    summary: string;
    timestamp: number;
  }>;

  /** Battle status */
  status: 'waiting' | 'active' | 'paused' | 'completed';

  /** Winner/loser (set when battle ends) */
  winnerId: string | null;
  loserId: string | null;
}
