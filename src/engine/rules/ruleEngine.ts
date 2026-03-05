/**
 * Rule Engine — Base Types & Runner
 *
 * Rules follow a trigger/execute pattern. Each rule checks if its
 * conditions are met, then executes its logic. Rules are evaluated
 * in priority order and can short-circuit.
 */

import type { CentralBattleState } from '../state/BattleState';
import type { CombatAction } from '../intent/classifyAction';
import type { ClampResult } from '@/lib/hard-clamp';

// ─── Rule Context ───────────────────────────────────────────────

export interface RuleContext {
  /** Current battle state */
  state: CentralBattleState;
  /** The classified combat action */
  action: CombatAction;
  /** The acting character's ID */
  actorId: string;
  /** Target character ID (if any) */
  targetId: string | null;
  /** Clamp result from hard-clamp */
  clampResult: ClampResult;
  /** Whether overcharge is active */
  overchargeActive: boolean;
  /** Message count in the battle */
  messageCount: number;
}

// ─── Rule Result ────────────────────────────────────────────────

export interface RuleResult {
  /** Whether the rule was triggered */
  triggered: boolean;
  /** Whether the action is allowed to proceed */
  allowed: boolean;
  /** Warning/info message (not shown in chat — internal only) */
  message: string | null;
  /** Narrator context to inject */
  narratorContext: string | null;
  /** Whether to block further rule evaluation */
  stopPropagation: boolean;
  /** Modifications to apply */
  modifications?: {
    forceCategory?: 'LOW_FORCE' | 'MODERATE_FORCE' | 'HIGH_FORCE';
    staminaDrainMultiplier?: number;
    aoeClamped?: boolean;
  };
}

// ─── Rule Interface ─────────────────────────────────────────────

export interface CombatRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Priority (lower = evaluated first) */
  priority: number;
  /** Check if this rule should activate */
  trigger(context: RuleContext): boolean;
  /** Execute the rule and return the result */
  execute(context: RuleContext): RuleResult;
}

// ─── Rule Runner ────────────────────────────────────────────────

/**
 * Evaluate all registered rules against a context.
 * Rules are evaluated in priority order. A rule can stop propagation.
 */
export function evaluateRules(
  rules: CombatRule[],
  context: RuleContext,
): RuleResult[] {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const results: RuleResult[] = [];

  for (const rule of sorted) {
    if (rule.trigger(context)) {
      const result = rule.execute(context);
      results.push(result);
      if (result.stopPropagation) break;
    }
  }

  return results;
}

/**
 * Aggregate rule results into a single summary.
 */
export function aggregateRuleResults(results: RuleResult[]): {
  allowed: boolean;
  messages: string[];
  narratorContext: string[];
  modifications: RuleResult['modifications'];
} {
  const messages: string[] = [];
  const narratorCtx: string[] = [];
  let allowed = true;
  let modifications: RuleResult['modifications'] = {};

  for (const r of results) {
    if (!r.allowed) allowed = false;
    if (r.message) messages.push(r.message);
    if (r.narratorContext) narratorCtx.push(r.narratorContext);
    if (r.modifications) {
      modifications = { ...modifications, ...r.modifications };
    }
  }

  return { allowed, messages, narratorContext: narratorCtx, modifications };
}
