/**
 * Narrative-Aware World Systems — Barrel Export
 *
 * Nine interconnected systems that generate environments and situations
 * to help players discover who their characters are through story.
 */

// ── Shared Types ────────────────────────────────────────────────
export type {
  BiomeToneTag,
  BiomeTransitionStep,
  BiomeTransitionPath,
  StressState,
  StructuralStressRecord,
  ClueCategory,
  EnvironmentalClue,
  DiscoveryPromptType,
  CharacterDiscoveryPrompt,
  EnvironmentChange,
  EnvironmentMemoryState,
  TrackedLandmark,
  SignaturePattern,
  CharacterSignatureProfile,
  DiscoveryRarity,
  DiscoveryMoment,
  EmotionalPressureState,
  EmotionalPressureMeter,
} from './types';

// ── System 1 — Biome Transition Engine ──────────────────────────
export {
  getTransitionTemplates,
  buildTransitionPath,
  suggestNextBiome,
  generateTransitionClues,
} from './biomeTransitionEngine';

// ── System 2 — Structural Stress Simulation ─────────────────────
export {
  createStressRecord,
  applyStress,
  applyEnvironmentalPressure,
  getNarratorDescription,
} from './structuralStressSimulation';
export type { StressUpdateResult } from './structuralStressSimulation';

// ── System 3 — Environmental Story Clues ────────────────────────
export {
  generateStoryClues,
  clueNarratorSummary,
} from './environmentalStoryClues';

// ── System 4 — Character Discovery Prompts ──────────────────────
export {
  generateDiscoveryPrompt,
  shouldGeneratePrompt,
} from './characterDiscoveryPrompts';

// ── System 5 — Environment Memory ───────────────────────────────
export {
  createEnvironmentMemory,
  recordChange,
  getZoneHistory,
  getPersistentChanges,
  buildNarratorMemoryContext,
  buildFullMemorySummary,
} from './environmentMemory';

// ── System 6 — Narrative Landmark Awareness ─────────────────────
export {
  createLandmarkRegistry,
  registerLandmark,
  referenceLandmark,
  destroyLandmark,
  getZoneLandmarks,
  getActiveLandmarks,
  buildLandmarkNarratorContext,
  findLandmarkByName,
} from './narrativeLandmarkAwareness';
export type { LandmarkRegistry } from './narrativeLandmarkAwareness';

// ── System 7 — Character Signature Interactions ─────────────────
export {
  createSignatureProfile,
  recordAction,
  analyzePlayerAction,
  getEnvironmentHint,
  getTopPatterns,
} from './characterSignatureInteractions';
export type { SignatureEnvironmentHint } from './characterSignatureInteractions';

// ── System 8 — Discovery Moments ────────────────────────────────
export {
  attemptDiscovery,
  forceDiscovery,
} from './discoveryMoments';

// ── System 9 — Emotional Environment Pressure ───────────────────
export {
  createPressureMeter,
  applyPressure,
  decayPressure,
  getStandardSource,
  applyStandardPressure,
} from './emotionalEnvironmentPressure';
export type { PressureUpdateResult, PressureSource } from './emotionalEnvironmentPressure';

// ── System 10 — Narrative Pressure Engine ───────────────────────
export {
  createPressureEngineState,
  shouldGeneratePressure,
  selectPressureType,
  generatePressureEvent,
  acknowledgePressureEvent,
  buildPressureNarratorContext,
  getAcknowledgedPressureEvents,
  buildPressureMemorySummary,
} from './narrativePressureEngine';
export type {
  NarrativePressureType,
  NarrativePressureEvent,
  PressureConditions,
  NarrativePressureState,
} from './narrativePressureEngine';

// ── System 11 — Character Discovery Sync ────────────────────────
export {
  createDiscoverySyncState,
  classifyField,
  formatDiscoveryEntry,
  discoverFromPressureResponse,
  discoverFromSignaturePattern,
  discoverFromMoment,
  discoverFromDialogue,
  getPendingDiscoveries,
  buildFieldUpdates,
  markSynced,
} from './characterDiscoverySync';
export type {
  DiscoverableField,
  CharacterDiscovery,
  DiscoverySource,
  DiscoverySyncState,
} from './characterDiscoverySync';

// ── System 12 — Character Echo System ───────────────────────────
export {
  createEchoMemory,
  recordEcho,
  findRelevantEcho,
  markEchoSurfaced,
  getCharacterEchoes,
  buildEchoNarratorContext,
} from './characterEchoSystem';
export type {
  EchoType,
  EchoFragment,
  EchoTriggerContext,
  EchoSurfaceResult,
  EchoMemoryState,
} from './characterEchoSystem';

// ── System 13 — Character Reflection Engine ─────────────────────
export {
  createReflectionState,
  shouldGenerateReflection,
  selectReflectionTrigger,
  generateReflection,
  answerReflection,
  getAnsweredReflections,
  buildReflectionNarratorContext,
} from './characterReflectionEngine';
export type {
  ReflectionTrigger,
  ReflectionPrompt,
  ReflectionConditions,
  ReflectionState,
} from './characterReflectionEngine';
