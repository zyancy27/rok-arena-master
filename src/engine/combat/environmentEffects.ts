/**
 * Environment Effects — Engine Wrapper
 *
 * Centralises all environment-related combat mechanics.
 */

// Battle environment context generation
export {
  generateBattleEnvironment,
  getApplicableHazards,
  generateHazardEventPrompt,
  shouldTriggerHazard,
  getEnvironmentStatImpact,
} from '@/lib/battle-environment';
export type { BattleEnvironment, EnvironmentalHazard } from '@/lib/battle-environment';

// Battlefield visual effects detection
export {
  detectBattlefieldEffects,
  isEffectActive,
  getEffectClassName,
  mergeEffects,
  shouldSuppressStatus,
  FIELD_EFFECT_PRIORITY,
  SUPPRESSION_MAP,
} from '@/lib/battlefield-effects';
export type { ActiveBattlefieldEffect, BattlefieldEffectType } from '@/lib/battlefield-effects';

// Move validation (element/ability checks)
export {
  validateMove,
  extractAbilityTypes,
  generateMatchupMessage,
  isMentalAttack,
  detectAreaDamage,
} from '@/lib/move-validation';
export type { MoveValidationResult, CharacterAbilities, AreaDamageWarning } from '@/lib/move-validation';

// Defense validation
export {
  validateDefense,
  generateDefenseEnforcementPrompt,
  getDamageLevel,
  isPurelyDefensive,
  acknowledgesDamage,
} from '@/lib/defense-validation';
export type { DefenseValidationResult } from '@/lib/defense-validation';
