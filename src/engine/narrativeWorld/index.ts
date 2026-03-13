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

// ── System 14 — Character Conscience System ─────────────────────
export {
  createConscienceState,
  evaluateConscience,
  resolveConsciencePrompt,
  getResolvedPrompts,
  getPendingConsciencePrompts,
  buildConscienceNarratorContext,
  buildConscienceMentalityNote,
  buildConscienceMemorySummary,
} from './characterConscienceSystem';
export type {
  DeviationType,
  ConsciencePrompt,
  ConscienceContext,
  ConscienceState,
} from './characterConscienceSystem';

// ── System 15 — Story Gravity Engine ────────────────────────────
export {
  createStoryGravity,
  ingestFromSignature,
  ingestFromPressure,
  ingestFromEcho,
  ingestFromReflection,
  ingestFromDialogue,
  evaluateGravity,
  getGravityInfluences,
  applyGravityBias,
  checkWorldAcknowledgement,
  buildGravityNarratorContext,
  buildGravitySummary,
} from './storyGravityEngine';
export type {
  StoryTheme,
  ThemeEvolution,
  ThemeWeight,
  StoryGravityState,
  InfluenceCategory,
  GravityInfluence,
  WorldAcknowledgement,
} from './storyGravityEngine';

// ── System 16 — Character Perspective Reinforcement ─────────────
export {
  createPerspectiveState,
  shouldReinforce,
  selectReinforcementKind,
  generateReinforcement,
  generateConsistencyFeedback,
  reframeAction,
  markDelivered,
  buildPerspectiveNarratorContext,
  buildPerspectiveSummary,
} from './characterPerspectiveReinforcement';
export type {
  ReinforcementKind,
  ReinforcementEntry,
  ReinforcementConditions,
  PerspectiveState,
} from './characterPerspectiveReinforcement';

// ── System 17 — Character Identity Engine ───────────────────────
export {
  createIdentityProfile,
  ingestIdentitySignal,
  decayIdentityTraits,
  ingestFromConscience,
  syncMotivations,
  updateSpeechStyle,
  shouldShowIdentityFeedback,
  generateIdentityFeedback,
  getConfirmedTraits,
  getTraitBreakdown,
  buildIdentityNarratorContext,
  buildIdentitySummary,
} from './characterIdentityEngine';
export type {
  IdentityTrait,
  MoralTendency,
  EmotionalTendency,
  SpeechStyle,
  TraitEvidence,
  IdentityProfile,
  IdentitySignal,
  IdentityFeedback,
} from './characterIdentityEngine';

// ── System 18 — Narrator Principles Engine ──────────────────────
export {
  createCampaignNarrativeModel,
  createNarratorPrinciplesState,
  classifyScene,
  determinePacing,
  addStoryHook,
  resolveHook,
  getActiveHooks,
  getWorldAlivenessDetails,
  buildPrincipleInstructions,
  buildNarratorGuidance,
  updatePrinciplesState,
  buildNarratorPrinciplesPromptBlock,
} from './narratorPrinciplesEngine';
export type {
  SceneType,
  PacingNeed,
  StoryHook,
  CampaignNarrativeModel,
  NarratorPrinciplesState,
  CharacterNarrativeProfile,
  NarratorGuidance,
} from './narratorPrinciplesEngine';

// ── System 19 — Narrator Campaign Planner ───────────────────────
export {
  detectThreadsFromAction,
  generateContextualHooks,
  calculateStoryPressure,
  buildCampaignPlannerContext,
  updateModelFromResponse,
} from './narratorCampaignPlanner';
export type { CampaignPlannerInput } from './narratorCampaignPlanner';

// ── System 20 — Narrator Scene Director ─────────────────────────
export {
  directScene,
  buildSceneDirectorPromptBlock,
} from './narratorSceneDirector';
export type {
  NarratorBehavior,
  SceneDirective,
} from './narratorSceneDirector';

// ── System 21 — Narrator Guidance Logic ─────────────────────────
export {
  assembleNarrativeContext,
  getActiveSystemPriorities,
} from './narratorGuidanceLogic';
export type {
  NarrativeSystemInputs,
  NarrativeSystemConditions,
  AssembledNarrativeContext,
} from './narratorGuidanceLogic';

// ── System 22 — Narrator World Continuity ───────────────────────
export {
  createWorldContinuity,
  recordWorldFact,
  supersedeFact,
  updateNpcWorldState,
  recordZoneChange,
  addOffScreenEvent,
  consumeOffScreenEvents,
  buildContinuityContext,
} from './narratorWorldContinuity';
export type {
  WorldFact,
  NpcWorldState,
  WorldContinuityState,
} from './narratorWorldContinuity';

// ── System 23 — Timeline Integration ────────────────────────────
export {
  analyzeCharacterTimeline,
  analyzePartyTimelines,
  buildTimelineNarratorPrompt,
  buildPartyTimelineNarratorPrompt,
} from './timelineIntegration';
export type {
  TimelineEvent as NarrativeTimelineEvent,
  TimelineAnalysis,
  PartyTimelineAnalysis,
} from './timelineIntegration';

// ── System 24 — Narrative Thread Engine ─────────────────────────
export {
  createThreadEngineState,
  seedThread,
  escalateThread,
  resolveThread,
  advanceScene,
  getActiveThreads,
  getEscalatingThreads,
  getStaleThreads,
  getThreadsByType,
  getThreadsByTag,
  detectPossibleThreads,
  buildThreadNarratorContext,
  getThreadGravityTags,
  getThreadPressureLevel,
  getThreadEnvironmentTags,
  getCharacterThreads,
} from './narrativeThreadEngine';
export type {
  ThreadType,
  ThreadStatus,
  NarrativeThread,
  ThreadEngineState,
  ThreadDetectionContext,
} from './narrativeThreadEngine';

// ── System 25 — Unified Narrative Systems ───────────────────────
export {
  // Character Relationship Web
  createRelationshipWeb,
  getRelationship,
  updateRelationship,
  buildRelationshipContext,
  // NPC Personality
  buildNpcPersonalityContext,
  // NPC Memory
  createNpcMemoryBank,
  recordNpcMemory,
  getNpcMemoriesAbout,
  buildNpcMemoryContext,
  // Story Arc System
  createStoryArcTracker,
  addStoryArc,
  advanceArc,
  buildStoryArcContext,
  detectArcProgression,
  // Exploration Discovery
  createDiscoveryRegistry,
  registerDiscovery,
  buildDiscoveryContext,
  // Living Location
  createLocationMemorySystem,
  recordLocationEvent,
  buildLocationHistoryContext,
  // Living Economy
  createLivingEconomy,
  updateEconomyPrices,
  buildEconomyContext,
  // Injury System
  createInjuryTracker,
  addInjury,
  healInjury,
  buildInjuryContext,
  // Tactical Environment Combat
  buildTacticalCombatContext,
  // Rumor System
  createRumorTracker,
  addRumor,
  buildRumorContext,
  // Campaign Journal
  createCampaignJournal,
  addJournalEntry,
  buildJournalContext,
  // Player Influence
  createPlayerInfluenceTracker,
  recordInfluence,
  buildInfluenceContext,
  // Narrative Attention
  calculateAttentionScore,
  shouldEmphasize,
  buildAttentionContext,
  // Creativity Recognition
  createCreativityTracker,
  detectCreativity,
  recordCreativity,
  buildCreativityContext,
  // Unified builder
  buildUnifiedNarrativeContext,
} from './narrativeSystems';
export type {
  RelationshipEdge,
  RelationshipWeb,
  NpcPersonality,
  NpcMemoryEntry,
  NpcMemoryBank,
  QuestStage,
  StoryArc,
  StoryArcTracker,
  DiscoveryType,
  ExplorationDiscovery,
  DiscoveryRegistry,
  LocationHistory,
  LocationEvent,
  LocationMemorySystem,
  EconomyItem,
  LivingEconomy,
  InjuryType,
  ActiveInjury,
  InjuryTracker,
  TacticalEnvironment,
  Rumor,
  RumorTracker,
  JournalEntryType,
  JournalEntry,
  CampaignJournal,
  WorldInfluence,
  PlayerInfluenceTracker,
  NarrativeEvent,
  CreativitySignal,
  CreativityTracker,
  NarrativeSystemsSnapshot,
} from './narrativeSystems';

// ── System 26 — Situation Model ────────────────────────────────
export {
  buildSituationPrompt,
  createDefaultSituation,
} from './situationModel';
export type {
  Situation,
  SituationParticipant,
  SituationObject,
  SituationHazard,
  StoryThread,
  EnvironmentCondition,
  SituationPressure,
  Opportunity,
} from './situationModel';

// ── System 27 — Action Classification ──────────────────────────
export {
  classifyNarrativeAction,
  buildActionClassificationContext,
} from './actionClassification';
export type {
  NarrativeActionType,
  NarrativeActionClassification,
} from './actionClassification';

// ── System 28 — Narrative Priority Engine ──────────────────────
export {
  calculatePriorityStack,
  buildPriorityNarratorContext,
  isSystemActive,
  getDominantMode,
} from './narrativePriorityEngine';
export type {
  NarrativeFocus,
  PriorityScore,
  NarrativePriorityStack,
  PriorityContext,
} from './narrativePriorityEngine';

// ── System 29 — Narrative Director AI ──────────────────────────
export {
  evaluateNarrativeMode,
  buildDirectorNarratorContext,
} from './narrativeDirectorAI';
export type {
  NarrativeMode,
  NarrativeDirective,
  DirectorContext,
} from './narrativeDirectorAI';

// ── System 30 — Regional Simulation Grid ───────────────────────
export {
  createRegionalGrid,
  updateRegion,
  movePlayerToRegion,
  evolveRegionEvents,
  getPlayerRegion,
  getAdjacentRegionStates,
  buildRegionalNarratorContext,
} from './regionalSimulationGrid';
export type {
  RegionState,
  RegionEnvironment,
  FactionPresence,
  NpcActivityEntry,
  RegionEconomy,
  RegionEvent,
  RegionalGrid,
} from './regionalSimulationGrid';

// ── System 31 — Lore Consistency Engine ────────────────────────
export {
  createLoreDatabase,
  addLoreFact,
  addWorldRule,
  validateNarration,
  buildLoreConsistencyContext,
} from './loreConsistencyEngine';
export type {
  LoreCategory,
  LoreFact,
  LoreViolation,
  LoreValidationResult,
  LoreDatabase,
  TechnologyLevel,
} from './loreConsistencyEngine';

// ── System 32 — Character Psychology Engine ────────────────────
export {
  createPsychologicalProfile,
  applyPsychologicalEvent,
  decayEmotions,
  getDominantEmotion,
  buildPsychologyNarratorContext,
  buildPsychologySummary,
} from './characterPsychologyEngine';
export type {
  PsychologicalProfile,
  TraumaEntry,
  ValueChangeEntry,
  PsychologicalEvent,
} from './characterPsychologyEngine';

// ── System 33 — Relationship Simulation ────────────────────────
export {
  createRelationshipNetwork,
  getRelationshipSim,
  recordRelationshipEvent,
  getRelationshipTone,
  buildRelationshipSimContext,
  buildNetworkNarratorContext,
} from './relationshipSimulation';
export type {
  RelationshipMetrics,
  CharacterRelationship,
  RelationshipEvent as RelSimEvent,
  RelationshipNetwork,
} from './relationshipSimulation';

// ── System 34 — Narrative Pressure Engine v2 ───────────────────
export {
  detectPressureSources,
  classifyTension,
  createPressureEngineV2State,
  updatePressureEngine,
  buildPressureV2NarratorContext,
  buildPressureSimulationContext,
} from './narrativePressureEngine_v2';
export type {
  PressureSourceType,
  PressureSource as PressureSourceV2,
  TensionLevel,
  TensionClassification,
  TensionGuidance,
  PressureEngineV2State,
} from './narrativePressureEngine_v2';

// ── System 35 — Emergent Event Engine ──────────────────────────
export {
  createEmergentEventState,
  shouldGenerateEvent,
  generateEmergentEvent,
  evolveEmergentEvents,
  resolveEmergentEvent,
  getActiveEmergentEvents,
  buildEmergentEventNarratorContext,
  buildEmergentSimulationContext,
} from './emergentEventEngine';
export type {
  EmergentEventCategory,
  EmergentEventUrgency,
  EmergentEvent,
  EmergentEventEngineState,
  WorldConditions,
} from './emergentEventEngine';

// ── System 36 — Character Identity Discovery Engine ────────────
export {
  createDiscoveryProfile,
  observeBehavior,
  decayTendencies,
  shouldReflect,
  generateReflection as generateDiscoveryReflection,
  buildDiscoveryNarratorContext,
  buildDiscoverySummary,
} from './characterIdentityDiscoveryEngine';
export type {
  CharacterTendency,
  TendencyObservation,
  DiscoveryProfile,
  ObservationSource,
  BehavioralObservation,
  IdentityReflection,
} from './characterIdentityDiscoveryEngine';

// ── System 37 — Character Contradiction Engine ─────────────────
export {
  createContradictionState,
  detectContradiction,
  shouldReflectContradiction,
  generateContradictionReflection,
  buildContradictionNarratorContext,
} from './characterContradictionEngine';
export type {
  ContradictionDetection,
  ContradictionReflection,
  ContradictionEngineState,
} from './characterContradictionEngine';

// ── System 38 — Values Under Pressure ──────────────────────────
export {
  createValuesState,
  detectValueSignal,
  recordValueSignal,
  recordDilemma,
  getTopValues,
  shouldReflectValues,
  generateValueReflection,
  buildValuesNarratorContext,
} from './valuesUnderPressure';
export type {
  CoreValue,
  ValueSignal,
  ValueProfile,
  ValuesUnderPressureState,
} from './valuesUnderPressure';

// ── System 39 — Personal Trigger System ────────────────────────
export {
  createTriggerState,
  buildTriggersFromTimeline,
  scanForTriggers,
  buildTriggerNarratorContext,
} from './personalTriggerSystem';
export type {
  TriggerCategory,
  PersonalTrigger,
  TriggerMatch,
  PersonalTriggerState,
} from './personalTriggerSystem';

// ── System 40 — Character Silence Engine ───────────────────────
export {
  createSilenceState,
  detectSilence,
  shouldAcknowledgeSilence,
  generateSilenceAcknowledgement,
  buildSilenceNarratorContext,
} from './characterSilenceEngine';
export type {
  SilencePattern,
  SilenceEvent,
  SilenceEngineState,
} from './characterSilenceEngine';

// ── System 41 — Reputation vs Identity ─────────────────────────
export {
  createReputationIdentityState,
  recordReputation,
  detectConflicts,
  getDominantReputation,
  shouldReflectConflict,
  generateConflictReflection,
  buildReputationIdentityContext,
} from './reputationVsIdentity';
export type {
  ReputationTrait,
  ReputationEntry,
  IdentityConflict,
  ReputationIdentityState,
} from './reputationVsIdentity';

// ── System 42 — Memory Weight System ───────────────────────────
export {
  createMemoryWeightState,
  detectMemoryFactors,
  calculateWeight,
  getSignificance,
  recordMemory,
  decayMemories,
  referenceMemory,
  findRelevantMemories,
  getDefiningMoments,
  buildMemoryWeightContext,
} from './memoryWeightSystem';
export type {
  MemorySignificance,
  WeightedMemory,
  MemoryFactor,
  MemoryWeightState,
} from './memoryWeightSystem';
