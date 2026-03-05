/**
 * Rule: Charge Attack Validation
 *
 * Enforces charge attack restrictions — no offensive actions while charging,
 * defense-only with reduced dodge.
 */

import type { CombatRule, RuleContext, RuleResult } from './ruleEngine';
import { validateChargeAction, getChargeDefenseMultiplier } from '@/lib/battle-charge';

export const ruleChargeAttack: CombatRule = {
  id: 'charge_attack',
  name: 'Charge Attack Restrictions',
  priority: 10,

  trigger(ctx: RuleContext): boolean {
    const player = ctx.state.players[ctx.actorId];
    return player?.charge.isCharging === true;
  },

  execute(ctx: RuleContext): RuleResult {
    const player = ctx.state.players[ctx.actorId]!;
    const validation = validateChargeAction(ctx.action.rawText);
    const defenseMultiplier = getChargeDefenseMultiplier(player.charge);

    if (!validation.allowed) {
      return {
        triggered: true,
        allowed: false,
        message: validation.reason,
        narratorContext: `[CHARGE RESTRICTION: ${player.name} is charging and cannot attack. Only defensive actions are permitted.]`,
        stopPropagation: true,
      };
    }

    return {
      triggered: true,
      allowed: true,
      message: validation.reason || null,
      narratorContext: `[CHARGING: ${player.name} is locked in concentration. Defense multiplier: x${defenseMultiplier.toFixed(2)}]`,
      stopPropagation: false,
    };
  },
};
