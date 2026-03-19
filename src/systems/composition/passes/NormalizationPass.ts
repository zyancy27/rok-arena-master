import type { CompositionPassInput, CompositionPassOutput } from './AnchorPass';

export const NormalizationPass = {
  run(input: CompositionPassInput): CompositionPassOutput {
    return {
      tags: [...new Set(input.tags.filter(Boolean).map((tag) => tag.trim().toLowerCase().replace(/\s+/g, '_')))],
      anchors: [...new Set(input.anchors?.filter(Boolean) || [])],
      traits: [...new Set(input.traits?.filter(Boolean) || [])],
      metadata: {
        normalized: true,
      },
    };
  },
};
