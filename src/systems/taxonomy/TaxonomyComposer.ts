import { TagRegistry } from './TagRegistry';
import { TraitRegistry } from './TraitRegistry';

export interface TaxonomyComposeInput {
  tags?: string[];
  traits?: string[];
}

export const TaxonomyComposer = {
  compose(input: TaxonomyComposeInput) {
    const tags = [...new Set((input.tags || []).filter((tag) => TagRegistry.get(tag)))];
    const traits = [...new Set((input.traits || []).filter((trait) => TraitRegistry.get(trait)))];

    return {
      tags,
      traits,
      categories: {
        tagCategories: [...new Set(tags.map((tag) => TagRegistry.get(tag)?.category).filter(Boolean))],
        traitCategories: [...new Set(traits.map((trait) => TraitRegistry.get(trait)?.category).filter(Boolean))],
      },
    };
  },
};
