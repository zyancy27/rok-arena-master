import { ConstraintEngine } from '@/systems/constraints/ConstraintEngine';
import type { CompositionPassInput, CompositionPassOutput } from './AnchorPass';

export const CompatibilityPass = {
  run(input: CompositionPassInput): CompositionPassOutput {
    const resolution = ConstraintEngine.apply({
      kind: input.kind,
      tags: input.tags,
      anchors: input.anchors,
      traits: input.traits,
    });

    return {
      tags: resolution.tags,
      anchors: input.anchors,
      traits: input.traits,
      metadata: {
        conflicts: resolution.conflicts,
        softSignals: resolution.softSignals,
      },
    };
  },
};
