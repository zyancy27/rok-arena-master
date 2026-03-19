export const VisualEffectFramework = {
  build(tags: string[] = []) {
    return {
      visualLayers: [
        tags.includes('hazardous') ? 'environmental haze' : 'ambient gradient shift',
        tags.includes('survival_pressure') ? 'impact pulse' : 'low-frequency shimmer',
      ],
    };
  },
};
