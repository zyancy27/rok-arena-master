import { BlueprintRegistry } from './BlueprintRegistry';
import { BlueprintValidator } from './BlueprintValidator';
import type { BlueprintBase, BlueprintComposeInput, BlueprintCompositionResult, WeightedTrait } from './BlueprintTypes';

function mergeTraits(...traitSets: WeightedTrait[][]): WeightedTrait[] {
  const merged = new Map<string, WeightedTrait>();

  for (const trait of traitSets.flat()) {
    const existing = merged.get(trait.key);
    if (!existing || trait.weight > existing.weight) {
      merged.set(trait.key, trait);
    }
  }

  return [...merged.values()].sort((a, b) => b.weight - a.weight);
}

function mergeBlueprints(blueprints: BlueprintBase[], overrides?: Record<string, unknown>) {
  const tags = [...new Set(blueprints.flatMap((blueprint) => [
    ...(blueprint.defaults?.tags || []),
    ...blueprint.tags,
  ]))];

  const payload = blueprints.reduce<Record<string, unknown>>((acc, blueprint) => ({
    ...acc,
    ...(blueprint.defaults?.fields || {}),
    ...blueprint.payload,
  }), {});

  return {
    tags,
    traits: mergeTraits(...blueprints.map((blueprint) => [
      ...(blueprint.defaults?.traits || []),
      ...(blueprint.weightedTraits || []),
    ])),
    payload: {
      ...payload,
      ...(overrides || {}),
    },
  };
}

export const BlueprintComposer = {
  compose<TPayload extends Record<string, unknown> = Record<string, unknown>>(input: BlueprintComposeInput): BlueprintCompositionResult<TPayload> {
    const selected = (input.blueprintIds || [])
      .flatMap((id) => BlueprintRegistry.resolveLineage(id))
      .filter((blueprint, index, list) => list.findIndex((item) => item.id === blueprint.id) === index)
      .filter((blueprint) => !input.kind || blueprint.kind === input.kind);

    const validBlueprints = selected.filter((blueprint) => BlueprintValidator.validate(blueprint).valid);
    const composed = mergeBlueprints(validBlueprints, input.overrides);

    const composedBlueprintIds = validBlueprints.flatMap((blueprint) => blueprint.composes?.map((ref) => ref.id) || []);

    return {
      blueprintIds: validBlueprints.map((blueprint) => blueprint.id),
      tags: [...new Set([...(input.tags || []), ...composed.tags])],
      traits: composed.traits,
      payload: composed.payload as TPayload,
      metadata: {
        inheritedFrom: validBlueprints.flatMap((blueprint) => blueprint.extends || []),
        composedFrom: composedBlueprintIds,
        seed: input.seed || validBlueprints.map((blueprint) => blueprint.id).join('|') || 'default-seed',
      },
    };
  },
};
