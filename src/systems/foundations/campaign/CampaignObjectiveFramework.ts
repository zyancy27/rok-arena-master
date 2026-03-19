export const CampaignObjectiveFramework = {
  build(goal?: string | null, currentZone?: string | null) {
    return {
      likelyObjectives: [
        goal || 'create a foothold',
        currentZone ? `stabilize conditions in ${currentZone}` : 'stabilize the local region',
        'identify the next unavoidable conflict',
      ],
    };
  },
};
