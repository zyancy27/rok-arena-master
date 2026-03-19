import { DependencyRules } from './DependencyRules';
import { DominanceRules } from './DominanceRules';
import { FallbackReplacementRules } from './FallbackReplacementRules';
import { IncompatibilityRules } from './IncompatibilityRules';

export interface ConstraintEngineInput {
  kind?: string;
  tags: string[];
  anchors?: string[];
  traits?: string[];
}

export interface ConstraintEngineResult {
  tags: string[];
  conflicts: string[];
  softSignals: string[];
  replacements: string[];
}

export const ConstraintEngine = {
  apply(input: ConstraintEngineInput): ConstraintEngineResult {
    const seeded = [...new Set([...(input.tags || []), ...((input.anchors || []).map((anchor) => `anchor:${anchor}`))])];
    const dependency = DependencyRules.resolve(seeded);
    const incompatibility = IncompatibilityRules.resolve(dependency.tags);
    const dominance = DominanceRules.resolve(incompatibility.tags);
    const fallback = FallbackReplacementRules.resolve(dominance.tags, input.kind);

    const softSignals = [
      ...(input.traits || []).filter((trait) => /(loyal|reckless|protective|curious|cautious)/.test(trait)).map((trait) => `trait:${trait}`),
      ...dependency.added.map((tag) => `dependency:${tag}`),
      ...dominance.removed.map((tag) => `dominance:${tag}`),
    ];

    return {
      tags: [...new Set(fallback.tags)],
      conflicts: [...new Set(incompatibility.conflicts)],
      softSignals: [...new Set(softSignals)],
      replacements: [...new Set([...fallback.replacements, ...incompatibility.removed, ...dominance.removed])],
    };
  },
};
