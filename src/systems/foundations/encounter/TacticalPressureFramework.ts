export const TacticalPressureFramework = {
  build(rangeState?: string | null, activeHazards: string[] = []) {
    return {
      tacticalPressure: [
        rangeState ? `${rangeState} range tempo` : 'mid-range uncertainty',
        activeHazards.length ? 'hazard-aware movement' : 'lane contest',
      ],
    };
  },
};
