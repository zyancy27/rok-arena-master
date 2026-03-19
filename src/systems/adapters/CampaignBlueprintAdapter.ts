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
    return {
      id: input.id || `campaign:${input.name || 'unknown'}`,
      kind: 'campaign',
      name: input.name || 'Unnamed Campaign',
      tags: [...new Set((input.environment_tags || []).filter(Boolean))],
      optionalFields: ['description', 'story_context', 'world_state'],
      payload: {
        centralTension: String(storyContext.centralTension || input.description || 'a region under unstable pressure'),
        openingHook: String(storyContext.openingHook || `Something in ${input.current_zone || input.chosen_location || 'the region'} no longer holds together cleanly.`),
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
