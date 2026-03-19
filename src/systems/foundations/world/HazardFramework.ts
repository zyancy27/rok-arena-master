export const HazardFramework = {
  build(environmentTags: string[] = [], activeHazards: string[] = []) {
    const hazardFamilies = activeHazards.length ? activeHazards : environmentTags.includes('hazardous') ? ['unstable terrain'] : ['low-grade ambient risk'];
    return {
      hazardFamilies,
      dangerLogic: hazardFamilies.map((hazard) => `${hazard} shapes movement and timing`),
    };
  },
};
