export const CampaignPressureFramework = {
  build(tags: string[] = [], worldState?: Record<string, unknown> | null) {
    return {
      pressureSources: [
        tags.includes('survival_pressure') ? 'survival pressure' : 'resource strain',
        Number(worldState?.dangerLevel ?? 0) > 50 ? 'regional instability' : 'localized friction',
      ],
      worldFriction: tags.includes('distrust') ? ['social mistrust', 'fragmented cooperation'] : ['competing needs', 'limited room for error'],
      conflictDensity: Number(worldState?.dangerLevel ?? 0) > 60 ? 'high' as const : 'medium' as const,
      mysteryDensity: tags.includes('mystic') ? 'high' as const : 'medium' as const,
    };
  },
};
