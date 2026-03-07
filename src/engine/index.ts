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

// ─── NarratorTerrainMutationEngine (Dynamic Battlefield Mutation) ─
export {
  createMutationEngine,
  processMutationEvent,
  drainSceneInstructions,
  getEngineNarratorContext,
  isZoneCollapsed,
  getZoneDamageLevel,
} from '@/lib/map/mutation/NarratorTerrainMutationEngine';
export type {
  MutationEngineState,
  MutationEvent,
  MutationEngineOutput,
} from '@/lib/map/mutation/NarratorTerrainMutationEngine';
export type {
  TerrainMutation,
  MutationType,
  MutationIntensity,
  MutationCategory,
  MutationSource,
  MutationResult,
  SceneMutationInstruction,
  SceneMutationOp,
} from '@/lib/map/mutation/mutation-types';

// ─── Narrative-Aware World Systems ──────────────────────────────
export {
  // System 1 — Biome Transition Engine
  getTransitionTemplates, buildTransitionPath, suggestNextBiome, generateTransitionClues,
  // System 2 — Structural Stress Simulation
  createStressRecord, applyStress, applyEnvironmentalPressure, getNarratorDescription,
  // System 3 — Environmental Story Clues
  generateStoryClues, clueNarratorSummary,
  // System 4 — Character Discovery Prompts
  generateDiscoveryPrompt, shouldGeneratePrompt,
  // System 5 — Environment Memory
  createEnvironmentMemory, recordChange, getZoneHistory, getPersistentChanges,
  buildNarratorMemoryContext, buildFullMemorySummary,
  // System 6 — Narrative Landmark Awareness
  createLandmarkRegistry, registerLandmark, referenceLandmark, destroyLandmark,
  getZoneLandmarks, getActiveLandmarks, buildLandmarkNarratorContext, findLandmarkByName,
  // System 7 — Character Signature Interactions
  createSignatureProfile, recordAction, analyzePlayerAction, getEnvironmentHint, getTopPatterns,
  // System 8 — Discovery Moments
  attemptDiscovery, forceDiscovery,
  // System 9 — Emotional Environment Pressure
  createPressureMeter, applyPressure, decayPressure, getStandardSource, applyStandardPressure,
  // System 10 — Narrative Pressure Engine
  createPressureEngineState, shouldGeneratePressure, selectPressureType,
  generatePressureEvent, acknowledgePressureEvent, buildPressureNarratorContext,
  getAcknowledgedPressureEvents, buildPressureMemorySummary,
  // System 11 — Character Discovery Sync
  createDiscoverySyncState, classifyField, formatDiscoveryEntry,
  discoverFromPressureResponse, discoverFromSignaturePattern,
  discoverFromMoment, discoverFromDialogue,
  getPendingDiscoveries, buildFieldUpdates, markSynced,
} from './narrativeWorld';
export type {
  BiomeToneTag, BiomeTransitionStep, BiomeTransitionPath,
  StressState, StructuralStressRecord, StressUpdateResult,
  ClueCategory, EnvironmentalClue,
  DiscoveryPromptType, CharacterDiscoveryPrompt,
  EnvironmentChange, EnvironmentMemoryState,
  TrackedLandmark, LandmarkRegistry,
  SignaturePattern, CharacterSignatureProfile, SignatureEnvironmentHint,
  DiscoveryRarity, DiscoveryMoment,
  EmotionalPressureState, EmotionalPressureMeter, PressureUpdateResult, PressureSource,
  NarrativePressureType, NarrativePressureEvent, PressureConditions, NarrativePressureState,
  DiscoverableField, CharacterDiscovery, DiscoverySource, DiscoverySyncState,
} from './narrativeWorld';
