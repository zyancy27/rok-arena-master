export interface GeneratedEncounter {
  blueprintId?: string;
  situationType: string;
  tacticalPressure: string[];
  threatComposition: string[];
  environmentalConflicts: string[];
  stakes: string[];
  escalationVectors: string[];
  recommendedEffectTags: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
}
