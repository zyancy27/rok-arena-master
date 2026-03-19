export const CampaignPacingFramework = {
  build(conflictDensity: 'low' | 'medium' | 'high' = 'medium') {
    const pacingCurve = conflictDensity === 'high'
      ? ['immediate hook', 'compounding pressure', 'hard turn', 'counterplay', 'payoff']
      : ['hook', 'exploration', 'complication', 'escalation', 'payoff'];

    return {
      pacingCurve,
      progressionShape: conflictDensity === 'high' ? ['sharp rise', 'compressed midpoint', 'volatile finish'] : ['steady rise', 'midpoint reveal', 'earned resolution'],
    };
  },
};
