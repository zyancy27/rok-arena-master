export interface CampaignTensionInput {
  theme?: string | null;
  goal?: string | null;
  characterName?: string | null;
  environmentTags?: string[];
}

export const CampaignTensionGenerator = {
  generate(input: CampaignTensionInput) {
    const theme = (input.theme || '').trim();
    const goal = (input.goal || '').trim();
    const environment = (input.environmentTags || []).slice(0, 2).join(' and ');

    if (theme && goal) return `${theme} collides with ${goal}`;
    if (goal && environment) return `${goal} under pressure from ${environment}`;
    if (theme && input.characterName) return `${input.characterName} is pulled into ${theme}`;
    if (environment) return `${environment} refuses to stay stable`;
    return 'an unstable status quo starts to crack';
  },
};
