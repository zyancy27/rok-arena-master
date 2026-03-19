export const CharacterArcFramework = {
  build(identityTags: string[] = [], pressureTags: string[] = []) {
    return {
      startingMask: identityTags.includes('stoic') ? 'self-control' : 'self-image',
      pressurePoint: pressureTags.includes('survival_pressure') ? 'fear of collapse' : 'fear of inadequacy',
      likelyGrowth: identityTags.includes('volatile') ? 'discipline through consequence' : 'clarity through pressure',
    };
  },
};
