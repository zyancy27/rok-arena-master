/**
 * Battle Brain Rules
 *
 * Priority-ordered validation rules that the brain applies
 * before resolver chains. These enforce integrity constraints
 * like character ownership and correct action classification.
 */

import type { UnifiedContext, BrainInput, ActionClassification } from './battleBrainTypes';

export interface BrainRuleResult {
  allowed: boolean;
  message: string | null;
  /** Override classification if the rule detects a misclassification */
  overrideClassification?: ActionClassification;
}

export interface BrainRule {
  id: string;
  name: string;
  /** Lower = evaluated first */
  priority: number;
  evaluate(ctx: UnifiedContext): BrainRuleResult;
}

// ─── Rule 1: Character Ownership (Priority 1) ───────────────────

const characterOwnershipRule: BrainRule = {
  id: 'ownership',
  name: 'Character Ownership Enforcement',
  priority: 1,
  evaluate(ctx) {
    // In multiplayer, ensure the actor owns the character
    if (ctx.character.isMultiplayer && ctx.character.actor) {
      if (ctx.character.actor.userId !== ctx.action.input.userId) {
        return {
          allowed: false,
          message: 'You can only control your own character.',
        };
      }
    }
    return { allowed: true, message: null };
  },
};

// ─── Rule 2: Correct Action Classification (Priority 2) ────────

const classificationGuardRule: BrainRule = {
  id: 'classification_guard',
  name: 'Action Classification Guard',
  priority: 2,
  evaluate(ctx) {
    const { classification } = ctx.action;
    const { contextMode } = ctx.action.input;

    // In exploration mode, don't allow combat moves unless explicit
    if (
      contextMode === 'campaign_exploration' &&
      classification === 'combat_move' &&
      ctx.action.intent.confidence < 0.7
    ) {
      return {
        allowed: true,
        message: null,
        overrideClassification: 'basic_action',
      };
    }

    // Basic actions must bypass power warnings
    if (
      classification === 'basic_action' &&
      ctx.action.clampResult.elementMismatch
    ) {
      // Basic actions shouldn't trigger element mismatch
      return {
        allowed: true,
        message: null,
        overrideClassification: 'basic_action',
      };
    }

    return { allowed: true, message: null };
  },
};

// ─── Rule 3: Turn Order Validation (Priority 3) ────────────────

const turnOrderRule: BrainRule = {
  id: 'turn_order',
  name: 'Turn Order Validation',
  priority: 3,
  evaluate(ctx) {
    // Only enforce in PvP/PvPvP modes
    const mode = ctx.action.input.contextMode;
    if (mode !== 'pvp' && mode !== 'pvpvp') {
      return { allowed: true, message: null };
    }

    if (ctx.battle.battleState && !ctx.battle.isActorTurn) {
      // Allow basic actions and social actions out of turn
      if (
        ctx.action.classification === 'basic_action' ||
        ctx.action.classification === 'social_action'
      ) {
        return { allowed: true, message: null };
      }
      return {
        allowed: false,
        message: 'It is not your turn.',
      };
    }

    return { allowed: true, message: null };
  },
};

// ─── Rule 4: Narrator Restriction (Priority 4) ─────────────────

const narratorRestrictionRule: BrainRule = {
  id: 'narrator_restriction',
  name: 'Narrator Character Boundary',
  priority: 4,
  evaluate(ctx) {
    // Narrator triggers should never act as player characters
    if (ctx.action.input.isNarratorTrigger) {
      if (
        ctx.action.classification === 'combat_move' ||
        ctx.action.classification === 'power_ability'
      ) {
        return {
          allowed: false,
          message: 'Narrator cannot perform combat actions for player characters.',
        };
      }
    }
    return { allowed: true, message: null };
  },
};

// ─── Rule 5: Context-Appropriate Subsystems (Priority 5) ───────

const contextSubsystemRule: BrainRule = {
  id: 'context_subsystems',
  name: 'Context-Appropriate Subsystem Activation',
  priority: 5,
  evaluate(ctx) {
    // This rule doesn't block; it adds metadata about which
    // subsystems should fire. The dispatcher reads this.
    return { allowed: true, message: null };
  },
};

// ─── All Rules (ordered) ────────────────────────────────────────

export const BRAIN_RULES: BrainRule[] = [
  characterOwnershipRule,
  classificationGuardRule,
  turnOrderRule,
  narratorRestrictionRule,
  contextSubsystemRule,
];

export function evaluateBrainRules(ctx: UnifiedContext): {
  allowed: boolean;
  messages: string[];
  classificationOverride: ActionClassification | null;
} {
  const messages: string[] = [];
  let allowed = true;
  let classificationOverride: ActionClassification | null = null;

  const sorted = [...BRAIN_RULES].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    const result = rule.evaluate(ctx);
    if (!result.allowed) {
      allowed = false;
      if (result.message) messages.push(result.message);
      break; // Stop on first deny (priority order)
    }
    if (result.message) messages.push(result.message);
    if (result.overrideClassification) {
      classificationOverride = result.overrideClassification;
    }
  }

  return { allowed, messages, classificationOverride };
}
