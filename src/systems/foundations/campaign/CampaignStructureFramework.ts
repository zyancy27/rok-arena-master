export const CampaignStructureFramework = {
  build(theme?: string | null, goal?: string | null) {
    return {
      centralTension: theme || goal || 'a fragile order is under pressure',
      openingHook: goal ? `A first move toward ${goal} creates immediate resistance.` : 'A manageable situation reveals deeper instability.',
      likelyObjectives: goal ? [goal, 'survive the first complication', 'identify the real pressure source'] : ['stabilize the immediate problem', 'discover who benefits', 'secure an ally'],
    };
  },
};
