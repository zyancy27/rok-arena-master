import { FallbackReplacementRules } from '@/systems/constraints/FallbackReplacementRules';
import type { CompositionPassInput, CompositionPassOutput } from './AnchorPass';

export const GapFillPass = {
  run(input: CompositionPassInput): CompositionPassOutput {
    const fallback = FallbackReplacementRules.resolve(input.tags, input.kind);

    return {
      tags: fallback.tags,
      anchors: input.anchors,
      traits: input.traits,
      metadata: {
        replacements: fallback.replacements,
      },
    };
  },
};
