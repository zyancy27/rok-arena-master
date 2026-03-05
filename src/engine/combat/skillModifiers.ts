/**
 * Skill Modifiers — Engine Wrapper
 *
 * Centralises skill proficiency, physics rules, and perception
 * into a single import for the combat engine.
 */

// Skill proficiency
export {
  getSkillProficiency,
  shouldTriggerSkillMishap,
  shouldTriggerCritical,
  generateSkillContext,
  getSkillBarColor,
} from '@/lib/battle-physics';
export type { SkillProficiencyEffect } from '@/lib/battle-physics';

// Physics rules
export {
  getPhysicsRulesForTier,
  generatePhysicsContext,
} from '@/lib/battle-physics';
export type { PhysicsRules } from '@/lib/battle-physics';

// Perception & threat processing
export {
  evaluatePerception,
  evaluateProcessing,
  evaluateThreat,
  isPerceptionNotable,
} from '@/lib/battle-perception';
export type { PerceptionResult, PerceptionLevel, ProcessingLevel } from '@/lib/battle-perception';

// Psychology
export {
  applyPsychEvent,
  detectPsychEvents,
  getRiskChanceModifier,
  getAccuracyModifier,
  getDominantPsychCue,
  getPsychologyContext,
  createPsychologicalState,
} from '@/lib/battle-psychology';
export type { PsychologicalState, PsychEvent, PsychCue } from '@/lib/battle-psychology';

// Momentum
export {
  detectMomentumEvents,
  applyMomentumEvents,
  tickEdgeState,
  getMomentumContext,
  createMomentumState,
  EDGE_STATE_PRECISION_BONUS,
  EDGE_STATE_RISK_REDUCTION,
} from '@/lib/battle-momentum';
export type { MomentumState, MomentumEvent } from '@/lib/battle-momentum';

// Overcharge
export {
  resolveOvercharge,
  getOverchargeContext,
} from '@/lib/battle-overcharge';
export type { OverchargeResult } from '@/lib/battle-overcharge';

// Hard clamp
export {
  applyHardClamp,
  generateClampContext,
} from '@/lib/hard-clamp';
export type { ClampResult, CharacterProfile } from '@/lib/hard-clamp';
