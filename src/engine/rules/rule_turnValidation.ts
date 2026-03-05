/**
 * Rule: Turn Validation
 *
 * Validates that it's the correct player's turn and that the action
 * is valid for the current battle state.
 */

import type { CombatRule, RuleContext, RuleResult } from './ruleEngine';
import { isAttackValidForDistance } from '@/lib/battle-dice';

export const ruleTurnValidation: CombatRule = {
  id: 'turn_validation',
  name: 'Turn & Distance Validation',
  priority: 5, // Highest priority — runs first

  trigger(_ctx: RuleContext): boolean {
    return true; // Always check
  },

  execute(ctx: RuleContext): RuleResult {
    const state = ctx.state;

    // Validate it's the actor's turn
    const currentTurnId = state.turnOrder[state.currentTurnIndex];
    if (currentTurnId !== ctx.actorId) {
      return {
        triggered: true,
        allowed: false,
        message: 'Not your turn',
        narratorContext: null,
        stopPropagation: true,
      };
    }

    // Validate distance for melee attacks
    if (ctx.action.requiresDiceRoll) {
      const distanceCheck = isAttackValidForDistance(
        ctx.action.rawText,
        state.distance.currentZone,
      );

      if (!distanceCheck.valid) {
        return {
          triggered: true,
          allowed: true, // Allow but warn — the narrator will handle positioning
          message: distanceCheck.warning,
          narratorContext: distanceCheck.warning
            ? `[DISTANCE WARNING: ${distanceCheck.warning} The narrator must describe the character needing to close distance before their attack can connect.]`
            : null,
          stopPropagation: false,
        };
      }
    }

    // Check cooldown (charge cooldown)
    const player = state.players[ctx.actorId];
    if (player?.charge.cooldownTurnsRemaining > 0) {
      return {
        triggered: true,
        allowed: true,
        message: 'Recovering from charged attack — briefly vulnerable',
        narratorContext: `[COOLDOWN: ${player.name} is recovering from a charged attack release. They are briefly vulnerable — describe sluggish movements.]`,
        stopPropagation: false,
      };
    }

    return {
      triggered: true,
      allowed: true,
      message: null,
      narratorContext: null,
      stopPropagation: false,
    };
  },
};
