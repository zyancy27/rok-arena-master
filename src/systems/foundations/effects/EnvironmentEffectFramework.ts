export const EnvironmentEffectFramework = {
  build(tags: string[] = []) {
    return {
      environmentPersistence: [
        tags.includes('hazardous') ? 'lingering scene residue' : 'ambient carryover',
      ],
      burstImpacts: [
        tags.includes('survival_pressure') ? 'high-impact burst' : 'localized accent burst',
      ],
    };
  },
};
