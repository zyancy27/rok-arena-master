// Combat Engine — Public API

export { resolveCombat, emitCombatEvents } from './combatResolver';
export type { CombatResolutionInput, CombatResolutionResult, CombatMode } from './combatTypes';

export * from './diceSystem';
export * from './hitDetection';
export * from './skillModifiers';
export * from './environmentEffects';
export { getCurrentTurnContext, advanceTurn, calculateTurnOrder } from './turnManager';
export type { TurnContext } from './turnManager';
