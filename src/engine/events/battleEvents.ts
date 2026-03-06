/**
 * Battle Event Definitions
 *
 * All event types that flow through the battle event bus.
 * Systems subscribe to specific events to react without direct coupling.
 */

import type { MoveIntent } from '@/lib/intent-interpreter';
import type { ClampResult } from '@/lib/hard-clamp';
import type { CharacterStats } from '@/lib/character-stats';
import type { DiceRollResult, HitDetermination, DistanceZone, Construct } from '@/lib/battle-dice';
import type { OverchargeResult } from '@/lib/battle-overcharge';
import type { MomentumState } from '@/lib/battle-momentum';
import type { PsychologicalState, PsychEvent } from '@/lib/battle-psychology';
import type { PerceptionResult } from '@/lib/battle-perception';
import type { ActiveBattlefieldEffect } from '@/lib/battlefield-effects';

// ─── Event Payload Map ──────────────────────────────────────────────────────

export interface BattleEventMap {
  /** A player submits move text */
  onMoveSubmitted: {
    characterId: string;
    moveText: string;
    battleId: string;
    turnNumber: number;
  };

  /** Intent interpretation complete */
  onIntentResolved: {
    characterId: string;
    intent: MoveIntent;
    clampResult: ClampResult;
  };

  /** Attack action detected and resolved */
  onAttack: {
    attackerId: string;
    defenderId: string;
    hitDetermination: HitDetermination;
    isMental: boolean;
    overcharge: OverchargeResult | null;
  };

  /** Defense action detected */
  onDefense: {
    defenderId: string;
    attackerId: string;
    defenseType: 'block' | 'dodge';
    success: boolean;
    gap: number;
  };

  /** A hit connects */
  onHit: {
    attackerId: string;
    defenderId: string;
    gap: number;
    damageLevel: 'light' | 'moderate' | 'heavy';
    isMental: boolean;
  };

  /** An attack misses */
  onMiss: {
    attackerId: string;
    defenderId: string;
    gap: number;
    nearMiss: boolean; // gap <= 5
  };

  /** Ability or skill used */
  onAbilityUsed: {
    characterId: string;
    abilityType: string;
    elements: string[];
    isMismatch: boolean;
  };

  /** Construct created */
  onConstructCreated: {
    creatorId: string;
    construct: Construct;
  };

  /** Construct destroyed */
  onConstructDestroyed: {
    constructId: string;
    creatorId: string;
    destroyedBy: string;
  };

  /** Environment changed (hazard, terrain shift) */
  onEnvironmentChanged: {
    effects: ActiveBattlefieldEffect[];
    hazardName: string | null;
    hazardDescription: string | null;
  };

  /** Turn starts */
  onTurnStart: {
    characterId: string;
    turnNumber: number;
    battleId: string;
  };

  /** Turn ends */
  onTurnEnd: {
    characterId: string;
    turnNumber: number;
    battleId: string;
  };

  /** Distance between fighters changes */
  onDistanceChanged: {
    fromZone: DistanceZone;
    toZone: DistanceZone;
    movedBy: string;
    direction: 'closer' | 'away';
  };

  /** Momentum state updated */
  onMomentumChanged: {
    characterId: string;
    momentum: MomentumState;
    events: Array<{ type: 'gain' | 'loss'; amount: number; reason: string }>;
  };

  /** Psychological state shifted */
  onPsychStateChanged: {
    characterId: string;
    state: PsychologicalState;
    triggeredEvents: PsychEvent[];
  };

  /** Perception evaluated */
  onPerceptionEvaluated: {
    defenderId: string;
    result: PerceptionResult;
  };

  /** Concentration used (offensive or defensive) */
  onConcentrationUsed: {
    characterId: string;
    type: 'offensive' | 'defensive';
    success: boolean;
    bonusRoll: number;
    penaltyApplied: number;
  };

  /** Charge state changed */
  onChargeStateChanged: {
    characterId: string;
    isCharging: boolean;
    turnsRemaining: number;
    interrupted: boolean;
    released: boolean;
    multiplier: number | null;
  };

  /** Overcharge resolved */
  onOverchargeResolved: {
    characterId: string;
    result: OverchargeResult;
  };

  /** Narrator context ready for AI */
  onNarratorContextReady: {
    battleId: string;
    context: string;
    turnNumber: number;
  };

  /** Battle ends */
  onBattleEnd: {
    battleId: string;
    winnerId: string | null;
    loserId: string | null;
    reason: string;
  };

  /** Zone state changed (stability, threat, hazard) */
  onZoneChanged: {
    zoneId: string;
    zoneLabel: string;
    changeType: 'stability' | 'threat' | 'hazard' | 'collapse' | 'tactical';
    description: string;
  };

  /** Entity moved between zones */
  onZoneMovement: {
    entityId: string;
    fromZoneId: string;
    toZoneId: string;
  };

  /** Narrator marker placed */
  onNarratorMarker: {
    markerId: string;
    markerType: string;
    label: string;
    zoneId?: string;
  };

  /** Cinematic moment triggered */
  onCinematicMoment: {
    title: string;
    description: string;
    emphasis: 'impact' | 'danger' | 'shift' | 'reveal';
    zoneId?: string;
    entityId?: string;
  };
}

export type BattleEventType = keyof BattleEventMap;
