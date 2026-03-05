export { interpretMove } from './interpretMove';
export type { MoveIntent, ActionType, IntentCategory, Posture, Targeting } from './interpretMove';

export { classifyAction } from './classifyAction';
export type { CombatAction } from './classifyAction';

export { detectTargets } from './detectTargets';
export type { TargetResult } from './detectTargets';

export { detectEnvironmentInteraction } from './detectEnvironmentInteraction';
export type { EnvironmentInteraction } from './detectEnvironmentInteraction';

export { detectChargeInitiation, createChargeState } from './detectChargeAttack';
export type { ChargeState, ChargeResult } from './detectChargeAttack';
