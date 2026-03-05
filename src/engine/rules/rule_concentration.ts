/**
 * Rule: Concentration Availability
 *
 * Checks if concentration (offensive or defensive) can be used
 * based on gap threshold and remaining uses.
 */

import type { CombatRule, RuleContext, RuleResult } from './ruleEngine';
import { CONCENTRATION_GAP_THRESHOLD } from '@/lib/battle-dice';

export const ruleConcentration: CombatRule = {
  id: 'concentration',
  name: 'Concentration Availability',
  priority: 50,

  trigger(ctx: RuleContext): boolean {
    // Triggers when a hit/miss is close enough for concentration
    const player = ctx.state.players[ctx.actorId];
    return (player?.concentrationUsesLeft ?? 0) > 0;
  },

  execute(ctx: RuleContext): RuleResult {
    const player = ctx.state.players[ctx.actorId]!;
    const usesLeft = player.concentrationUsesLeft;

    return {
      triggered: true,
      allowed: true,
      message: `Concentration available: ${usesLeft} uses remaining`,
      narratorContext: null,
      stopPropagation: false,
    };
  },
};
