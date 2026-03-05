/**
 * Rule: Environment Interaction
 *
 * Rewards creative environmental play with momentum bonuses
 * and provides narrator context for terrain usage.
 */

import type { CombatRule, RuleContext, RuleResult } from './ruleEngine';
import { detectEnvironmentInteraction } from '../intent/detectEnvironmentInteraction';

export const ruleEnvironmentInteraction: CombatRule = {
  id: 'environment_interaction',
  name: 'Environmental Interaction',
  priority: 40,

  trigger(ctx: RuleContext): boolean {
    const interaction = detectEnvironmentInteraction(ctx.action.rawText);
    return interaction.offensiveUse || interaction.defensiveUse;
  },

  execute(ctx: RuleContext): RuleResult {
    const interaction = detectEnvironmentInteraction(ctx.action.rawText);
    const player = ctx.state.players[ctx.actorId];
    const elements = interaction.referencedElements.join(', ');

    let narratorCtx = `[ENVIRONMENT INTERACTION: ${player?.name ?? 'Player'} is using the terrain`;
    if (interaction.offensiveUse) narratorCtx += ' offensively';
    if (interaction.defensiveUse) narratorCtx += interaction.offensiveUse ? ' and defensively' : ' defensively';
    narratorCtx += `. Referenced elements: ${elements || 'general terrain'}.`;
    narratorCtx += ` Creativity score: ${interaction.creativityScore}/10.`;
    narratorCtx += ' Reward creative play with vivid descriptions of how the environment responds.]';

    return {
      triggered: true,
      allowed: true,
      message: null,
      narratorContext: narratorCtx,
      stopPropagation: false,
    };
  },
};
