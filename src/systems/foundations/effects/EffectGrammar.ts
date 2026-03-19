export const EffectGrammar = {
  compose(tags: string[] = []) {
    return {
      intensity: tags.includes('survival_pressure') ? 'high' : 'medium',
      cadence: tags.includes('audio_reactive') ? 'reactive' : 'steady',
      persistence: tags.includes('hazardous') ? 'lingering' : 'burst',
    };
  },
};
