/**
 * ComprehensiveBattleBrain — Barrel Export
 *
 * Unified orchestration layer that connects all R.O.K. engine systems
 * into a single processing pipeline.
 */

// ─── Core Brain ─────────────────────────────────────────────────
export { ComprehensiveBattleBrain, createBattleBrain } from './ComprehensiveBattleBrain';

// ─── Types ──────────────────────────────────────────────────────
export type {
  BrainInput,
  BrainOutput,
  BattleBrainConfig,
  ContextMode,
  ActionClassification,
  StateMutation,
  UISignal,
  UISignalType,
  TraceEntry,
  CharacterNarrativeProfile,
  UnifiedContext,
  ActionContext,
  NarrativeContext,
  EnvironmentContext,
  CharacterContext,
  CampaignContext,
  BattleContext,
  UIContext,
  ResolverResult,
} from './battleBrainTypes';

// ─── Context Builder ────────────────────────────────────────────
export { buildUnifiedContext, classifyActionType } from './battleBrainContext';
export type { SubsystemStates } from './battleBrainContext';

// ─── Rules ──────────────────────────────────────────────────────
export { evaluateBrainRules, BRAIN_RULES } from './battleBrainRules';
export type { BrainRule, BrainRuleResult } from './battleBrainRules';

// ─── Resolvers ──────────────────────────────────────────────────
export { getActiveSubsystems, executeResolverChain } from './battleBrainResolvers';

// ─── Dispatcher ─────────────────────────────────────────────────
export { BattleBrainDispatcher, createBattleBrainDispatcher } from './battleBrainDispatcher';
export type { UISignalHandler } from './battleBrainDispatcher';

// ─── Sync Layer ─────────────────────────────────────────────────
export {
  getInvalidationSignals,
  detectContextMode,
  checkForStaleState,
} from './battleBrainSync';
export type {
  InvalidationCategory,
  InvalidationEvent,
  StaleStateCheck,
} from './battleBrainSync';
