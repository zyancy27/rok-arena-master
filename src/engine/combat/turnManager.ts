/**
 * Turn Manager
 *
 * Manages turn order, turn advancement, and per-turn bookkeeping.
 * Works with BattleStateManager to update state and emit events.
 */

import type { BattleStateManager } from '../state/BattleStateManager';
import type { BattleEventBus } from '../events/eventBus';
import { tickEdgeState } from '@/lib/battle-momentum';
import { tickChargeCooldown } from '@/lib/battle-charge';

export interface TurnContext {
  characterId: string;
  turnNumber: number;
  isFirstTurn: boolean;
  opponentIds: string[];
}

/**
 * Get the current turn context.
 */
export function getCurrentTurnContext(stateManager: BattleStateManager): TurnContext {
  const state = stateManager.getState();
  const characterId = stateManager.getCurrentTurnCharacterId();
  const opponentIds = state.turnOrder.filter(id => id !== characterId);

  return {
    characterId,
    turnNumber: state.turnNumber,
    isFirstTurn: state.turnNumber === 1 && state.currentTurnIndex === 0,
    opponentIds,
  };
}

/**
 * Perform end-of-turn bookkeeping and advance to next turn.
 *
 * - Ticks momentum edge state
 * - Ticks charge cooldown
 * - Resets stat penalties from previous turn
 * - Advances turn order
 */
export function advanceTurn(
  stateManager: BattleStateManager,
  eventBus: BattleEventBus,
): TurnContext {
  const state = stateManager.getState();
  const currentCharId = stateManager.getCurrentTurnCharacterId();
  const player = stateManager.getPlayer(currentCharId);

  if (player) {
    // Tick momentum edge state
    const newMomentum = tickEdgeState(player.momentum);
    stateManager.updatePlayerMomentum(currentCharId, newMomentum);

    // Tick charge cooldown
    if (player.charge.cooldownTurnsRemaining > 0) {
      const newCharge = tickChargeCooldown(player.charge);
      stateManager.updatePlayerCharge(currentCharId, newCharge);
    }
  }

  // Advance the turn
  stateManager.advanceTurn();

  // Return the new turn context
  return getCurrentTurnContext(stateManager);
}

/**
 * Determine turn order from character speed stats.
 * Higher speed = earlier turn.
 */
export function calculateTurnOrder(
  characters: Array<{ characterId: string; speedStat: number; tier: number }>,
): string[] {
  return characters
    .sort((a, b) => {
      // Primary: speed stat (higher = first)
      const speedDiff = b.speedStat - a.speedStat;
      if (speedDiff !== 0) return speedDiff;
      // Tiebreaker: tier (higher = first)
      return b.tier - a.tier;
    })
    .map(c => c.characterId);
}
