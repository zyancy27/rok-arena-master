import type { CompositionPassInput, CompositionPassOutput } from './AnchorPass';

export const NarrativeImplicationPass = {
  run(input: CompositionPassInput): CompositionPassOutput {
    const narrativeTags = [
      ...input.tags.some((tag) => /(high_pressure|critical|volatile)/.test(tag)) ? ['momentum_swings_likely'] : [],
      ...input.tags.some((tag) => /(stealth|watchful|guarded)/.test(tag)) ? ['revelation_through_patience'] : [],
      ...input.tags.some((tag) => /(mystic|ritual|omen)/.test(tag)) ? ['hidden_logic_shapes_the_scene'] : [],
      ...input.tags.some((tag) => /(occupation|checkpoint|authority)/.test(tag)) ? ['authority_pressure_is_active'] : [],
    ];

    return {
      tags: [...new Set([...input.tags, ...narrativeTags])],
      anchors: input.anchors,
      traits: input.traits,
      metadata: {
        narrativeImplications: narrativeTags,
      },
    };
  },
};
