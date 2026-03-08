/**
 * ComprehensiveBattleBrain — Type Definitions
 *
 * Central type system for the unified orchestration layer.
 * Every subsystem communicates through these shared types.
 */

import type { CentralBattleState, BattlePlayer } from '../state/BattleState';
import type { CombatAction } from '../intent/classifyAction';
import type { MoveIntent } from '@/lib/intent-interpreter';
import type { ClampResult } from '@/lib/hard-clamp';
import type { CombatResolutionResult } from '../combat/combatTypes';
import type { ComposedScenario } from '../scenarioBrain';
import type {
  IdentityProfile,
  CharacterSignatureProfile,
  EchoMemoryState,
  ReflectionState,
  ConscienceState,
  StoryGravityState,
  PerspectiveState,
  NarrativePressureState,
  DiscoverySyncState,
  EnvironmentMemoryState,
  LandmarkRegistry,
  EmotionalPressureMeter,
} from '../narrativeWorld';
import type { MutationEngineState } from '@/lib/map/mutation/NarratorTerrainMutationEngine';

// ─── Context Modes ──────────────────────────────────────────────

export type ContextMode =
  | 'pvp'
  | 'pvpvp'
  | 'pve'
  | 'eve'
  | 'campaign_exploration'
  | 'campaign_combat'
  | 'campaign_multiplayer'
  | 'dialogue'
  | 'inventory'
  | 'map_inspection'
  | 'narrator_clarification';

// ─── Action Classification ──────────────────────────────────────

export type ActionClassification =
  | 'basic_action'
  | 'social_action'
  | 'movement'
  | 'environmental_interaction'
  | 'power_ability'
  | 'combat_move'
  | 'charge_action'
  | 'construct_action'
  | 'dialogue_action'
  | 'inventory_action'
  | 'invalid_move';

// ─── Input ──────────────────────────────────────────────────────

export interface BrainInput {
  /** Raw text from the player */
  rawText: string;
  /** Character performing the action */
  characterId: string;
  /** User who owns the character */
  userId: string;
  /** Current context mode */
  contextMode: ContextMode;
  /** Optional target character */
  targetId?: string | null;
  /** Whether overcharge is active */
  overchargeActive?: boolean;
  /** Current battle or campaign ID */
  sessionId: string;
  /** Is this a narrator-generated trigger (not player input) */
  isNarratorTrigger?: boolean;
  /** Is this an environment-generated trigger */
  isEnvironmentTrigger?: boolean;
}

// ─── Resolved Output ────────────────────────────────────────────

export interface BrainOutput {
  /** Original input reference */
  input: BrainInput;
  /** How the action was classified */
  classification: ActionClassification;
  /** Intent interpretation result */
  intent: MoveIntent;
  /** Combat action structure */
  combatAction: CombatAction;
  /** Clamp result */
  clampResult: ClampResult;
  /** Combat resolution (if combat occurred) */
  combatResult: CombatResolutionResult | null;
  /** Whether the action was allowed */
  allowed: boolean;
  /** Rule messages (internal) */
  ruleMessages: string[];
  /** Narrator context lines to inject */
  narratorContext: string[];
  /** State mutations that were applied */
  appliedMutations: StateMutation[];
  /** UI update signals */
  uiSignals: UISignal[];
  /** Debug trace (only when trace mode is on) */
  trace?: TraceEntry[];
}

// ─── State Mutations ────────────────────────────────────────────

export interface StateMutation {
  system: string;
  target: string;
  description: string;
  timestamp: number;
}

// ─── UI Signals ─────────────────────────────────────────────────

export type UISignalType =
  | 'chat_update'
  | 'map_refresh'
  | 'threat_panel_update'
  | 'enemy_card_update'
  | 'level_xp_update'
  | 'status_bar_update'
  | 'environment_stability_update'
  | 'hazard_display_update'
  | 'narrator_marker_update'
  | 'input_lock_change'
  | 'turn_indicator_update'
  | 'notification_update'
  | 'scene_rebuild'
  | 'zone_change'
  | 'cinematic_trigger'
  | 'sound_trigger';

export interface UISignal {
  type: UISignalType;
  payload?: Record<string, unknown>;
  priority: 'immediate' | 'normal' | 'deferred';
}

// ─── Trace / Debug ──────────────────────────────────────────────

export interface TraceEntry {
  system: string;
  action: string;
  detail: string;
  timestamp: number;
  duration?: number;
}

// ─── Character Narrative Profile ────────────────────────────────

export interface CharacterNarrativeProfile {
  characterId: string;
  identityProfile: IdentityProfile | null;
  signatureProfile: CharacterSignatureProfile | null;
  echoMemory: EchoMemoryState | null;
  reflectionState: ReflectionState | null;
  conscienceState: ConscienceState | null;
  storyGravity: StoryGravityState | null;
  perspectiveState: PerspectiveState | null;
  pressureState: NarrativePressureState | null;
  discoverySync: DiscoverySyncState | null;
}

// ─── Unified Processing Context ─────────────────────────────────

export interface ActionContext {
  input: BrainInput;
  intent: MoveIntent;
  combatAction: CombatAction;
  classification: ActionClassification;
  clampResult: ClampResult;
}

export interface NarrativeContext {
  characterProfile: CharacterNarrativeProfile | null;
  targetProfile: CharacterNarrativeProfile | null;
  pressureMeter: EmotionalPressureMeter | null;
  recentEchoes: string[];
  recentReflections: string[];
  storyThemes: string[];
}

export interface EnvironmentContext {
  environmentMemory: EnvironmentMemoryState | null;
  landmarkRegistry: LandmarkRegistry | null;
  mutationEngine: MutationEngineState | null;
  currentScenario: ComposedScenario | null;
  terrainTags: string[];
  activeHazards: string[];
  arenaStability: number;
}

export interface CharacterContext {
  actor: BattlePlayer | null;
  target: BattlePlayer | null;
  actorOwnerUserId: string;
  isMultiplayer: boolean;
}

export interface CampaignContext {
  campaignId: string | null;
  dayCount: number;
  currentZone: string;
  timeOfDay: string;
  activeEnemies: string[];
  partyLevel: number;
  isSolo: boolean;
}

export interface BattleContext {
  battleState: CentralBattleState | null;
  turnNumber: number;
  currentTurnCharacterId: string | null;
  isActorTurn: boolean;
}

export interface UIContext {
  pendingSignals: UISignal[];
  inputLocked: boolean;
  mapNeedsRefresh: boolean;
  chatNeedsScroll: boolean;
}

/** Combined processing context passed through the resolver chain */
export interface UnifiedContext {
  action: ActionContext;
  narrative: NarrativeContext;
  environment: EnvironmentContext;
  character: CharacterContext;
  campaign: CampaignContext;
  battle: BattleContext;
  ui: UIContext;
}

// ─── Resolver ───────────────────────────────────────────────────

export interface ResolverResult {
  narratorContext: string[];
  mutations: StateMutation[];
  uiSignals: UISignal[];
  allowed: boolean;
  ruleMessages: string[];
  combatResult: CombatResolutionResult | null;
}

// ─── Brain Configuration ────────────────────────────────────────

export interface BattleBrainConfig {
  traceEnabled: boolean;
  /** Which subsystems are active for this session */
  activeSubsystems: Set<string>;
  /** Context mode overrides */
  contextMode: ContextMode;
}
