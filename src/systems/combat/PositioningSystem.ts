import { detectMovementInAction, isAttackValidForDistance, updateDistance, type DistanceState, type DistanceZone } from '@/lib/battle-dice';
import type { Intent } from '@/systems/intent/IntentEngine';
import { fromDistanceZone, getRangeMeters, pairKey, toDistanceZone, type CombatState, type RangeBand } from './CombatState';

export interface PositioningResolution {
  currentRange: RangeBand;
  resolvedRange: RangeBand;
  currentZone: DistanceZone;
  resolvedZone: DistanceZone;
  meters: number;
  movementApplied: boolean;
  movementRequired: boolean;
  actionPossible: boolean;
  distanceDelta: number;
  reason?: string;
}

const MELEE_PATTERNS = /\b(punch|kick|grab|grapple|slam|stab|slash|claw|headbutt|elbow|knee|bite|tackle)\b/i;
const REACH_PATTERNS = /\b(spear|staff|whip|chain|polearm|halberd|extend|reach)\b/i;
const RANGED_PATTERNS = /\b(shoot|fire|arrow|gun|rifle|beam|blast|throw|launch|snipe|projectile|ranged)\b/i;

function getDistanceState(state: CombatState, actorId: string, targetId?: string | null): DistanceState {
  const key = targetId ? pairKey(actorId, targetId) : null;
  const snapshot = key ? state.distances[key] : null;
  const zone = (snapshot?.zoneLabel ? toDistanceZone(snapshot.range) : 'mid') as DistanceZone;
  return {
    currentZone: zone,
    estimatedMeters: snapshot?.meters ?? getRangeMeters(snapshot?.range ?? 'mid'),
    lastMovement: 'none',
  };
}

function isMeleeIntent(intent: Intent) {
  return MELEE_PATTERNS.test(intent.rawText) || intent.subType === 'melee';
}

function isReachIntent(intent: Intent) {
  return REACH_PATTERNS.test(intent.rawText) || intent.tool ? REACH_PATTERNS.test(intent.tool ?? '') : false;
}

function isRangedIntent(intent: Intent) {
  return RANGED_PATTERNS.test(intent.rawText) || intent.subType === 'ranged';
}

export const PositioningSystem = {
  evaluate(intent: Intent, state: CombatState, actorId: string, targetId?: string | null): PositioningResolution {
    const initialDistance = getDistanceState(state, actorId, targetId);
    const movement = detectMovementInAction(intent.rawText);
    const afterMovement = movement.movement === 'none'
      ? initialDistance
      : updateDistance(initialDistance, movement.suggestedZoneChange);

    const currentRange = fromDistanceZone(initialDistance.currentZone);
    const resolvedRange = fromDistanceZone(afterMovement.currentZone);
    const baseValidity = isAttackValidForDistance(intent.rawText, afterMovement.currentZone);
    const meleeIntent = isMeleeIntent(intent);
    const rangedIntent = isRangedIntent(intent);
    const reachIntent = isReachIntent(intent);

    let actionPossible = baseValidity.valid;
    let movementRequired = false;
    let reason = baseValidity.warning ?? undefined;

    if (intent.isCombatAction && meleeIntent) {
      if (resolvedRange === 'far') {
        actionPossible = false;
        movementRequired = true;
        reason = 'Target is too far away for a melee strike.';
      } else if (resolvedRange === 'mid' && !reachIntent) {
        actionPossible = false;
        movementRequired = true;
        reason = 'Mid range requires a reach weapon or a closing movement before melee can land.';
      }
    }

    if (intent.isCombatAction && !meleeIntent && !rangedIntent && resolvedRange === 'far') {
      actionPossible = false;
      movementRequired = true;
      reason = 'This action needs positional commitment before it can resolve cleanly.';
    }

    if (intent.isCombatAction && rangedIntent && resolvedRange === 'close' && !movementRequired) {
      reason = 'Ranged attack is being released under close pressure.';
    }

    return {
      currentRange,
      resolvedRange,
      currentZone: initialDistance.currentZone,
      resolvedZone: afterMovement.currentZone,
      meters: afterMovement.estimatedMeters,
      movementApplied: movement.movement !== 'none',
      movementRequired,
      actionPossible,
      distanceDelta: movement.suggestedZoneChange,
      reason,
    };
  },
};
