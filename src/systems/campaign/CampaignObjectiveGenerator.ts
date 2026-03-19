export interface CampaignObjectiveInput {
  goal?: string | null;
  theme?: string | null;
  location?: string | null;
}

export const CampaignObjectiveGenerator = {
  generate(input: CampaignObjectiveInput) {
    const goal = input.goal?.trim();
    const theme = input.theme?.trim();
    const location = input.location?.trim();

    return [
      goal ? `secure ${goal}` : null,
      location ? `reach ${location}` : 'reach the unstable center',
      theme ? `understand the truth behind ${theme}` : 'identify the real pressure source',
      'survive the first reversal',
    ].filter((entry): entry is string => Boolean(entry));
  },
};
