/**
 * R.O.K. Combat Engine — Top-Level API
 *
 * This is the single import point for the entire combat engine.
 * All combat modes (PvP, PvPvP, PvE, EvE, Campaign) use this engine.
 */

// ─── Combat Engine ──────────────────────────────────────────────
export { resolveCombat, emitCombatEvents } from './combat/combatResolver';
export type { CombatResolutionInput, CombatResolutionResult, CombatMode } from './combat/combatTypes';

// ─── Intent Layer ───────────────────────────────────────────────
export { classifyAction } from './intent/classifyAction';
export type { CombatAction } from './intent/classifyAction';
export { detectTargets } from './intent/detectTargets';
export { detectEnvironmentInteraction } from './intent/detectEnvironmentInteraction';

// ─── Rule Engine ────────────────────────────────────────────────
export { evaluateRules, aggregateRuleResults, DEFAULT_COMBAT_RULES } from './rules';
export type { CombatRule, RuleContext, RuleResult } from './rules';

// ─── Event Bus ──────────────────────────────────────────────────
export { BattleEventBus, createBattleEventBus } from './events';
export type { BattleEventMap, BattleEventType } from './events';

// ─── State Management ───────────────────────────────────────────
export { BattleStateManager, createBattleState } from './state';
export type { CentralBattleState, BattlePlayer, CreateBattleOptions } from './state';

// ─── Environment ────────────────────────────────────────────────
export { generateEnvironment, triggerBattleHazard, getHazardNarratorPrompt } from './environment';
export type { GeneratedEnvironment, EnvironmentGeneratorOptions } from './environment';

// ─── Scenario Brain (Procedural Intelligence) ──────────────────
export { ScenarioBrain, createScenarioBrain } from './scenarioBrain';
export type { ComposedScenario, ScenarioContext, ScenarioFingerprint } from './scenarioBrain';

// ─── Chat Effect Brain (Dynamic Visual Effects) ────────────────
export { ChatEffectBrain, createChatEffectBrain } from './chatEffects';
export type { ComposedChatEffect, EffectCompositionResult, ChatEffect } from './chatEffects';

// ─── BiomeComposer (Procedural Arena Generation) ────────────────
export { composeBiomeScene, detectBiome, analyzeDensity } from './biomeComposer';
export type { BiomeScenePlan, BiomeComposerInput, BiomeIdentity } from './biomeComposer';

// ─── UrbanStructureComposer (Urban Environment Generation) ──────
export { composeUrbanScene, isUrbanScene } from './urbanComposer';
export type { UrbanScenePlan, UrbanComposerInput } from './urbanComposer';
