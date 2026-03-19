import type { BlueprintBase, BlueprintConstraint, BlueprintValidationIssue, BlueprintValidationResult } from './BlueprintTypes';

function validateConstraint(blueprint: BlueprintBase, constraint: BlueprintConstraint): BlueprintValidationIssue[] {
  const issues: BlueprintValidationIssue[] = [];
  const payloadValue = constraint.field ? blueprint.payload?.[constraint.field] : undefined;
  const tags = new Set(blueprint.tags);

  if (constraint.type === 'requires_tag' && typeof constraint.value === 'string' && !tags.has(constraint.value)) {
    issues.push({
      level: 'error',
      path: `constraints.${constraint.id}`,
      message: constraint.message || `Missing required tag: ${constraint.value}`,
    });
  }

  if (constraint.type === 'excludes_tag' && typeof constraint.value === 'string' && tags.has(constraint.value)) {
    issues.push({
      level: 'error',
      path: `constraints.${constraint.id}`,
      message: constraint.message || `Excluded tag present: ${constraint.value}`,
    });
  }

  if (constraint.type === 'min_value' && typeof constraint.value === 'number' && typeof payloadValue === 'number' && payloadValue < constraint.value) {
    issues.push({
      level: 'error',
      path: `payload.${constraint.field}`,
      message: constraint.message || `Expected ${constraint.field} >= ${constraint.value}`,
    });
  }

  if (constraint.type === 'max_value' && typeof constraint.value === 'number' && typeof payloadValue === 'number' && payloadValue > constraint.value) {
    issues.push({
      level: 'error',
      path: `payload.${constraint.field}`,
      message: constraint.message || `Expected ${constraint.field} <= ${constraint.value}`,
    });
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

    for (const constraint of blueprint.constraints || []) {
      issues.push(...validateConstraint(blueprint, constraint));
    }

    return {
      valid: !issues.some((issue) => issue.level === 'error'),
      issues,
    };
  },
};
