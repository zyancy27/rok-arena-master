/**
 * Rule: Invalid Ability Detection
 *
 * Detects when a player uses abilities that don't match their character profile.
 */

import type { CombatRule, RuleContext, RuleResult } from './ruleEngine';

export const ruleInvalidAbility: CombatRule = {
  id: 'invalid_ability',
  name: 'Ability Compatibility Check',
  priority: 20,

  trigger(ctx: RuleContext): boolean {
    return ctx.clampResult.elementMismatch;
  },

  execute(ctx: RuleContext): RuleResult {
    const player = ctx.state.players[ctx.actorId];
    const elements = ctx.clampResult.mismatchedElements.join(', ');

    return {
      triggered: true,
      allowed: true, // Allow but flag — narrator will handle
      message: `Element mismatch: ${elements} not in ${player?.name ?? 'character'}'s profile`,
      narratorContext: `[ABILITY MISMATCH: The player used ${elements} elements which are not part of their character's established power set. Describe the action but note the inconsistency subtly — perhaps the attack is weaker, unstable, or partially fails.]`,
      stopPropagation: false,
    };
  },
};
