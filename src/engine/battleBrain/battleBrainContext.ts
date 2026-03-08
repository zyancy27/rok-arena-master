/**
 * Battle Brain Context Builder
 *
 * Assembles the UnifiedContext from all available subsystem states.
 * This is the "gather" phase before resolution.
 */

import type {
  BrainInput,
  UnifiedContext,
  ActionContext,
  NarrativeContext,
  EnvironmentContext,
  CharacterContext,
  CampaignContext,
  BattleContext,
  UIContext,
  CharacterNarrativeProfile,
  ActionClassification,
} from './battleBrainTypes';
import type { CentralBattleState } from '../state/BattleState';
import type { BattleStateManager } from '../state/BattleStateManager';
import { classifyAction } from '../intent/classifyAction';
import { interpretMove } from '@/lib/intent-interpreter';
import { hardClamp, type ClampResult } from '@/lib/hard-clamp';
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
import type { ComposedScenario } from '../scenarioBrain';

// ─── Subsystem State Registry ───────────────────────────────────

/**
 * Optional external state holders that the brain can read from.
 * These are injected by the caller (hook / component) so the brain
 * stays pure and doesn't own React state.
 */
export interface SubsystemStates {
  battleStateManager?: BattleStateManager;
  narrativeProfiles?: Map<string, CharacterNarrativeProfile>;
  environmentMemory?: EnvironmentMemoryState;
  landmarkRegistry?: LandmarkRegistry;
  mutationEngine?: MutationEngineState;
  currentScenario?: ComposedScenario;
  pressureMeter?: EmotionalPressureMeter;

  // Campaign-specific
  campaignId?: string;
  dayCount?: number;
  currentZone?: string;
  timeOfDay?: string;
  activeEnemies?: string[];
  partyLevel?: number;
  isSolo?: boolean;
}

// ─── Action Classification Logic ────────────────────────────────

const BASIC_ACTION_PATTERNS = [
  /^(i |he |she |they |we )?(walk|step|look|glance|turn|nod|sit|stand|lean|crouch|kneel|wave|bow|smile|laugh|sigh|breathe|whisper|speak|say|talk|ask|reply|answer|greet|shrug|stretch|yawn|eat|drink|rest|wait|pause|listen|watch|observe|examine|inspect|pick up|put down|set down|grab|take|hold|open|close|enter|exit|leave|arrive|approach|pull|push)/i,
];

const SOCIAL_PATTERNS = [
  /\b(say|tell|ask|greet|introduce|persuade|negotiate|bargain|intimidate|flatter|compliment|insult|taunt|mock|apologize|thank|beg|plead|request|demand|offer|promise|agree|disagree|refuse|accept|deny|confess|admit|explain|describe|warn)\b/i,
];

export function classifyActionType(
  input: BrainInput,
  intent: ReturnType<typeof interpretMove>,
): ActionClassification {
  const text = input.rawText.toLowerCase().trim();

  // In exploration contexts, bias towards basic/social
  const isExploration = input.contextMode === 'campaign_exploration' || input.contextMode === 'dialogue';

  // Check for basic actions first (highest priority per spec)
  if (BASIC_ACTION_PATTERNS.some(p => p.test(text))) {
    // Only classify as basic if no strong power indicators
    if (intent.detectedElements.length === 0 && intent.intentCategory === 'LOW_FORCE') {
      return 'basic_action';
    }
  }

  // Social actions
  if (SOCIAL_PATTERNS.some(p => p.test(text)) && intent.actionType !== 'ATTACK') {
    return 'social_action';
  }

  // Dialogue context
  if (input.contextMode === 'dialogue') {
    return 'dialogue_action';
  }

  // Inventory
  if (input.contextMode === 'inventory') {
    return 'inventory_action';
  }

  // Movement without combat intent
  if (intent.actionType === 'MOVEMENT' && intent.detectedElements.length === 0) {
    return 'movement';
  }

  // Environmental interaction
  if (intent.actionType === 'ENVIRONMENTAL') {
    return 'environmental_interaction';
  }

  // Charge action
  if (intent.actionType === 'CHARGE') {
    return 'charge_action';
  }

  // Construct creation detection
  if (intent.actionType === 'UTILITY' && /\b(construct|summon|create|conjure|manifest)\b/i.test(text)) {
    return 'construct_action';
  }

  // Power/ability action
  if (intent.detectedElements.length > 0 || intent.intentCategory === 'HIGH_FORCE') {
    return 'power_ability';
  }

  // Combat move (has hit detection triggers)
  if (intent.actionType === 'ATTACK' || intent.actionType === 'COUNTER') {
    return 'combat_move';
  }

  // In exploration, default to basic
  if (isExploration && intent.confidence < 0.6) {
    return 'basic_action';
  }

  // Default: if it looks like movement or utility, allow it
  if (intent.actionType === 'MOVEMENT' || intent.actionType === 'UTILITY' || intent.actionType === 'DEFENSE') {
    return 'movement';
  }

  return 'basic_action';
}

// ─── Context Builder ────────────────────────────────────────────

export function buildUnifiedContext(
  input: BrainInput,
  subsystems: SubsystemStates,
): UnifiedContext {
  const intent = interpretMove(input.rawText);
  const combatAction = classifyAction(input.rawText);
  const classification = classifyActionType(input, intent);

  // Build clamp result
  const battleState = subsystems.battleStateManager?.getState() ?? null;
  const actor = battleState?.players[input.characterId] ?? null;
  const clampResult: ClampResult = hardClamp(
    input.rawText,
    actor?.stats ?? null,
    actor?.tier ?? 3,
    actor?.powers ?? null,
    actor?.abilities ?? null,
  );

  const actionCtx: ActionContext = {
    input,
    intent,
    combatAction,
    classification,
    clampResult,
  };

  // Narrative context
  const actorProfile = subsystems.narrativeProfiles?.get(input.characterId) ?? null;
  const targetProfile = input.targetId
    ? subsystems.narrativeProfiles?.get(input.targetId) ?? null
    : null;

  const narrativeCtx: NarrativeContext = {
    characterProfile: actorProfile,
    targetProfile,
    pressureMeter: subsystems.pressureMeter ?? null,
    recentEchoes: [],
    recentReflections: [],
    storyThemes: [],
  };

  // Environment context
  const envCtx: EnvironmentContext = {
    environmentMemory: subsystems.environmentMemory ?? null,
    landmarkRegistry: subsystems.landmarkRegistry ?? null,
    mutationEngine: subsystems.mutationEngine ?? null,
    currentScenario: subsystems.currentScenario ?? null,
    terrainTags: battleState?.environment.terrainTags ?? [],
    activeHazards: [],
    arenaStability: 1.0,
  };

  // Character context
  const target = input.targetId ? battleState?.players[input.targetId] ?? null : null;
  const charCtx: CharacterContext = {
    actor,
    target,
    actorOwnerUserId: input.userId,
    isMultiplayer: battleState ? Object.keys(battleState.players).length > 2 : !subsystems.isSolo,
  };

  // Campaign context
  const campaignCtx: CampaignContext = {
    campaignId: subsystems.campaignId ?? null,
    dayCount: subsystems.dayCount ?? 1,
    currentZone: subsystems.currentZone ?? 'Starting Area',
    timeOfDay: subsystems.timeOfDay ?? 'morning',
    activeEnemies: subsystems.activeEnemies ?? [],
    partyLevel: subsystems.partyLevel ?? 1,
    isSolo: subsystems.isSolo ?? true,
  };

  // Battle context
  const currentTurnCharacterId = subsystems.battleStateManager?.getCurrentTurnCharacterId() ?? null;
  const battleCtx: BattleContext = {
    battleState,
    turnNumber: battleState?.turnNumber ?? 0,
    currentTurnCharacterId,
    isActorTurn: currentTurnCharacterId === input.characterId,
  };

  // UI context
  const uiCtx: UIContext = {
    pendingSignals: [],
    inputLocked: false,
    mapNeedsRefresh: false,
    chatNeedsScroll: false,
  };

  return {
    action: actionCtx,
    narrative: narrativeCtx,
    environment: envCtx,
    character: charCtx,
    campaign: campaignCtx,
    battle: battleCtx,
    ui: uiCtx,
  };
}
