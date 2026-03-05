/**
 * Rule: Construct Creation
 *
 * Validates and processes construct creation from player actions.
 */

import type { CombatRule, RuleContext, RuleResult } from './ruleEngine';
import { detectConstructCreation } from '@/lib/battle-dice';

export const ruleConstructCreation: CombatRule = {
  id: 'construct_creation',
  name: 'Construct Creation',
  priority: 30,

  trigger(ctx: RuleContext): boolean {
    const detection = detectConstructCreation(ctx.action.rawText);
    return detection.isCreating;
  },

  execute(ctx: RuleContext): RuleResult {
    const detection = detectConstructCreation(ctx.action.rawText);
    const player = ctx.state.players[ctx.actorId];

    // Check if player has enough power to create constructs
    const powerStat = player?.stats.stat_power ?? 50;
    if (powerStat < 15 && (player?.tier ?? 1) <= 2) {
      return {
        triggered: true,
        allowed: false,
        message: `Insufficient power (${powerStat}) to create constructs at this tier`,
        narratorContext: `[CONSTRUCT BLOCKED: ${player?.name ?? 'Player'} lacks the power to manifest constructs. Describe their attempt failing — energy fizzling, the construct flickering and dissipating.]`,
        stopPropagation: false,
      };
    }

    return {
      triggered: true,
      allowed: true,
      message: `Creating ${detection.constructType}: ${detection.suggestedName}`,
      narratorContext: `[CONSTRUCT CREATION: ${player?.name ?? 'Player'} is creating a ${detection.constructType} construct: "${detection.suggestedName}". Describe its formation vividly.]`,
      stopPropagation: false,
    };
  },
};
