export interface ConstraintContext {
  tags?: string[];
  values?: Record<string, unknown>;
}

export type ConstraintRule = (context: ConstraintContext) => boolean;

export const ConstraintRules = {
  requiresTag: (tag: string): ConstraintRule => (context) => (context.tags || []).includes(tag),
  excludesTag: (tag: string): ConstraintRule => (context) => !(context.tags || []).includes(tag),
  minNumber: (field: string, minimum: number): ConstraintRule => (context) => Number(context.values?.[field] ?? 0) >= minimum,
  maxNumber: (field: string, maximum: number): ConstraintRule => (context) => Number(context.values?.[field] ?? 0) <= maximum,
  matchesValue: (field: string, expected: unknown): ConstraintRule => (context) => context.values?.[field] === expected,
};
