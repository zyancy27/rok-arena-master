export interface CharacterExpressionFrameworkInput {
  personality?: string | null;
  appearanceAura?: string | null;
  appearanceMovementStyle?: string | null;
  appearanceVoice?: string | null;
}

export const CharacterExpressionFramework = {
  build(input: CharacterExpressionFrameworkInput) {
    const haystack = `${input.personality || ''} ${input.appearanceAura || ''} ${input.appearanceMovementStyle || ''} ${input.appearanceVoice || ''}`.toLowerCase();

    return {
      expressionIdentity: [
        /cold|stoic|quiet/.test(haystack) ? 'restrained delivery' : 'expressive delivery',
        /heavy|slow/.test(haystack) ? 'weighted physical expression' : 'fluid physical expression',
      ],
      narrativeTone: [
        /ominous|dark/.test(haystack) ? 'ominous emphasis' : 'grounded emphasis',
      ],
    };
  },
};
