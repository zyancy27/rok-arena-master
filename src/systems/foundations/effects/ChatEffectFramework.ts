export const ChatEffectFramework = {
  build(tags: string[] = []) {
    return {
      chatBehaviors: [
        tags.includes('hazardous') ? 'overlay drift' : 'subtle background motion',
        tags.includes('survival_pressure') ? 'urgent pulse pattern' : 'measured emphasis pattern',
        tags.includes('audio_reactive') ? 'text-reactive highlight' : 'contextual highlight',
      ],
    };
  },
};
