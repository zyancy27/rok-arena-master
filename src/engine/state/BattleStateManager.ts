/**
 * Battle State Manager
 *
 * Provides controlled mutations to the CentralBattleState.
 * All state changes go through this manager so event emission
 * and validation happen in one place.
 */

import type { CentralBattleState, BattlePlayer } from './BattleState';
import type { BattleEventBus } from '../events/eventBus';
import type { DistanceZone, DistanceState, Construct } from '@/lib/battle-dice';
import type { MomentumState } from '@/lib/battle-momentum';
import type { PsychologicalState } from '@/lib/battle-psychology';
import type { ChargeState } from '@/lib/battle-charge';
import type { ActiveBattlefieldEffect } from '@/lib/battlefield-effects';
import { createMomentumState } from '@/lib/battle-momentum';
import { createPsychologicalState } from '@/lib/battle-psychology';
import { createChargeState } from '@/lib/battle-charge';
import type { CharacterStats } from '@/lib/character-stats';

// ─── Factory ─────────────────────────────────────────────────────

export interface CreateBattleOptions {
  battleId: string;
  mode: CentralBattleState['mode'];
  players: Array<{
    characterId: string;
    userId: string;
    name: string;
    tier: number;
    stats: CharacterStats;
    powers: string | null;
    abilities: string | null;
    turnOrder: number;
  }>;
  startingDistance?: DistanceZone;
  environment?: Partial<CentralBattleState['environment']>;
}

const DISTANCE_ZONES_META: Record<DistanceZone, { min: number; max: number }> = {
  melee: { min: 0, max: 2 },
  close: { min: 2, max: 5 },
  mid: { min: 5, max: 15 },
  long: { min: 15, max: 50 },
  extreme: { min: 50, max: 200 },
};

function zoneToDistance(zone: DistanceZone): DistanceState {
  const z = DISTANCE_ZONES_META[zone];
  return { currentZone: zone, estimatedMeters: (z.min + z.max) / 2, lastMovement: 'none' };
}

export function createBattleState(opts: CreateBattleOptions): CentralBattleState {
  const players: Record<string, BattlePlayer> = {};
  const turnOrder: string[] = [];

  for (const p of opts.players.sort((a, b) => a.turnOrder - b.turnOrder)) {
    players[p.characterId] = {
      ...p,
      concentrationUsesLeft: 3,
      statPenalty: 0,
      consecutiveHighForceTurns: 0,
      momentum: createMomentumState(),
      psychology: createPsychologicalState(),
      charge: createChargeState(),
    };
    turnOrder.push(p.characterId);
  }

  const startZone = opts.startingDistance ?? 'mid';

  return {
    battleId: opts.battleId,
    mode: opts.mode,
    players,
    turnOrder,
    currentTurnIndex: 0,
    turnNumber: 1,
    distance: zoneToDistance(startZone),
    constructs: {},
    activeEffects: [],
    environment: {
      locationName: opts.environment?.locationName ?? null,
      locationDescription: opts.environment?.locationDescription ?? null,
      planetName: opts.environment?.planetName ?? null,
      gravity: opts.environment?.gravity ?? 1.0,
      terrainTags: opts.environment?.terrainTags ?? [],
      dynamicEnvironment: opts.environment?.dynamicEnvironment ?? false,
      hazardFrequency: opts.environment?.hazardFrequency ?? 'medium',
    },
    narratorContext: [],
    battleLog: [],
    status: 'active',
    winnerId: null,
    loserId: null,
  };
}

// ─── State Manager ───────────────────────────────────────────────

export class BattleStateManager {
  private state: CentralBattleState;
  private eventBus: BattleEventBus;

  constructor(state: CentralBattleState, eventBus: BattleEventBus) {
    this.state = state;
    this.eventBus = eventBus;
  }

  /** Get a read-only snapshot of the current state. */
  getState(): Readonly<CentralBattleState> {
    return this.state;
  }

  /** Get a specific player. */
  getPlayer(characterId: string): BattlePlayer | undefined {
    return this.state.players[characterId];
  }

  /** Get the character whose turn it is. */
  getCurrentTurnCharacterId(): string {
    return this.state.turnOrder[this.state.currentTurnIndex];
  }

  // ── Player mutations ──────────────────────────────────────────

  updatePlayerMomentum(characterId: string, momentum: MomentumState): void {
    if (!this.state.players[characterId]) return;
    this.state.players[characterId] = {
      ...this.state.players[characterId],
      momentum,
    };
  }

  updatePlayerPsychology(characterId: string, psychology: PsychologicalState): void {
    if (!this.state.players[characterId]) return;
    this.state.players[characterId] = {
      ...this.state.players[characterId],
      psychology,
    };
  }

  updatePlayerCharge(characterId: string, charge: ChargeState): void {
    if (!this.state.players[characterId]) return;
    this.state.players[characterId] = {
      ...this.state.players[characterId],
      charge,
    };
  }

  updatePlayerPenalty(characterId: string, penalty: number): void {
    if (!this.state.players[characterId]) return;
    this.state.players[characterId] = {
      ...this.state.players[characterId],
      statPenalty: penalty,
    };
  }

  useConcentration(characterId: string): boolean {
    const player = this.state.players[characterId];
    if (!player || player.concentrationUsesLeft <= 0) return false;
    this.state.players[characterId] = {
      ...player,
      concentrationUsesLeft: player.concentrationUsesLeft - 1,
    };
    return true;
  }

  incrementHighForceTurns(characterId: string): void {
    const player = this.state.players[characterId];
    if (!player) return;
    this.state.players[characterId] = {
      ...player,
      consecutiveHighForceTurns: player.consecutiveHighForceTurns + 1,
    };
  }

  resetHighForceTurns(characterId: string): void {
    const player = this.state.players[characterId];
    if (!player) return;
    this.state.players[characterId] = {
      ...player,
      consecutiveHighForceTurns: 0,
    };
  }

  // ── Turn management ───────────────────────────────────────────

  advanceTurn(): void {
    const currentCharId = this.getCurrentTurnCharacterId();

    this.eventBus.emit('onTurnEnd', {
      characterId: currentCharId,
      turnNumber: this.state.turnNumber,
      battleId: this.state.battleId,
    });

    this.state.currentTurnIndex =
      (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;

    if (this.state.currentTurnIndex === 0) {
      this.state.turnNumber++;
    }

    const nextCharId = this.getCurrentTurnCharacterId();
    this.eventBus.emit('onTurnStart', {
      characterId: nextCharId,
      turnNumber: this.state.turnNumber,
      battleId: this.state.battleId,
    });
  }

  // ── Distance ──────────────────────────────────────────────────

  updateDistance(newDistance: DistanceState): void {
    this.state.distance = newDistance;
  }

  // ── Constructs ────────────────────────────────────────────────

  addConstruct(construct: Construct): void {
    this.state.constructs[construct.id] = construct;
    this.eventBus.emit('onConstructCreated', {
      creatorId: construct.creatorId,
      construct,
    });
  }

  removeConstruct(constructId: string, destroyedBy: string): void {
    const construct = this.state.constructs[constructId];
    if (!construct) return;
    delete this.state.constructs[constructId];
    this.eventBus.emit('onConstructDestroyed', {
      constructId,
      creatorId: construct.creatorId,
      destroyedBy,
    });
  }

  updateConstructDurability(constructId: string, newDurability: number): void {
    const construct = this.state.constructs[constructId];
    if (!construct) return;
    if (newDurability <= 0) {
      this.removeConstruct(constructId, 'damage');
    } else {
      this.state.constructs[constructId] = { ...construct, currentDurability: newDurability };
    }
  }

  // ── Effects ───────────────────────────────────────────────────

  setActiveEffects(effects: ActiveBattlefieldEffect[]): void {
    this.state.activeEffects = effects;
  }

  // ── Narrator context ──────────────────────────────────────────

  addNarratorContext(line: string): void {
    this.state.narratorContext.push(line);
  }

  clearNarratorContext(): void {
    this.state.narratorContext = [];
  }

  getNarratorContext(): string {
    return this.state.narratorContext.join('\n');
  }

  // ── Battle log ────────────────────────────────────────────────

  addBattleLog(characterId: string, summary: string): void {
    this.state.battleLog.push({
      turnNumber: this.state.turnNumber,
      characterId,
      summary,
      timestamp: Date.now(),
    });
    // Keep last 50 entries for context window
    if (this.state.battleLog.length > 50) {
      this.state.battleLog = this.state.battleLog.slice(-50);
    }
  }

  // ── Battle end ────────────────────────────────────────────────

  endBattle(winnerId: string | null, loserId: string | null, reason: string): void {
    this.state.status = 'completed';
    this.state.winnerId = winnerId;
    this.state.loserId = loserId;
    this.eventBus.emit('onBattleEnd', {
      battleId: this.state.battleId,
      winnerId,
      loserId,
      reason,
    });
  }
}
