import type { Intent } from '@/systems/intent/IntentEngine';
import type { CombatEngagementState, CombatState } from './CombatState';
import type { PositioningResolution } from './PositioningSystem';

export interface EngagementResolution {
  engaged: boolean;
  restrictedMovement: boolean;
  disengaging: boolean;
  breakChance: number;
  interceptRisk: number;
  interceptionTriggered: boolean;
}

const DISENGAGE_PATTERNS = /\b(disengage|retreat|back away|fall back|step back|jump back|dash away|create distance|escape)\b/i;
const RANGED_UNDER_PRESSURE_PATTERNS = /\b(shoot|fire|aim|throw|cast|blast|beam|charge shot)\b/i;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function upsertEngagement(list: CombatEngagementState[], sourceId: string, targetId: string, locked: boolean, pressure: number) {
  const index = list.findIndex(item => item.sourceId === sourceId && item.targetId === targetId);
  const next = { sourceId, targetId, locked, pressure };
  if (index >= 0) {
    list[index] = next;
    return;
  }
  list.push(next);
}

export const EngagementSystem = {
  evaluate(state: CombatState, actorId: string, targetId: string | null | undefined, actorSpeed: number, targetSpeed: number, intent: Intent): EngagementResolution {
    const explicitEngagement = state.engagements.some(engagement =>
      (engagement.sourceId === actorId && engagement.targetId === targetId)
      || (engagement.sourceId === targetId && engagement.targetId === actorId),
    );
    const engaged = explicitEngagement || !!targetId && state.participants[actorId]?.engagedWith.includes(targetId);
    const disengaging = DISENGAGE_PATTERNS.test(intent.rawText);
    const underPressureRanged = engaged && RANGED_UNDER_PRESSURE_PATTERNS.test(intent.rawText);
    const restrictedMovement = engaged && (disengaging || intent.type === 'move' || underPressureRanged);
    const speedDelta = actorSpeed - targetSpeed;
    const breakChance = clamp(50 + speedDelta * 1.5 + ((intent.precision ?? 50) - 50) * 0.4);
    const interceptRisk = restrictedMovement ? clamp(60 - speedDelta * 1.2 + ((intent.riskLevel ?? 50) - 50) * 0.35) : 0;
    const interceptionTriggered = restrictedMovement && breakChance < interceptRisk;

    return {
      engaged,
      restrictedMovement,
      disengaging,
      breakChance,
      interceptRisk,
      interceptionTriggered,
    };
  },

  apply(state: CombatState, actorId: string, targetId: string | null | undefined, positioning: PositioningResolution, outcome: 'hit' | 'partial_hit' | 'miss' | 'block' | 'dodge' | 'interrupt') {
    if (!targetId || !state.participants[actorId] || !state.participants[targetId]) return state;

    if (positioning.resolvedRange === 'close' && outcome !== 'interrupt') {
      if (!state.participants[actorId].engagedWith.includes(targetId)) {
        state.participants[actorId].engagedWith.push(targetId);
      }
      if (!state.participants[targetId].engagedWith.includes(actorId)) {
        state.participants[targetId].engagedWith.push(actorId);
      }
      upsertEngagement(state.engagements, actorId, targetId, true, 70);
      upsertEngagement(state.engagements, targetId, actorId, true, 70);
      return state;
    }

    if (positioning.resolvedRange === 'far') {
      state.participants[actorId].engagedWith = state.participants[actorId].engagedWith.filter(id => id !== targetId);
      state.participants[targetId].engagedWith = state.participants[targetId].engagedWith.filter(id => id !== actorId);
      state.engagements = state.engagements.filter(engagement =>
        !((engagement.sourceId === actorId && engagement.targetId === targetId)
        || (engagement.sourceId === targetId && engagement.targetId === actorId)),
      );
    }

    return state;
  },
};
