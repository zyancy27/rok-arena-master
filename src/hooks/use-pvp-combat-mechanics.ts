import { useState, useCallback } from 'react';
import {
  createMomentumState,
  applyMomentumEvents,
  detectMomentumEvents,
  tickEdgeState,
  getMomentumContext,
  type MomentumState,
} from '@/lib/battle-momentum';
import {
  createPsychologicalState,
  applyPsychEvent,
  detectPsychEvents,
  getDominantPsychCue,
  getRiskChanceModifier,
  getAccuracyModifier,
  getPsychologyContext,
  type PsychologicalState,
} from '@/lib/battle-psychology';
import {
  resolveOvercharge,
  getOverchargeContext,
} from '@/lib/battle-overcharge';
import {
  createChargeState,
  detectChargeInitiation,
  initiateCharge,
  validateChargeAction,
  tickChargeTurn,
  checkChargeInterruption,
  interruptCharge,
  resolveChargeAttack,
  completeCharge,
  tickChargeCooldown,
  getChargeContext,
  getChargeDefenseMultiplier,
  checkChargeRisk,
  type ChargeState,
} from '@/lib/battle-charge';
import {
  evaluateThreat,
  isPerceptionNotable,
  type PerceptionResult,
} from '@/lib/battle-perception';
import {
  detectDirectInteraction,
  getHitDetectionContext,
  type HitDetectionResult,
} from '@/lib/battle-hit-detection';
import {
  getActiveArenaModifiers,
  type ActiveArenaModifiers,
} from '@/lib/arena-modifiers';
import type { CharacterStats } from '@/lib/character-stats';
import type { HitDetermination } from '@/lib/battle-dice';

interface CombatMechanicsConfig {
  enabled: boolean;
  userCharacterLevel: number;
  userCharacterName: string;
  battleLocation: string | null;
}

export interface CombatMechanicsState {
  // Momentum
  userMomentum: MomentumState;
  // Psychology
  userPsych: PsychologicalState;
  // Overcharge
  overchargeEnabled: boolean;
  setOverchargeEnabled: (v: boolean) => void;
  // Charge attacks
  chargeState: ChargeState;
  // Arena modifiers
  arenaModifiers: ActiveArenaModifiers | null;
  // Perception (last result from opponent's action)
  lastPerception: PerceptionResult | null;
  // Hit detection (last result from user's action)
  lastHitDetection: HitDetectionResult | null;
}

export interface CombatMechanicsActions {
  /** Process user's outgoing RP action — returns charge context string for OOC and whether the action is blocked */
  processUserAction: (
    actionText: string,
    userStats: CharacterStats,
    userLevel: number,
    skillStat: number,
  ) => {
    chargeContext: string;
    blocked: boolean;
    blockReason?: string;
    hitDetection: HitDetectionResult | undefined;
    overchargeResult: string;
  };

  /** Process incoming opponent RP message — update psych, momentum, perception */
  processOpponentAction: (
    actionText: string,
    opponentName: string,
    defenderStats: CharacterStats,
    defenderLevel: number,
    hitLanded: boolean,
  ) => void;

  /** Apply dice roll results to momentum/psych */
  applyDiceResults: (hit: HitDetermination, isUserAttacker: boolean) => void;

  /** Reset all mechanics */
  reset: () => void;
}

export function usePvPCombatMechanics(config: CombatMechanicsConfig): CombatMechanicsState & CombatMechanicsActions {
  const { enabled, userCharacterLevel, userCharacterName, battleLocation } = config;

  // Momentum
  const [userMomentum, setUserMomentum] = useState<MomentumState>(createMomentumState());

  // Psychology
  const [userPsych, setUserPsych] = useState<PsychologicalState>(createPsychologicalState());

  // Overcharge
  const [overchargeEnabled, setOverchargeEnabled] = useState(false);

  // Charge attacks
  const [chargeState, setChargeState] = useState<ChargeState>(createChargeState());

  // Arena modifiers
  const [arenaModifiers] = useState<ActiveArenaModifiers | null>(() => {
    if (!enabled) return null;
    return getActiveArenaModifiers();
  });

  // Perception
  const [lastPerception, setLastPerception] = useState<PerceptionResult | null>(null);

  // Hit detection
  const [lastHitDetection, setLastHitDetection] = useState<HitDetectionResult | null>(null);

  const processUserAction = useCallback((
    actionText: string,
    userStats: CharacterStats,
    userLevel: number,
    skillStat: number,
  ) => {
    let chargeContext = '';
    let blocked = false;
    let blockReason: string | undefined;

    // Hit detection
    const hitDetection = enabled ? detectDirectInteraction(actionText) : undefined;
    if (hitDetection?.detected) {
      setLastHitDetection(hitDetection);
    }

    // Overcharge resolution
    let overchargeResult = '';
    if (enabled && overchargeEnabled) {
      const riskMod = getRiskChanceModifier(userPsych);
      const result = resolveOvercharge(true, riskMod, userMomentum.edgeStateActive);
      overchargeResult = getOverchargeContext(result, userCharacterName);

      if (result.riskOccurred) {
        setUserPsych(prev => applyPsychEvent(prev, 'overcharge_fail'));
        setUserMomentum(prev => applyMomentumEvents(prev, [{ type: 'loss', amount: 25, reason: 'Risk misfire' }]));
      } else {
        setUserPsych(prev => applyPsychEvent(prev, 'overcharge_success'));
      }
      setOverchargeEnabled(false);
    }

    // Charge attack handling
    if (enabled) {
      if (chargeState.isCharging) {
        const validation = validateChargeAction(actionText);
        if (!validation.allowed) {
          blocked = true;
          blockReason = validation.reason;
        }

        const ticked = tickChargeTurn(chargeState, skillStat);

        if (ticked.chargeTurnsRemaining <= 0) {
          const chargeResult = resolveChargeAttack(
            ticked, userLevel, skillStat,
            userMomentum.value, userPsych.resolve, userPsych.fear,
          );
          setUserMomentum(prev => applyMomentumEvents(prev, [
            { type: 'gain', amount: chargeResult.momentumBonus, reason: 'Charge attack completed' },
          ], userPsych.fear, userPsych.resolve));
          setChargeState(completeCharge(ticked));
          chargeContext = `⚡ Charge released at x${chargeResult.finalMultiplier.toFixed(1)} power!`;
        } else {
          setChargeState(ticked);
          chargeContext = `⚡ Charging... ${ticked.chargeTurnsRemaining} turns remaining`;
        }
      } else if (!chargeState.isCharging && chargeState.cooldownTurnsRemaining <= 0) {
        const detection = detectChargeInitiation(actionText);
        if (detection.isCharging) {
          const newCharge = initiateCharge(chargeState, detection.requestedTurns, userLevel);
          setChargeState(newCharge);
          chargeContext = `⚡ Charging! ${newCharge.totalChargeTurns} turns — defend only!`;
        }
      }

      if (chargeState.cooldownTurnsRemaining > 0 && !chargeState.isCharging) {
        setChargeState(prev => tickChargeCooldown(prev));
      }
    }

    // Tick momentum edge state
    if (enabled) {
      setUserMomentum(prev => tickEdgeState(prev));
    }

    return { chargeContext, blocked, blockReason, hitDetection, overchargeResult };
  }, [enabled, overchargeEnabled, chargeState, userMomentum, userPsych, userCharacterName]);

  const processOpponentAction = useCallback((
    actionText: string,
    opponentName: string,
    defenderStats: CharacterStats,
    defenderLevel: number,
    hitLanded: boolean,
  ) => {
    if (!enabled) return;

    // Perception evaluation
    const perception = evaluateThreat(defenderStats, defenderLevel, actionText, 1.0, 0);
    if (isPerceptionNotable(perception)) {
      setLastPerception(perception);
    }

    // Psychology from taking a hit
    if (hitLanded) {
      setUserPsych(prev => applyPsychEvent(prev, 'hit_received'));
    }

    // Detect psych events from opponent's action (from opponent's perspective)
    const psychEvents = detectPsychEvents(actionText, true);
    for (const evt of psychEvents) {
      setUserPsych(prev => applyPsychEvent(prev, evt));
    }

    // Check charge interruption
    if (hitLanded && chargeState.isCharging) {
      const interruptCheck = checkChargeInterruption(
        chargeState, 5, userPsych.resolve, userPsych.fear,
        userMomentum.value, userMomentum.edgeStateActive,
      );
      if (interruptCheck.interrupted) {
        setChargeState(interruptCharge(chargeState));
        setUserMomentum(prev => applyMomentumEvents(prev, [
          { type: 'loss', amount: Math.round(userMomentum.value / 2), reason: 'Charge interrupted' },
        ], userPsych.fear, userPsych.resolve));
      }
    }
  }, [enabled, chargeState, userMomentum, userPsych]);

  const applyDiceResults = useCallback((hit: HitDetermination, isUserAttacker: boolean) => {
    if (!enabled) return;

    if (isUserAttacker) {
      // User attacked
      const events = detectMomentumEvents('', true, hit.wouldHit, false, false);
      if (events.length > 0) {
        setUserMomentum(prev => applyMomentumEvents(prev, events, userPsych.fear, userPsych.resolve));
      }
      if (hit.wouldHit) {
        setUserPsych(prev => applyPsychEvent(prev, 'hit_landed'));
      } else {
        setUserPsych(prev => applyPsychEvent(prev, 'dodge_fail'));
      }
    } else {
      // User was attacked
      if (hit.wouldHit) {
        setUserPsych(prev => applyPsychEvent(prev, 'hit_received'));
        setUserMomentum(prev => applyMomentumEvents(prev, [
          { type: 'loss', amount: 10, reason: 'Took hit' },
        ], userPsych.fear, userPsych.resolve));
      } else {
        setUserPsych(prev => applyPsychEvent(prev, 'dodge_success'));
        setUserMomentum(prev => applyMomentumEvents(prev, [
          { type: 'gain', amount: 8, reason: 'Dodged attack' },
        ], userPsych.fear, userPsych.resolve));
      }
    }
  }, [enabled, userPsych]);

  const reset = useCallback(() => {
    setUserMomentum(createMomentumState());
    setUserPsych(createPsychologicalState());
    setOverchargeEnabled(false);
    setChargeState(createChargeState());
    setLastPerception(null);
    setLastHitDetection(null);
  }, []);

  return {
    userMomentum,
    userPsych,
    overchargeEnabled,
    setOverchargeEnabled,
    chargeState,
    arenaModifiers,
    lastPerception,
    lastHitDetection,
    processUserAction,
    processOpponentAction,
    applyDiceResults,
    reset,
  };
}
