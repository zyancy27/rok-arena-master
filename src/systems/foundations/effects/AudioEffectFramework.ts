export const AudioEffectFramework = {
  build(tags: string[] = []) {
    return {
      audioLayers: [
        tags.includes('audio_reactive') ? 'transient accent cue' : 'ambient texture bed',
        tags.includes('survival_pressure') ? 'low-end tension swell' : 'controlled room tone',
      ],
    };
  },
};
