/**
 * Combat Resolver — Unified Combat Engine
 *
 * The single entry point for resolving any combat action across all modes.
 *
 * Pipeline:
 *   1. Intent Interpretation (already done by caller via classifyAction)
 *   2. Hard Clamp enforcement
 *   3. Dice resolution (attack/defense)
 *   4. Modifier application (skill, perception, psychology, overcharge)
 *   5. Result event emission
 *   6. Narrator context generation
 *
 * All combat modes (PvP, PvPvP, PvE, EvE, Campaign) call this resolver.
 */

import type { CombatResolutionInput, CombatResolutionResult } from './combatTypes';
import type { BattleStateManager } from '../state/BattleStateManager';
import type { BattleEventBus } from '../events/eventBus';

import {
  determineHit,
  determineMentalHit,
  determineDefenseSuccess,
  CONCENTRATION_GAP_THRESHOLD,
} from '@/lib/battle-dice';
import type { DiceRollResult } from '@/lib/battle-dice';
import { resolveOvercharge, getOverchargeContext } from '@/lib/battle-overcharge';
import { evaluateThreat } from '@/lib/battle-perception';
import { getRiskChanceModifier } from '@/lib/battle-psychology';
import { generateClampContext } from '@/lib/hard-clamp';
import { getDamageLevel } from '@/lib/defense-validation';
import { getHitDetectionContext } from '@/lib/battle-hit-detection';

/**
 * Resolve a combat action through the full pipeline.
 *
 * Returns the resolution result with dice rolls, hit/miss, damage level,
 * and narrator context — but does NOT modify state or emit events.
 * The caller is responsible for applying results to state and emitting events.
 */
export function resolveCombat(
  input: CombatResolutionInput,
  stateManager: BattleStateManager,
): CombatResolutionResult {
  const { action, attackerId, defenderId, clampResult, overchargeActive } = input;
  const state = stateManager.getState();
  const narratorContext: string[] = [];
  const diceRolls: DiceRollResult[] = [];

  // ── Clamp context ──────────────────────────────────────────────
  const clampCtx = generateClampContext(clampResult);
  if (clampCtx) narratorContext.push(clampCtx);

  // ── Hit detection context ──────────────────────────────────────
  const hitDetCtx = getHitDetectionContext(action.hitDetection);
  if (hitDetCtx) narratorContext.push(hitDetCtx);

  // Default result (no combat)
  const noResult: CombatResolutionResult = {
    hitCheckPerformed: false,
    hitDetermination: null,
    didHit: null,
    damageLevel: null,
    diceRolls: [],
    overchargeResult: null,
    defenseCheckPerformed: false,
    defenseSuccess: null,
    narratorContext,
    concentrationAvailable: false,
    gap: 0,
  };

  // ── If no dice roll needed, return early ────────────────────────
  if (!action.requiresDiceRoll && !action.requiresDefenseCheck) {
    return noResult;
  }

  // ── Resolve overcharge ─────────────────────────────────────────
  let overchargeResult = null;
  if (overchargeActive && action.requiresDiceRoll) {
    const attacker = state.players[attackerId];
    const psychRiskMod = attacker ? getRiskChanceModifier(attacker.psychology) : 1.0;
    const edgeActive = attacker?.momentum.edgeStateActive ?? false;
    overchargeResult = resolveOvercharge(true, psychRiskMod, edgeActive);
    const ocCtx = getOverchargeContext(overchargeResult, attacker?.name ?? 'Attacker');
    if (ocCtx) narratorContext.push(ocCtx);
  }

  // ── Attack resolution ──────────────────────────────────────────
  if (action.requiresDiceRoll && defenderId) {
    const attacker = state.players[attackerId];
    const defender = state.players[defenderId];

    if (!attacker || !defender) return noResult;

    // Perception check
    const perception = evaluateThreat(
      defender.stats,
      defender.tier,
      action.rawText,
      1.0, // visibility (could come from environment)
      0,   // psych modifier
    );
    if (perception.narratorContext) narratorContext.push(perception.narratorContext);

    // Dice roll
    const usesSkill = action.intent.actionType === 'COUNTER' || action.intent.preparationIntent;
    const hitDetermination = action.isMental
      ? determineMentalHit(
          attacker.stats, attacker.tier,
          defender.stats, defender.tier,
          usesSkill, defender.statPenalty,
        )
      : determineHit(
          attacker.stats, attacker.tier,
          defender.stats, defender.tier,
          usesSkill, defender.statPenalty,
        );

    // Apply perception defense modifier
    if (perception.defenseModifier !== 0) {
      hitDetermination.defenseRoll.total += perception.defenseModifier;
      hitDetermination.gap = hitDetermination.attackRoll.total - hitDetermination.defenseRoll.total;
      hitDetermination.wouldHit = hitDetermination.gap > 0;
    }

    diceRolls.push(hitDetermination.attackRoll, hitDetermination.defenseRoll);

    const gap = hitDetermination.gap;
    const didHit = hitDetermination.wouldHit;
    const damageLevel = didHit ? getDamageLevel(Math.abs(gap)) : null;
    const concentrationAvailable = Math.abs(gap) <= CONCENTRATION_GAP_THRESHOLD;

    return {
      hitCheckPerformed: true,
      hitDetermination,
      didHit,
      damageLevel,
      diceRolls,
      overchargeResult,
      defenseCheckPerformed: false,
      defenseSuccess: null,
      narratorContext,
      concentrationAvailable,
      gap,
    };
  }

  // ── Defense resolution ─────────────────────────────────────────
  if (action.requiresDefenseCheck && defenderId === null) {
    // Defender is the actor (they are defending)
    const defender = state.players[attackerId];
    if (!defender) return noResult;

    // Find opponent (first other player)
    const opponentId = state.turnOrder.find(id => id !== attackerId);
    const opponent = opponentId ? state.players[opponentId] : null;

    const defenseType = action.hitDetection.intent === 'dodge' ? 'dodge' : 'block';
    const defResult = determineDefenseSuccess(
      defender.stats, defender.tier,
      opponent?.stats ?? null, opponent?.tier ?? 3,
      defenseType,
      defender.statPenalty,
    );

    diceRolls.push(defResult.defenseRoll, defResult.incomingAttackPotency);

    return {
      hitCheckPerformed: false,
      hitDetermination: null,
      didHit: null,
      damageLevel: null,
      diceRolls,
      overchargeResult: null,
      defenseCheckPerformed: true,
      defenseSuccess: defResult.defenseSuccess,
      narratorContext,
      concentrationAvailable: Math.abs(defResult.gap) <= CONCENTRATION_GAP_THRESHOLD,
      gap: defResult.gap,
    };
  }

  return noResult;
}

/**
 * After resolution, emit the appropriate events to the event bus.
 */
export function emitCombatEvents(
  input: CombatResolutionInput,
  result: CombatResolutionResult,
  eventBus: BattleEventBus,
): void {
  const { attackerId, defenderId, action } = input;

  // Emit intent resolved
  eventBus.emit('onIntentResolved', {
    characterId: attackerId,
    intent: action.intent,
    clampResult: input.clampResult,
  });

  // Emit attack
  if (result.hitCheckPerformed && result.hitDetermination && defenderId) {
    eventBus.emit('onAttack', {
      attackerId,
      defenderId,
      hitDetermination: result.hitDetermination,
      isMental: action.isMental,
      overcharge: result.overchargeResult,
    });

    if (result.didHit) {
      eventBus.emit('onHit', {
        attackerId,
        defenderId,
        gap: result.gap,
        damageLevel: result.damageLevel!,
        isMental: action.isMental,
      });
    } else {
      eventBus.emit('onMiss', {
        attackerId,
        defenderId,
        gap: result.gap,
        nearMiss: Math.abs(result.gap) <= CONCENTRATION_GAP_THRESHOLD,
      });
    }
  }

  // Emit defense
  if (result.defenseCheckPerformed) {
    eventBus.emit('onDefense', {
      defenderId: attackerId, // The actor is defending
      attackerId: defenderId ?? '',
      defenseType: action.hitDetection.intent === 'dodge' ? 'dodge' : 'block',
      success: result.defenseSuccess ?? false,
      gap: result.gap,
    });
  }

  // Emit ability used
  if (action.intent.detectedElements.length > 0) {
    eventBus.emit('onAbilityUsed', {
      characterId: attackerId,
      abilityType: action.interactionType,
      elements: action.intent.detectedElements,
      isMismatch: input.clampResult.elementMismatch,
    });
  }

  // Emit overcharge
  if (result.overchargeResult) {
    eventBus.emit('onOverchargeResolved', {
      characterId: attackerId,
      result: result.overchargeResult,
    });
  }
}
