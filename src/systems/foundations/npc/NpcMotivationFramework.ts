export const NpcMotivationFramework = {
  build(goal?: string | null, motivation?: string | null) {
    const goalValue = goal || 'maintain current advantage';
    const motivationValue = motivation || 'protect current position';

    return {
      motivations: [goalValue, motivationValue],
      loyaltyProfile: [/duty|oath|protect/.test(`${goalValue} ${motivationValue}`.toLowerCase()) ? 'duty-bound' : 'self-preserving'],
    };
  },
};
