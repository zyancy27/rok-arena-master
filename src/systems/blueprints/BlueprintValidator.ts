import type {
  BlueprintAnchor,
  BlueprintBase,
  BlueprintConstraint,
  BlueprintValidationIssue,
  BlueprintValidationResult,
  WeightedTrait,
} from './BlueprintTypes';

function hasTrait(traits: WeightedTrait[] | undefined, traitKey: unknown) {
  return typeof traitKey === 'string' && (traits || []).some((trait) => trait.key === traitKey);
}

function validateAnchor(blueprint: BlueprintBase, anchor: BlueprintAnchor): BlueprintValidationIssue[] {
  if (!anchor.required) return [];

  const payloadValue = blueprint.payload?.[anchor.key];
  const defaultValue = blueprint.defaults?.fields?.[anchor.key];
  if (payloadValue !== undefined || defaultValue !== undefined || anchor.fallback !== undefined) {
    return [];
  }

  return [{
    level: 'error',
    path: `requiredAnchors.${anchor.key}`,
    message: `Missing required anchor: ${anchor.key}`,
  }];
}

function validateConstraint(blueprint: BlueprintBase, constraint: BlueprintConstraint): BlueprintValidationIssue[] {
  const issues: BlueprintValidationIssue[] = [];
  const payloadValue = constraint.field ? blueprint.payload?.[constraint.field] : undefined;
  const tags = new Set(blueprint.tags);
  const traits = blueprint.weightedTraits || [];
  const level = constraint.severity === 'soft' ? 'warn' : 'error';

  if (constraint.type === 'requires_tag' && typeof constraint.value === 'string' && !tags.has(constraint.value)) {
    issues.push({ level, path: `constraints.${constraint.id}`, message: constraint.message || `Missing required tag: ${constraint.value}` });
  }

  if (constraint.type === 'excludes_tag' && typeof constraint.value === 'string' && tags.has(constraint.value)) {
    issues.push({ level, path: `constraints.${constraint.id}`, message: constraint.message || `Excluded tag present: ${constraint.value}` });
  }

  if (constraint.type === 'required_field' && constraint.field && (payloadValue === undefined || payloadValue === null || payloadValue === '')) {
    issues.push({ level, path: `payload.${constraint.field}`, message: constraint.message || `Required field missing: ${constraint.field}` });
  }

  if (constraint.type === 'requires_trait' && !hasTrait(traits, constraint.value)) {
    issues.push({ level, path: `constraints.${constraint.id}`, message: constraint.message || `Missing required trait: ${String(constraint.value)}` });
  }

  if (constraint.type === 'excludes_trait' && hasTrait(traits, constraint.value)) {
    issues.push({ level, path: `constraints.${constraint.id}`, message: constraint.message || `Excluded trait present: ${String(constraint.value)}` });
  }

  if (constraint.type === 'matches_field' && constraint.field && payloadValue !== undefined && payloadValue !== constraint.value) {
    issues.push({ level, path: `payload.${constraint.field}`, message: constraint.message || `Expected ${constraint.field} to match ${String(constraint.value)}` });
  }

  if (constraint.type === 'incompatible_with' && typeof constraint.value === 'string' && tags.has(constraint.value)) {
    issues.push({ level, path: `constraints.${constraint.id}`, message: constraint.message || `Incompatible tag present: ${constraint.value}` });
  }

  if (constraint.type === 'min_value' && typeof constraint.value === 'number' && typeof payloadValue === 'number' && payloadValue < constraint.value) {
    issues.push({ level, path: `payload.${constraint.field}`, message: constraint.message || `Expected ${constraint.field} >= ${constraint.value}` });
  }

  if (constraint.type === 'max_value' && typeof constraint.value === 'number' && typeof payloadValue === 'number' && payloadValue > constraint.value) {
    issues.push({ level, path: `payload.${constraint.field}`, message: constraint.message || `Expected ${constraint.field} <= ${constraint.value}` });
  }

  return issues;
}

export const BlueprintValidator = {
  validate(blueprint: BlueprintBase): BlueprintValidationResult {
    const issues: BlueprintValidationIssue[] = [];

    if (!blueprint.id) issues.push({ level: 'error', path: 'id', message: 'Blueprint id is required' });
    if (!blueprint.kind) issues.push({ level: 'error', path: 'kind', message: 'Blueprint kind is required' });
    if (!blueprint.name) issues.push({ level: 'error', path: 'name', message: 'Blueprint name is required' });
    if (!Array.isArray(blueprint.tags)) issues.push({ level: 'error', path: 'tags', message: 'Blueprint tags must be an array' });
    if (!blueprint.payload || typeof blueprint.payload !== 'object') issues.push({ level: 'error', path: 'payload', message: 'Blueprint payload must be an object' });

    for (const anchor of blueprint.requiredAnchors || []) {
      issues.push(...validateAnchor(blueprint, anchor));
    }

    for (const constraint of blueprint.constraints || []) {
      issues.push(...validateConstraint(blueprint, constraint));
    }

    return {
      valid: !issues.some((issue) => issue.level === 'error'),
      issues,
    };
  },
};
