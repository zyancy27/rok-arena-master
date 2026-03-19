export const BattleSituationFramework = {
  build(tags: string[] = [], activeHazards: string[] = []) {
    const situationType = activeHazards.length ? 'environmental hazard conflict' : tags.includes('distrust') ? 'social tension escalating into combat' : 'duel';
    return {
      situationType,
      environmentalConflicts: activeHazards.length ? activeHazards : ['space control'],
    };
  },
};
