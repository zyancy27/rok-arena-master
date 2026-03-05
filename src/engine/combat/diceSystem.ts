/**
 * Dice System — Engine Wrapper
 *
 * Centralised access to all dice mechanics.
 * Re-exports from the existing battle-dice module.
 */

export {
  rollAttackDice,
  rollDefenseDice,
  rollMentalAttackDice,
  rollMentalDefenseDice,
  determineHit,
  determineMentalHit,
  determineDefenseSuccess,
  useConcentration,
  useOffensiveConcentration,
  calculateCounterSkillBonus,
  formatDiceRoll,
  CONCENTRATION_GAP_THRESHOLD,
} from '@/lib/battle-dice';

export type {
  DiceRollResult,
  HitDetermination,
  ConcentrationResult,
  OffensiveConcentrationResult,
  DefenseDetermination,
} from '@/lib/battle-dice';
