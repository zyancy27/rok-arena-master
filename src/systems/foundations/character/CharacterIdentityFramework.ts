export interface CharacterIdentityFrameworkInput {
  personality?: string | null;
  mentality?: string | null;
  lore?: string | null;
  race?: string | null;
  subRace?: string | null;
  level?: number | null;
}

const tokenize = (...values: Array<string | null | undefined>) => values
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

export const CharacterIdentityFramework = {
  build(input: CharacterIdentityFrameworkInput) {
    const haystack = tokenize(input.personality, input.mentality, input.lore, input.race, input.subRace);

    return {
      socialIdentity: [
        /leader|command|noble/.test(haystack) ? 'commanding presence' : 'adaptive presence',
        /quiet|calm|stoic/.test(haystack) ? 'controlled demeanor' : 'emotionally legible',
      ],
      expressionIdentity: [
        /rage|wrath|aggressive/.test(haystack) ? 'explosive expression' : 'measured expression',
        /mystic|scholar|curious/.test(haystack) ? 'observant speech pattern' : 'direct speech pattern',
      ],
      narrativeTone: [
        input.level && input.level >= 5 ? 'high-stakes competence' : 'emergent growth',
        /dark|grim/.test(haystack) ? 'grim undertone' : 'grounded adventure tone',
      ],
      tags: [
        /stoic/.test(haystack) ? 'stoic' : 'volatile',
        /mystic|arcane|psychic/.test(haystack) ? 'mystic' : 'melee',
      ],
    };
  },
};
