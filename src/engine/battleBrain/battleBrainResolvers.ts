/**
 * Battle Brain Resolvers
 *
 * Resolver chain that processes a validated action through
 * the correct subsystems based on context and classification.
 *
 * Each resolver is a pure function that reads the UnifiedContext
 * and returns mutations, narrator context, and UI signals.
 */

import type {
  UnifiedContext,
  ResolverResult,
  StateMutation,
  UISignal,
  ActionClassification,
  ContextMode,
  TraceEntry,
} from './battleBrainTypes';
import type { CombatResolutionResult } from '../combat/combatTypes';
import { resolveCombat, emitCombatEvents } from '../combat/combatResolver';
import { evaluateRules, aggregateRuleResults, DEFAULT_COMBAT_RULES } from '../rules';
import type { RuleContext } from '../rules';
import type { BattleStateManager } from '../state/BattleStateManager';
import type { BattleEventBus } from '../events/eventBus';

// ─── Subsystem Activation Map ───────────────────────────────────

interface SubsystemFlags {
  combat: boolean;
  rules: boolean;
  narrative: boolean;
  environment: boolean;
  mutation: boolean;
  hazard: boolean;
  map: boolean;
  identity: boolean;
  discovery: boolean;
  echo: boolean;
  reflection: boolean;
  conscience: boolean;
  storyGravity: boolean;
  perspective: boolean;
  pressure: boolean;
  scenarioBrain: boolean;
}

export function getActiveSubsystems(
  mode: ContextMode,
  classification: ActionClassification,
): SubsystemFlags {
  const base: SubsystemFlags = {
    combat: false,
    rules: false,
    narrative: true,
    environment: true,
    mutation: false,
    hazard: false,
    map: false,
    identity: true,
    discovery: false,
    echo: false,
    reflection: false,
    conscience: false,
    storyGravity: true,
    perspective: false,
    pressure: false,
    scenarioBrain: false,
  };

  // Combat modes
  if (['pvp', 'pvpvp', 'pve', 'eve', 'campaign_combat'].includes(mode)) {
    base.combat = true;
    base.rules = true;
    base.hazard = true;
    base.map = true;
    base.mutation = true;
  }

  // Campaign modes
  if (['campaign_exploration', 'campaign_combat', 'campaign_multiplayer'].includes(mode)) {
    base.discovery = true;
    base.echo = true;
    base.reflection = true;
    base.conscience = true;
    base.pressure = true;
    base.perspective = true;
  }

  // Classification-specific
  if (classification === 'environmental_interaction') {
    base.mutation = true;
    base.hazard = true;
    base.map = true;
  }

  if (classification === 'basic_action' || classification === 'social_action') {
    base.combat = false;
    base.rules = false;
  }

  if (classification === 'combat_move' || classification === 'power_ability') {
    base.combat = true;
    base.rules = true;
  }

  return base;
}

// ─── Combat Resolver ────────────────────────────────────────────

export function resolveCombatAction(
  ctx: UnifiedContext,
  stateManager: BattleStateManager | undefined,
  eventBus: BattleEventBus | undefined,
): { combatResult: CombatResolutionResult | null; narratorContext: string[]; mutations: StateMutation[] } {
  if (!stateManager || !eventBus) {
    return { combatResult: null, narratorContext: [], mutations: [] };
  }

  const { combatAction, clampResult, input } = ctx.action;
  const mutations: StateMutation[] = [];

  // Run rule engine first
  const ruleCtx: RuleContext = {
    state: stateManager.getState(),
    action: combatAction,
    actorId: input.characterId,
    targetId: input.targetId ?? null,
    clampResult,
    overchargeActive: input.overchargeActive ?? false,
    messageCount: stateManager.getState().battleLog.length,
  };

  const ruleResults = evaluateRules(DEFAULT_COMBAT_RULES, ruleCtx);
  const ruleAgg = aggregateRuleResults(ruleResults);

  if (!ruleAgg.allowed) {
    return {
      combatResult: null,
      narratorContext: ruleAgg.narratorContext,
      mutations,
    };
  }

  // Determine combat mode from battle state
  const battleMode = stateManager.getState().mode ?? 'pvp';

  const combatInput = {
    action: combatAction,
    attackerId: input.characterId,
    defenderId: input.targetId ?? null,
    clampResult,
    overchargeActive: input.overchargeActive ?? false,
    mode: battleMode as 'pvp' | 'pvpvp' | 'pve' | 'eve' | 'campaign',
  };

  // Resolve combat
  const combatResult = resolveCombat(combatInput, stateManager);

  // Emit events
  emitCombatEvents(combatInput, combatResult, eventBus);

  mutations.push({
    system: 'combat',
    target: input.characterId,
    description: `Combat resolved: ${combatResult.didHit === true ? 'hit' : combatResult.didHit === false ? 'miss' : 'no combat'}`,
    timestamp: Date.now(),
  });

  return {
    combatResult,
    narratorContext: [...ruleAgg.narratorContext, ...combatResult.narratorContext],
    mutations,
  };
}

// ─── Environment Resolver ───────────────────────────────────────

export function resolveEnvironmentEffects(
  ctx: UnifiedContext,
): { narratorContext: string[]; mutations: StateMutation[]; uiSignals: UISignal[] } {
  const narratorContext: string[] = [];
  const mutations: StateMutation[] = [];
  const uiSignals: UISignal[] = [];

  const { classification } = ctx.action;

  if (classification === 'environmental_interaction') {
    // Signal map refresh
    uiSignals.push({
      type: 'map_refresh',
      priority: 'normal',
    });

    uiSignals.push({
      type: 'environment_stability_update',
      priority: 'normal',
    });

    mutations.push({
      system: 'environment',
      target: 'arena',
      description: 'Environmental interaction processed',
      timestamp: Date.now(),
    });
  }

  return { narratorContext, mutations, uiSignals };
}

// ─── Narrative Resolver ─────────────────────────────────────────

export function resolveNarrativeEffects(
  ctx: UnifiedContext,
): { narratorContext: string[]; mutations: StateMutation[]; uiSignals: UISignal[] } {
  const narratorContext: string[] = [];
  const mutations: StateMutation[] = [];
  const uiSignals: UISignal[] = [];

  const profile = ctx.narrative.characterProfile;
  if (!profile) return { narratorContext, mutations, uiSignals };

  // Identity system: record action signal
  if (profile.identityProfile) {
    mutations.push({
      system: 'identity',
      target: ctx.action.input.characterId,
      description: 'Identity signal ingested from action',
      timestamp: Date.now(),
    });
  }

  // Signature system: record action pattern
  if (profile.signatureProfile) {
    mutations.push({
      system: 'signature',
      target: ctx.action.input.characterId,
      description: 'Action pattern recorded in signature profile',
      timestamp: Date.now(),
    });
  }

  // Story gravity: weight shift from action
  if (profile.storyGravity) {
    mutations.push({
      system: 'story_gravity',
      target: ctx.action.input.characterId,
      description: 'Story gravity weights updated',
      timestamp: Date.now(),
    });
  }

  return { narratorContext, mutations, uiSignals };
}

// ─── Map/Zone Resolver ──────────────────────────────────────────

export function resolveMapUpdates(
  ctx: UnifiedContext,
): { uiSignals: UISignal[] } {
  const uiSignals: UISignal[] = [];

  // If environment changed, signal map refresh
  if (ctx.action.classification === 'environmental_interaction' || ctx.action.classification === 'combat_move') {
    uiSignals.push({
      type: 'map_refresh',
      payload: { reason: ctx.action.classification },
      priority: 'deferred',
    });
  }

  return { uiSignals };
}

// ─── Master Resolver Chain ──────────────────────────────────────

export function executeResolverChain(
  ctx: UnifiedContext,
  subsystems: SubsystemFlags,
  stateManager?: BattleStateManager,
  eventBus?: BattleEventBus,
): ResolverResult {
  const narratorContext: string[] = [];
  const mutations: StateMutation[] = [];
  const uiSignals: UISignal[] = [];
  let combatResult: CombatResolutionResult | null = null;
  let allowed = true;
  const ruleMessages: string[] = [];

  // 1. Combat resolution
  if (subsystems.combat && (ctx.action.classification === 'combat_move' || ctx.action.classification === 'power_ability')) {
    const combat = resolveCombatAction(ctx, stateManager, eventBus);
    combatResult = combat.combatResult;
    narratorContext.push(...combat.narratorContext);
    mutations.push(...combat.mutations);
  }

  // 2. Environment effects
  if (subsystems.environment) {
    const env = resolveEnvironmentEffects(ctx);
    narratorContext.push(...env.narratorContext);
    mutations.push(...env.mutations);
    uiSignals.push(...env.uiSignals);
  }

  // 3. Narrative effects
  if (subsystems.narrative) {
    const narr = resolveNarrativeEffects(ctx);
    narratorContext.push(...narr.narratorContext);
    mutations.push(...narr.mutations);
    uiSignals.push(...narr.uiSignals);
  }

  // 4. Map updates
  if (subsystems.map) {
    const map = resolveMapUpdates(ctx);
    uiSignals.push(...map.uiSignals);
  }

  // 5. Always signal chat update
  uiSignals.push({
    type: 'chat_update',
    priority: 'immediate',
  });

  return {
    narratorContext,
    mutations,
    uiSignals,
    allowed,
    ruleMessages,
    combatResult,
  };
}
