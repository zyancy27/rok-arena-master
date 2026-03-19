import type { CampaignBlueprint } from '@/systems/foundations/campaign/CampaignBlueprint';

export interface CampaignBlueprintAdapterInput {
  id?: string;
  name?: string | null;
  description?: string | null;
  current_zone?: string | null;
  chosen_location?: string | null;
  environment_tags?: string[] | null;
  world_state?: Record<string, unknown> | null;
  story_context?: Record<string, unknown> | null;
}

export const CampaignBlueprintAdapter = {
  fromCampaign(input: CampaignBlueprintAdapterInput): CampaignBlueprint {
    const storyContext = input.story_context || {};
    const theme = String(storyContext.theme || input.description || '').trim();
    const goal = String(storyContext.goal || '').trim();
    const zone = input.current_zone || input.chosen_location || 'the region';

    return {
      id: input.id || `campaign:${input.name || 'unknown'}`,
      kind: 'campaign',
      name: input.name || 'Unnamed Campaign',
      tags: [...new Set((input.environment_tags || []).filter(Boolean))],
      optionalFields: ['description', 'story_context', 'world_state'],
      requiredAnchors: [
        { key: 'centralTension', required: true, fallback: theme || goal || 'a region under unstable pressure' },
        { key: 'openingHook', required: true, fallback: `Something in ${zone} no longer holds together cleanly.` },
      ],
      optionalModules: [
        {
          id: 'goal-led-arc',
          weight: goal ? 0.95 : 0.25,
          tags: ['goal_driven', 'forward_pressure'],
          traits: [{ key: 'objective_density', weight: goal ? 90 : 35 }],
        },
        {
          id: 'mystic-arc',
          weight: (input.environment_tags || []).includes('mystic') ? 0.85 : 0.2,
          requires: ['mystic'],
          tags: ['mystic', 'reversal_potential'],
          traits: [{ key: 'mystery_density', weight: 82 }],
        },
      ],
      constraints: [
        {
          id: 'low-tech-world-blocks-cosmic-tone',
          type: 'fallback_tag',
          value: 'cosmic',
          replacement: 'grounded',
          severity: (input.environment_tags || []).includes('low_tech') ? 'hard' : 'soft',
          message: 'Low-tech grounded campaigns should not default to cosmic descriptors unless explicitly supported.',
        },
      ],
      outputNormalization: ['campaign-seed-packet', 'story-logic-packet'],
      derivationHooks: ['stakes_generation', 'escalation_logic', 'npc_distribution'],
      payload: {
        centralTension: String(storyContext.centralTension || input.description || 'a region under unstable pressure'),
        openingHook: String(storyContext.openingHook || `Something in ${zone} no longer holds together cleanly.`),
        environmentalIdentity: input.environment_tags || [],
        progressionShape: ['opening stress', 'pressure reveal', 'escalation', 'payoff'],
      },
      metadata: {
        currentZone: input.current_zone,
        chosenLocation: input.chosen_location,
        worldState: input.world_state,
      },
    };
  },
};

