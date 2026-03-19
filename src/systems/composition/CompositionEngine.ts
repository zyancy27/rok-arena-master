import { BlueprintComposer } from '@/systems/blueprints/BlueprintComposer';
import { TaxonomyComposer } from '@/systems/taxonomy/TaxonomyComposer';
import type { BlueprintComposeInput } from '@/systems/blueprints/BlueprintTypes';

export const CompositionEngine = {
  compose(input: BlueprintComposeInput) {
    const blueprint = BlueprintComposer.compose(input);
    const taxonomy = TaxonomyComposer.compose({
      tags: blueprint.tags,
      traits: blueprint.traits.map((trait) => trait.key),
    });

    return {
      blueprint,
      taxonomy,
    };
  },
};
