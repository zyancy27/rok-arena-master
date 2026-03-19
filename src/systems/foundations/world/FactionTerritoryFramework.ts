export const FactionTerritoryFramework = {
  build(factionPresence: string[] = [], environmentTags: string[] = []) {
    return {
      factionPresence: factionPresence.length ? factionPresence : [environmentTags.includes('occupation_force') ? 'occupation force' : 'local actors'],
      pointsOfInterest: environmentTags.includes('ruins') ? ['collapsed transit node', 'salvage pocket'] : ['watch post', 'crossroads'],
    };
  },
};
