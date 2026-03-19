export const NpcFactionFramework = {
  build(factionAlignment?: string[] | null) {
    const alignment = factionAlignment?.length ? factionAlignment : ['unaligned'];
    return {
      factionAlignment: alignment,
      loyaltyProfile: alignment.some((entry) => /empire|order|legion|state/.test(entry.toLowerCase())) ? ['institutional loyalty'] : ['local loyalty'],
    };
  },
};
