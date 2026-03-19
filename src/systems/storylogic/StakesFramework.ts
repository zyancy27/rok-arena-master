export const StakesFramework = {
  build(tags: string[] = [], explicitStakes?: string[]) {
    if (explicitStakes?.length) return explicitStakes;
    const stakes = ['safety', 'momentum'];
    if (tags.includes('distrust')) stakes.push('alliance stability');
    if (tags.includes('hazardous')) stakes.push('environmental survival');
    if (tags.includes('mystic')) stakes.push('truth and consequence');
    return [...new Set(stakes)];
  },
};
