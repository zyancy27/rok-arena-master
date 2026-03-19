export interface CharacterBehaviorFrameworkInput {
  personality?: string | null;
  mentality?: string | null;
  powers?: string | null;
}

export const CharacterBehaviorFramework = {
  build(input: CharacterBehaviorFrameworkInput) {
    const haystack = `${input.personality || ''} ${input.mentality || ''} ${input.powers || ''}`.toLowerCase();

    return {
      signatureBehaviorPatterns: [
        /curious|scholar/.test(haystack) ? 'tests the unknown before committing' : 'acts once intent is clear',
        /aggressive|rage/.test(haystack) ? 'forces pace under stress' : 'adjusts pace under stress',
      ],
      uniquePressureStyle: [
        /fear|paranoid/.test(haystack) ? 'caution under uncertainty' : 'commitment under uncertainty',
      ],
    };
  },
};
