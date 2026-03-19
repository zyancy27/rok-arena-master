export const ConflictFramework = {
  build(conflictSeed?: string | null, tags: string[] = []) {
    const core = conflictSeed || 'opposing goals under pressure';
    const type = tags.includes('survival_pressure') ? 'survival' : tags.includes('occupation_force') ? 'territorial' : 'ideological';

    return {
      core,
      type,
      escalationDrivers: tags.includes('hazardous') ? ['environmental collapse', 'time pressure'] : ['resource pressure', 'rival action'],
    };
  },
};
