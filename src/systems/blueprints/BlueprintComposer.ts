import { BlueprintRegistry } from './BlueprintRegistry';
import { BlueprintValidator } from './BlueprintValidator';
import type {
  BlueprintBase,
  BlueprintComposeInput,
  BlueprintCompositionResult,
  BlueprintConstraint,
  BlueprintModule,
  BlueprintValue,
  WeightedTrait,
} from './BlueprintTypes';

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function normalizeString(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeValue(value: unknown): BlueprintValue {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry) => entry !== undefined && entry !== null);

    const allStrings = normalized.every((entry) => typeof entry === 'string');
    return allStrings
      ? [...new Set((normalized as string[]).map((entry) => entry.trim()).filter(Boolean))]
      : (normalized as Array<Record<string, unknown>>);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      if (entry === undefined) return acc;
      acc[key] = normalizeValue(entry);
      return acc;
    }, {});
  }

  return (typeof value === 'string' ? value.trim() : value) as BlueprintValue;
}

function mergeTraits(traitSets: WeightedTrait[][], weights: Record<string, number> = {}): WeightedTrait[] {
  const merged = new Map<string, WeightedTrait>();

  for (const trait of traitSets.flat()) {
    const weightedTrait = {
      ...trait,
      weight: trait.weight * (weights[trait.key] ?? 1),
    };
    const existing = merged.get(weightedTrait.key);
    if (!existing || weightedTrait.weight > existing.weight) {
      merged.set(weightedTrait.key, weightedTrait);
    }
  }

  return [...merged.values()].sort((a, b) => b.weight - a.weight);
}

function collectSelectedBlueprints(input: BlueprintComposeInput) {
  const lineage = (input.blueprintIds || [])
    .flatMap((id) => BlueprintRegistry.resolveLineage(id))
    .filter((blueprint, index, list) => list.findIndex((item) => item.id === blueprint.id) === index)
    .filter((blueprint) => !input.kind || blueprint.kind === input.kind);

  const composed = lineage
    .flatMap((blueprint) => blueprint.composes?.map((ref) => BlueprintRegistry.get(ref.id)) || [])
    .filter((blueprint): blueprint is BlueprintBase => Boolean(blueprint))
    .flatMap((blueprint) => BlueprintRegistry.resolveLineage(blueprint.id));

  return [...new Map([...lineage, ...composed].map((blueprint) => [blueprint.id, blueprint])).values()];
}

function selectModules(blueprints: BlueprintBase[], currentTags: string[]) {
  const tagSet = new Set(currentTags);
  const modules = [...new Map(
    blueprints
      .flatMap((blueprint) => blueprint.optionalModules || [])
      .filter((module) => !(module.excludes || []).some((excluded) => tagSet.has(excluded)))
      .filter((module) => (module.requires || []).every((required) => tagSet.has(required)))
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .map((module) => [module.id, module]),
  ).values()];

  return modules;
}

function composePayload(blueprints: BlueprintBase[], modules: BlueprintModule[], overrides?: Record<string, unknown>) {
  const payload = blueprints.reduce<Record<string, unknown>>((acc, blueprint) => ({
    ...acc,
    ...(blueprint.defaults?.fields || {}),
    ...blueprint.payload,
  }), {});

  const moduleDefaults = modules.reduce<Record<string, unknown>>((acc, module) => ({
    ...acc,
    ...(module.defaults || {}),
  }), {});

  return {
    ...payload,
    ...moduleDefaults,
    ...(overrides || {}),
  };
}

function resolveAnchors(blueprints: BlueprintBase[], payload: Record<string, unknown>) {
  const anchors = uniq(blueprints.flatMap((blueprint) => blueprint.requiredAnchors?.map((anchor) => anchor.key) || []));
  const anchoredPayload = { ...payload };

  for (const blueprint of blueprints) {
    for (const anchor of blueprint.requiredAnchors || []) {
      if (anchoredPayload[anchor.key] === undefined && anchor.fallback !== undefined) {
        anchoredPayload[anchor.key] = anchor.fallback;
      }
    }
  }

  return { anchors, payload: anchoredPayload };
}

function evaluateConstraint(
  constraint: BlueprintConstraint,
  state: { tags: Set<string>; traits: Set<string>; payload: Record<string, unknown> },
) {
  const payloadValue = constraint.field ? state.payload[constraint.field] : undefined;

  switch (constraint.type) {
    case 'requires_tag':
      return typeof constraint.value === 'string' ? state.tags.has(constraint.value) : true;
    case 'excludes_tag':
    case 'incompatible_with':
      return typeof constraint.value === 'string' ? !state.tags.has(constraint.value) : true;
    case 'required_field':
      return constraint.field ? payloadValue !== undefined && payloadValue !== null && payloadValue !== '' : true;
    case 'requires_trait':
      return typeof constraint.value === 'string' ? state.traits.has(constraint.value) : true;
    case 'excludes_trait':
      return typeof constraint.value === 'string' ? !state.traits.has(constraint.value) : true;
    case 'matches_field':
      return constraint.field ? payloadValue === constraint.value : true;
    case 'min_value':
      return typeof constraint.value === 'number' && typeof payloadValue === 'number' ? payloadValue >= constraint.value : true;
    case 'max_value':
      return typeof constraint.value === 'number' && typeof payloadValue === 'number' ? payloadValue <= constraint.value : true;
    default:
      return true;
  }
}

function applyConstraints(
  constraints: BlueprintConstraint[],
  state: { tags: string[]; traits: WeightedTrait[]; payload: Record<string, unknown> },
) {
  const tags = new Set(state.tags);
  const traits = new Set(state.traits.map((trait) => trait.key));
  const conflicts: string[] = [];
  const softSignals: string[] = [];

  for (const constraint of constraints) {
    const valid = evaluateConstraint(constraint, { tags, traits, payload: state.payload });
    if (valid) continue;

    const message = constraint.message || constraint.id;
    if (constraint.type === 'fallback_tag' && typeof constraint.value === 'string') {
      tags.delete(constraint.value);
      if (constraint.replacement) tags.add(constraint.replacement);
      softSignals.push(`fallback:${message}`);
      continue;
    }

    if (constraint.severity === 'soft') {
      softSignals.push(message);
      if (constraint.replacement) tags.add(constraint.replacement);
      continue;
    }

    if ((constraint.type === 'excludes_tag' || constraint.type === 'incompatible_with') && typeof constraint.value === 'string') {
      tags.delete(constraint.value);
      if (constraint.replacement) tags.add(constraint.replacement);
    }

    conflicts.push(message);
  }

  return {
    tags: [...tags],
    softSignals,
    conflicts,
  };
}

function applyIncompatibilities(blueprints: BlueprintBase[], tags: string[]) {
  const tagSet = new Set(tags);
  const removed: string[] = [];

  for (const blueprint of blueprints) {
    for (const incompatible of blueprint.incompatibilities || []) {
      if (tagSet.has(incompatible)) {
        tagSet.delete(incompatible);
        removed.push(`removed incompatible tag:${incompatible}`);
      }
    }
  }

  return {
    tags: [...tagSet],
    removed,
  };
}

export const BlueprintComposer = {
  compose<TPayload extends Record<string, unknown> = Record<string, unknown>>(input: BlueprintComposeInput): BlueprintCompositionResult<TPayload> {
    const selected = collectSelectedBlueprints(input).filter((blueprint) => BlueprintValidator.validate(blueprint).valid);
    const seed = input.seed || selected.map((blueprint) => blueprint.id).join('|') || 'default-seed';
    const passLog: string[] = ['anchor-pass:start'];

    const initialTags = uniq([
      ...(input.tags || []),
      ...selected.flatMap((blueprint) => [...(blueprint.defaults?.tags || []), ...blueprint.tags]).map(normalizeString),
    ]);

    const modules = selectModules(selected, initialTags);
    passLog.push(`gap-fill-pass:modules=${modules.map((module) => module.id).join(',') || 'none'}`);

    const traits = mergeTraits([
      ...selected.map((blueprint) => [
        ...(blueprint.defaults?.traits || []),
        ...(blueprint.weightedTraits || []),
      ]),
      modules.map((module) => module.traits || []),
    ], input.weights);

    let payload = composePayload(selected, modules, input.overrides);
    const anchorResolution = resolveAnchors(selected, payload);
    payload = anchorResolution.payload;
    passLog.push(`anchor-pass:resolved=${anchorResolution.anchors.join(',') || 'none'}`);

    const moduleTags = uniq(modules.flatMap((module) => module.tags || []).map(normalizeString));
    const traitTags = uniq(traits.flatMap((trait) => trait.tags || []).map(normalizeString));
    const derivedTags = uniq([
      ...moduleTags,
      ...traitTags,
      ...traits.filter((trait) => trait.weight >= 70).map((trait) => normalizeString(`trait_${trait.key}`)),
    ]);

    const incompatibilityResolution = applyIncompatibilities(selected, [...initialTags, ...moduleTags, ...traitTags, ...derivedTags]);
    passLog.push('compatibility-pass:incompatibilities-applied');

    const constraintResolution = applyConstraints(
      selected.flatMap((blueprint) => blueprint.constraints || []),
      {
        tags: incompatibilityResolution.tags,
        traits,
        payload,
      },
    );
    passLog.push('compatibility-pass:constraints-applied');

    const normalizedPayload = Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key] = normalizeValue(value);
      return acc;
    }, {});
    passLog.push('normalization-pass:payload-normalized');

    passLog.push(`pressure-pass:traits=${traits.length}`);
    passLog.push(`narrative-implication-pass:derived-tags=${derivedTags.length}`);
    passLog.push('effect-derivation-pass:ready');

    const composedBlueprintIds = selected.flatMap((blueprint) => blueprint.composes?.map((ref) => ref.id) || []);
    const normalizedOutputs = uniq(selected.flatMap((blueprint) => blueprint.outputNormalization || []));

    return {
      blueprintIds: selected.map((blueprint) => blueprint.id),
      tags: uniq([...constraintResolution.tags, ...(input.tags || []).map(normalizeString)]),
      traits,
      payload: normalizedPayload as TPayload,
      metadata: {
        inheritedFrom: uniq(selected.flatMap((blueprint) => blueprint.extends || [])),
        composedFrom: uniq(composedBlueprintIds),
        seed,
        anchors: anchorResolution.anchors,
        modules: modules.map((module) => module.id),
        passLog,
        conflicts: [...constraintResolution.conflicts, ...incompatibilityResolution.removed],
        softSignals: constraintResolution.softSignals,
        derivedTags,
        normalizedOutputs,
      },
    };
  },
};
