export const WorldRegionFramework = {
  build(regionType?: string | null, environmentTags: string[] = []) {
    const normalized = regionType || (environmentTags.includes('ruins') ? 'ruined frontier' : 'contested region');
    return {
      regionType: normalized,
      terrainLogic: environmentTags.includes('ruins') ? ['broken sightlines', 'unstable structures'] : ['mixed traversal lanes', 'navigable chokepoints'],
      culturalFlavor: environmentTags.includes('mystic') ? ['ritual traces', 'symbol-heavy spaces'] : ['utilitarian local culture'],
    };
  },
};
