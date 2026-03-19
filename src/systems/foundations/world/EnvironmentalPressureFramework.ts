export const EnvironmentalPressureFramework = {
  build(environmentTags: string[] = [], activeHazards: string[] = []) {
    return {
      weatherPressure: environmentTags.includes('hazardous') ? ['visibility distortion', 'stress accumulation'] : ['ambient strain'],
      travelPressure: activeHazards.length ? ['rerouting pressure', 'tempo disruption'] : ['normal traversal'],
      socialDensity: environmentTags.includes('occupation_force') ? 'controlled' : 'variable',
      economicTone: environmentTags.includes('ruins') ? 'scarcity economy' : 'localized exchange economy',
    };
  },
};
