import type { CompositionPassInput, CompositionPassOutput } from './AnchorPass';

export const PressurePass = {
  run(input: CompositionPassInput): CompositionPassOutput {
    const tags = [...new Set([
      ...input.tags,
      ...input.tags.some((tag) => /(hazard|combat|ambush|volatile|collapse)/.test(tag)) ? ['high_pressure'] : [],
      ...input.tags.some((tag) => /(stealth|guarded|watchful)/.test(tag)) ? ['controlled_pressure'] : [],
      ...input.tags.some((tag) => /(mystic|ritual|omen)/.test(tag)) ? ['charged_pressure'] : [],
    ])];

    return {
      tags,
      anchors: input.anchors,
      traits: input.traits,
      metadata: {
        pressureSignals: tags.filter((tag) => /pressure/.test(tag)),
      },
    };
  },
};
