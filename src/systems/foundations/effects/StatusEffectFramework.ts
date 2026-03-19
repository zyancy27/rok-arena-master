export const StatusEffectFramework = {
  build(tags: string[] = []) {
    return {
      statusOverlays: [
        tags.includes('hazardous') ? 'hazard veil' : 'state tint',
        tags.includes('distrust') ? 'fracture edge' : 'clean frame edge',
      ],
    };
  },
};
