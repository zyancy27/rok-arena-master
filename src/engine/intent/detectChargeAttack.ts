/**
 * Charge Attack Detection — Engine Wrapper
 *
 * Re-exports the existing charge detection system through the engine interface.
 */

export {
  detectChargeInitiation,
  initiateCharge,
  validateChargeAction,
  tickChargeTurn,
  checkChargeInterruption,
  interruptCharge,
  resolveChargeAttack,
  completeCharge,
  tickChargeCooldown,
  getChargeProgress,
  getChargeColorStage,
  getChargeContext,
  getChargeDodgePenalty,
  getChargeDefenseMultiplier,
  createChargeState,
} from '@/lib/battle-charge';

export type { ChargeState, ChargeResult } from '@/lib/battle-charge';
