export const NpcPersonalityFramework = {
  build(personality?: string | null) {
    const haystack = (personality || '').toLowerCase();
    return {
      personalityCluster: [
        /calm|patient|measured/.test(haystack) ? 'measured' : 'immediate',
        /cruel|ruthless/.test(haystack) ? 'hard-edged' : 'socially readable',
      ],
      fearProfile: [
        /coward|fearful|anxious/.test(haystack) ? 'fearful under direct threat' : 'fear managed through role',
      ],
    };
  },
};
