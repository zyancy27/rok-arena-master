/**
 * ComprehensiveBattleBrain — Master Orchestration Layer
 *
 * The single entry point for processing any player action, narrator trigger,
 * or environment event across all modes (PvP, PvE, Campaign, etc.).
 *
 * Pipeline:
 *   Input → Context Assembly → Rule Validation → Resolver Chain
 *   → State Updates → Event Emission → UI Signal Dispatch
 *
 * Design principles:
 *   - One action → one processing pass → all systems update
 *   - No system independently re-interprets the action
 *   - All state mutations are tracked and traceable
 *   - UI signals are batched and priority-ordered
 */

import type {
  BrainInput,
  BrainOutput,
  BattleBrainConfig,
  TraceEntry,
  ContextMode,
  ActionClassification,
  StateMutation,
  UISignal,
} from './battleBrainTypes';
import { buildUnifiedContext, type SubsystemStates } from './battleBrainContext';
import { evaluateBrainRules } from './battleBrainRules';
import { executeResolverChain, getActiveSubsystems } from './battleBrainResolvers';
import { BattleBrainDispatcher, createBattleBrainDispatcher } from './battleBrainDispatcher';
import {
  getInvalidationSignals,
  detectContextMode,
  checkForStaleState,
  type InvalidationEvent,
} from './battleBrainSync';
import type { BattleStateManager } from '../state/BattleStateManager';
import type { BattleEventBus } from '../events/eventBus';

export class ComprehensiveBattleBrain {
  private config: BattleBrainConfig;
  private dispatcher: BattleBrainDispatcher;
  private subsystemStates: SubsystemStates = {};
  private stateManager?: BattleStateManager;
  private eventBus?: BattleEventBus;
  private traceLog: TraceEntry[] = [];

  constructor(config?: Partial<BattleBrainConfig>) {
    this.config = {
      traceEnabled: config?.traceEnabled ?? false,
      activeSubsystems: config?.activeSubsystems ?? new Set(),
      contextMode: config?.contextMode ?? 'pvp',
    };
    this.dispatcher = createBattleBrainDispatcher();
    this.dispatcher.setTraceEnabled(this.config.traceEnabled);
  }

  // ─── Configuration ──────────────────────────────────────────────

  setStateManager(manager: BattleStateManager): void {
    this.stateManager = manager;
  }

  setEventBus(bus: BattleEventBus): void {
    this.eventBus = bus;
  }

  updateSubsystemStates(states: Partial<SubsystemStates>): void {
    this.subsystemStates = { ...this.subsystemStates, ...states };
  }

  setContextMode(mode: ContextMode): void {
    this.config.contextMode = mode;
  }

  setTraceEnabled(enabled: boolean): void {
    this.config.traceEnabled = enabled;
    this.dispatcher.setTraceEnabled(enabled);
  }

  getDispatcher(): BattleBrainDispatcher {
    return this.dispatcher;
  }

  // ─── Main Processing Pipeline ───────────────────────────────────

  /**
   * Process a single input through the full pipeline.
   * This is THE entry point — all battle/campaign actions flow through here.
   */
  process(input: BrainInput): BrainOutput {
    const startTime = performance.now();
    const trace: TraceEntry[] = [];

    // 1. Build unified context
    const traceCtxStart = performance.now();
    const ctx = buildUnifiedContext(input, this.subsystemStates);
    if (this.config.traceEnabled) {
      trace.push({
        system: 'context',
        action: 'build',
        detail: `Classification: ${ctx.action.classification}, Intent: ${ctx.action.intent.type}`,
        timestamp: Date.now(),
        duration: performance.now() - traceCtxStart,
      });
    }

    // 2. Evaluate brain rules (ownership, classification guards, turn order)
    const traceRulesStart = performance.now();
    const ruleResult = evaluateBrainRules(ctx);
    if (this.config.traceEnabled) {
      trace.push({
        system: 'rules',
        action: 'evaluate',
        detail: `Allowed: ${ruleResult.allowed}, Messages: ${ruleResult.messages.length}, Override: ${ruleResult.classificationOverride ?? 'none'}`,
        timestamp: Date.now(),
        duration: performance.now() - traceRulesStart,
      });
    }

    // Apply classification override if rules dictate
    if (ruleResult.classificationOverride) {
      ctx.action.classification = ruleResult.classificationOverride;
    }

    // 3. If not allowed, return early with error
    if (!ruleResult.allowed) {
      return {
        input,
        classification: ctx.action.classification,
        intent: ctx.action.intent,
        legacyMoveIntent: ctx.action.legacyMoveIntent,
        combatAction: ctx.action.combatAction,
        clampResult: ctx.action.clampResult,
        combatResult: null,
        allowed: false,
        ruleMessages: ruleResult.messages,
        narratorContext: [],
        appliedMutations: [],
        uiSignals: [],
        trace: this.config.traceEnabled ? trace : undefined,
      };
    }

    // 4. Check for stale state and auto-fix
    const staleChecks = checkForStaleState(ctx);
    const staleSignals: UISignal[] = [];
    for (const check of staleChecks) {
      if (check.isStale) {
        if (this.config.traceEnabled) {
          trace.push({
            system: 'sync',
            action: 'stale_detected',
            detail: `${check.system}: ${check.reason}`,
            timestamp: Date.now(),
          });
        }
        // Auto-signal refresh for stale systems
        if (check.system === 'map') {
          staleSignals.push({ type: 'map_refresh', priority: 'immediate' });
        }
        if (check.system === 'narrator') {
          staleSignals.push({ type: 'scene_rebuild', priority: 'normal' });
        }
      }
    }

    // 5. Determine which subsystems to activate
    const subsystemFlags = getActiveSubsystems(input.contextMode, ctx.action.classification);
    if (this.config.traceEnabled) {
      const active = Object.entries(subsystemFlags)
        .filter(([, v]) => v)
        .map(([k]) => k);
      trace.push({
        system: 'dispatcher',
        action: 'subsystem_activation',
        detail: `Active: ${active.join(', ')}`,
        timestamp: Date.now(),
      });
    }

    // 6. Execute resolver chain
    const traceResolveStart = performance.now();
    const resolverResult = executeResolverChain(
      ctx,
      subsystemFlags,
      this.stateManager,
      this.eventBus,
    );
    if (this.config.traceEnabled) {
      trace.push({
        system: 'resolvers',
        action: 'execute',
        detail: `Mutations: ${resolverResult.mutations.length}, Signals: ${resolverResult.uiSignals.length}`,
        timestamp: Date.now(),
        duration: performance.now() - traceResolveStart,
      });
    }

    // 7. Assemble output
    const output: BrainOutput = {
      input,
      classification: ctx.action.classification,
      intent: ctx.action.intent,
      legacyMoveIntent: ctx.action.legacyMoveIntent,
      combatAction: ctx.action.combatAction,
      clampResult: ctx.action.clampResult,
      combatResult: resolverResult.combatResult,
      allowed: resolverResult.allowed,
      ruleMessages: [...ruleResult.messages, ...resolverResult.ruleMessages],
      narratorContext: resolverResult.narratorContext,
      appliedMutations: resolverResult.mutations,
      uiSignals: [...staleSignals, ...resolverResult.uiSignals],
      trace: this.config.traceEnabled ? trace : undefined,
    };

    // 8. Dispatch UI signals
    this.dispatcher.dispatchOutput(output);

    // 9. Total trace
    if (this.config.traceEnabled) {
      trace.push({
        system: 'brain',
        action: 'total',
        detail: `Total pipeline time`,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      });
    }

    return output;
  }

  // ─── Invalidation Events ────────────────────────────────────────

  /**
   * Notify the brain of a major context change that requires
   * invalidation and rebuild of affected subsystems.
   */
  invalidate(event: InvalidationEvent): UISignal[] {
    const signals = getInvalidationSignals(event);

    if (this.config.traceEnabled) {
      this.traceLog.push({
        system: 'sync',
        action: 'invalidate',
        detail: `${event.category}: ${event.detail} → ${signals.length} signals`,
        timestamp: Date.now(),
      });
    }

    // Dispatch the invalidation signals
    for (const signal of signals) {
      this.dispatcher.dispatchOutput({
        input: { rawText: '', characterId: '', userId: '', contextMode: this.config.contextMode, sessionId: '' },
        classification: 'basic_action',
        intent: {} as any,
        legacyMoveIntent: {} as any,
        combatAction: {} as any,
        clampResult: {} as any,
        combatResult: null,
        allowed: true,
        ruleMessages: [],
        narratorContext: [],
        appliedMutations: [],
        uiSignals: [signal],
      });
    }

    return signals;
  }

  // ─── Debug / Trace ──────────────────────────────────────────────

  getTraceLog(): TraceEntry[] {
    return [...this.traceLog, ...this.dispatcher.getTraceLog()];
  }

  clearTrace(): void {
    this.traceLog = [];
    this.dispatcher.clearTrace();
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  destroy(): void {
    this.dispatcher.destroy();
    this.traceLog = [];
    this.subsystemStates = {};
    this.stateManager = undefined;
    this.eventBus = undefined;
  }
}

// ─── Factory ────────────────────────────────────────────────────

export function createBattleBrain(config?: Partial<BattleBrainConfig>): ComprehensiveBattleBrain {
  return new ComprehensiveBattleBrain(config);
}
