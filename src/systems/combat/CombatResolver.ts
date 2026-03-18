import { CONCENTRATION_GAP_THRESHOLD, determineDefenseSuccess, determineHit, determineMentalHit, type DefenseDetermination, type HitDetermination } from '@/lib/battle-dice';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';
import type { Intent } from '@/systems/intent/IntentEngine';
import type { ActionResult } from '@/systems/resolution/ActionResolver';
import { cloneCombatState, pairKey, type CombatState } from './CombatState';
import { DamageSystem, type DamageResult } from './DamageSystem';
import { EngagementSystem, type EngagementResolution } from './EngagementSystem';
import { PositioningSystem, type PositioningResolution } from './PositioningSystem';

export type CombatOutcome = 'hit' | 'partial_hit' | 'miss' | 'block' | 'dodge' | 'interrupt';

export interface StructuredCombatResult {
  outcome: CombatOutcome;
  success: boolean;
  timing: {
    actorSpeed: number;
    targetSpeed: number;
    speedAdvantage: number;
    initiative: 'actor' | 'target' | 'even';
  };
  positioning: PositioningResolution;
  engagement: EngagementResolution;
  damage: DamageResult | null;
  updatedState: CombatState;
  hitDetermination: HitDetermination | null;
  defenseDetermination: DefenseDetermination | null;
  diceMetadata: Record<string, unknown> | null;
  narratorDiceContext: Record<string, unknown> | null;
  impact: string;
  consequences: string[];
  concentrationAvailable: boolean;
  gap: number;
}

export interface CombatResolverOptions {
  actorId: string;
  targetId?: string | null;
  targetContext?: ResolvedCharacterContext | null;
  defenderPenalty?: number;
}

const DEFENSIVE_PATTERNS = /\b(block|guard|parry|deflect|dodge|evade|sidestep|roll away|duck)\b/i;
const DODGE_PATTERNS = /\b(dodge|evade|sidestep|roll away|duck)\b/i;
const MENTAL_PATTERNS = /\b(mental|mind|psychic|telepath|illusion|fear|memory)\b/i;

function toCombatOutcome(hit: HitDetermination, target: ResolvedCharacterContext | null): CombatOutcome {
  if (hit.wouldHit) {
    return hit.gap <= 3 ? 'partial_hit' : 'hit';
  }

  if (!target) return 'miss';
  if (target.stats.stat_speed >= target.stats.stat_durability + 8) return 'dodge';
  if (target.stats.stat_durability >= target.stats.stat_speed + 8) return 'block';
  return 'miss';
}

function buildImpact(intent: Intent, result: StructuredCombatResult) {
  const targetLabel = intent.target ? ` on ${intent.target}` : '';

  if (result.outcome === 'interrupt') return `The action is interrupted before it fully develops${targetLabel}.`;
  if (result.outcome === 'block') return `The attack is absorbed or redirected${targetLabel}.`;
  if (result.outcome === 'dodge') return `The target slips the line of attack${targetLabel}.`;
  if (result.outcome === 'miss') return `The action misses cleanly${targetLabel}.`;
  if (result.outcome === 'partial_hit') return `The strike lands only partially${targetLabel}.`;
  return `The action connects decisively${targetLabel}.`;
}

function deriveConsequences(result: StructuredCombatResult): string[] {
  const consequences: string[] = [];

  if (result.positioning.movementApplied) {
    consequences.push(`Range shifts to ${result.positioning.resolvedRange}.`);
  }
  if (result.engagement.engaged) {
    consequences.push('Combatants remain engaged and movement stays contested.');
  }
  if (result.engagement.interceptionTriggered) {
    consequences.push('A disengage attempt exposes an interception window.');
  }
  if (result.damage) {
    consequences.push(`${result.damage.damageType} damage ${result.damage.severity} (${result.damage.amount}).`);
    if (result.damage.effects.length > 0) {
      consequences.push(`Applies ${result.damage.effects.map(effect => effect.type).join(', ')}.`);
    }
  }
  if (!result.positioning.actionPossible && result.positioning.reason) {
    consequences.push(result.positioning.reason);
  }

  return consequences;
}

export function toActionResult(result: StructuredCombatResult): ActionResult {
  const effectivenessBase = result.damage?.amount ?? (result.outcome === 'hit' ? 75 : result.outcome === 'partial_hit' ? 58 : result.outcome === 'block' || result.outcome === 'dodge' ? 42 : 25);

  return {
    success: result.success,
    effectiveness: Math.max(0, Math.min(100, Math.round(effectivenessBase + result.timing.speedAdvantage * 0.4))),
    impact: result.impact,
    consequences: result.consequences,
  };
}

export function formatCombatResolutionForNarrator(intent: Intent, result: StructuredCombatResult, rawText?: string) {
  const details = [
    `intent=${intent.type}`,
    intent.target ? `target=${intent.target}` : null,
    `outcome=${result.outcome}`,
    `success=${result.success}`,
    `range=${result.positioning.currentRange}->${result.positioning.resolvedRange}`,
    `movement=${result.positioning.movementApplied}`,
    `engaged=${result.engagement.engaged}`,
    `initiative=${result.timing.initiative}`,
    `speedAdvantage=${result.timing.speedAdvantage}`,
    result.damage ? `damage=${result.damage.amount}` : null,
    result.damage?.severity ? `severity=${result.damage.severity}` : null,
    result.damage?.effects.length ? `effects=${result.damage.effects.map(effect => effect.type).join(',')}` : null,
    rawText ? `rawTextReference=${rawText}` : null,
  ].filter(Boolean);

  return details.join(' | ');
}

export const CombatResolver = {
  resolve(intent: Intent, actorContext: ResolvedCharacterContext, combatState: CombatState, options: CombatResolverOptions): StructuredCombatResult {
    const workingState = cloneCombatState(combatState);
    const targetId = options.targetId ?? Object.keys(workingState.participants).find(id => id !== options.actorId) ?? null;
    const targetContext = options.targetContext ?? (targetId ? null : null);
    const actorSpeed = actorContext.stats.stat_speed;
    const targetSpeed = targetContext?.stats.stat_speed ?? (targetId ? workingState.participants[targetId]?.stats.speed ?? 50 : 50);
    const speedAdvantage = actorSpeed - targetSpeed;
    const initiative = speedAdvantage > 8 ? 'actor' : speedAdvantage < -8 ? 'target' : 'even';
    const positioning = PositioningSystem.evaluate(intent, workingState, options.actorId, targetId);
    const engagement = EngagementSystem.evaluate(workingState, options.actorId, targetId, actorSpeed, targetSpeed, intent);
    const defensiveAction = DEFENSIVE_PATTERNS.test(intent.rawText) && !/\b(attack|strike|slash|stab|blast|shoot|punch|kick)\b/i.test(intent.rawText);
    const isMental = MENTAL_PATTERNS.test(intent.rawText);

    if ((engagement.interceptionTriggered || (!positioning.actionPossible && positioning.movementRequired)) && !defensiveAction) {
      const baseResult: StructuredCombatResult = {
        outcome: 'interrupt',
        success: false,
        timing: { actorSpeed, targetSpeed, speedAdvantage, initiative },
        positioning,
        engagement,
        damage: null,
        updatedState: workingState,
        hitDetermination: null,
        defenseDetermination: null,
        diceMetadata: null,
        narratorDiceContext: null,
        impact: 'Positioning and timing deny the action before it can land.',
        consequences: positioning.reason ? [positioning.reason] : ['Timing disadvantage creates an interrupt window.'],
        concentrationAvailable: false,
        gap: 0,
      };

      return baseResult;
    }

    let hitDetermination: HitDetermination | null = null;
    let defenseDetermination: DefenseDetermination | null = null;
    let outcome: CombatOutcome = 'miss';
    let gap = 0;
    let damage: DamageResult | null = null;
    let diceMetadata: Record<string, unknown> | null = null;
    let narratorDiceContext: Record<string, unknown> | null = null;

    if (defensiveAction) {
      const defenseType = DODGE_PATTERNS.test(intent.rawText) ? 'dodge' : 'block';
      defenseDetermination = determineDefenseSuccess(
        actorContext.stats,
        actorContext.tier,
        targetContext?.stats ?? null,
        targetContext?.tier ?? 1,
        defenseType,
        options.defenderPenalty ?? 0,
      );
      gap = defenseDetermination.gap;
      outcome = defenseDetermination.defenseSuccess ? defenseType : 'hit';
      diceMetadata = {
        type: 'defense',
        outcome,
        success: defenseDetermination.defenseSuccess,
        defenseRoll: defenseDetermination.defenseRoll,
        incomingRoll: defenseDetermination.incomingAttackPotency,
        gap,
        defenseType,
        range: positioning.resolvedRange,
      };
      narratorDiceContext = {
        defenseResult: {
          success: defenseDetermination.defenseSuccess,
          defenseTotal: defenseDetermination.defenseRoll.total,
          incomingTotal: defenseDetermination.incomingAttackPotency.total,
          gap,
          defenseType,
          outcome,
        },
      };
    } else if (targetContext) {
      hitDetermination = isMental
        ? determineMentalHit(actorContext.stats, actorContext.tier, targetContext.stats, targetContext.tier, true, options.defenderPenalty ?? 0)
        : determineHit(actorContext.stats, actorContext.tier, targetContext.stats, targetContext.tier, true, options.defenderPenalty ?? 0);
      gap = hitDetermination.gap;
      outcome = toCombatOutcome(hitDetermination, targetContext);
      damage = DamageSystem.calculate(intent, actorContext, targetContext, outcome, gap);
      diceMetadata = {
        type: 'attack',
        outcome,
        hit: outcome === 'hit' || outcome === 'partial_hit',
        attackRoll: hitDetermination.attackRoll,
        defenseRoll: hitDetermination.defenseRoll,
        gap,
        isMental,
        range: positioning.resolvedRange,
        partial: outcome === 'partial_hit',
      };
      narratorDiceContext = {
        diceResult: {
          hit: outcome === 'hit' || outcome === 'partial_hit',
          partial: outcome === 'partial_hit',
          attackTotal: hitDetermination.attackRoll.total,
          defenseTotal: hitDetermination.defenseRoll.total,
          gap,
          isMental,
          outcome,
        },
      };
    }

    if (targetId && damage) {
      DamageSystem.apply(workingState, options.actorId, targetId, damage);
    } else {
      workingState.participants[options.actorId].stats.stamina = Math.max(
        0,
        workingState.participants[options.actorId].stats.stamina - Math.max(4, Math.round((intent.intensity ?? 50) / 12)),
      );
    }

    if (targetId) {
      EngagementSystem.apply(workingState, options.actorId, targetId, positioning, outcome);
    }

    if (targetId) {
      const distanceKey = pairKey(options.actorId, targetId);
      const distance = workingState.distances[distanceKey];
      if (distance) {
        distance.range = positioning.resolvedRange;
        distance.zoneLabel = positioning.resolvedZone;
        distance.meters = positioning.meters;
      }
      workingState.participants[options.actorId].position.range = positioning.resolvedRange;
      workingState.participants[options.actorId].position.meters = positioning.meters;
      if (workingState.participants[targetId]) {
        workingState.participants[targetId].position.range = positioning.resolvedRange;
        workingState.participants[targetId].position.meters = positioning.meters;
      }
    }

    const result: StructuredCombatResult = {
      outcome,
      success: outcome === 'hit' || outcome === 'partial_hit' || outcome === 'block' || outcome === 'dodge',
      timing: { actorSpeed, targetSpeed, speedAdvantage, initiative },
      positioning,
      engagement,
      damage,
      updatedState: workingState,
      hitDetermination,
      defenseDetermination,
      diceMetadata,
      narratorDiceContext,
      impact: '',
      consequences: [],
      concentrationAvailable: defensiveAction
        ? !defenseDetermination?.defenseSuccess && Math.abs(gap) <= CONCENTRATION_GAP_THRESHOLD
        : !!hitDetermination && !hitDetermination.wouldHit && Math.abs(gap) <= CONCENTRATION_GAP_THRESHOLD,
      gap,
    };

    result.impact = buildImpact(intent, result);
    result.consequences = deriveConsequences(result);
    return result;
  },
};
