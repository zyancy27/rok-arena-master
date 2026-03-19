export type BlueprintKind =
  | 'character'
  | 'npc'
  | 'race'
  | 'world'
  | 'location'
  | 'encounter'
  | 'campaign'
  | 'effect'
  | 'narration_style'
  | 'chat_effect';

export type BlueprintValue = string | number | boolean | null | string[] | Record<string, unknown> | Array<Record<string, unknown>>;

export interface WeightedTrait {
  key: string;
  weight: number;
  value?: string | number | boolean | Record<string, unknown>;
  tags?: string[];
}

export interface BlueprintConstraint {
  id: string;
  type:
    | 'requires_tag'
    | 'excludes_tag'
    | 'min_value'
    | 'max_value'
    | 'matches_field'
    | 'custom';
  field?: string;
  value?: unknown;
  message?: string;
}

export interface BlueprintReference {
  id: string;
  weight?: number;
}

export interface BlueprintDefaults {
  fields?: Record<string, BlueprintValue>;
  tags?: string[];
  traits?: WeightedTrait[];
}

export interface BlueprintBase<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  kind: BlueprintKind;
  name: string;
  description?: string;
  version?: number;
  tags: string[];
  optionalFields?: string[];
  constraints?: BlueprintConstraint[];
  defaults?: BlueprintDefaults;
  extends?: string[];
  composes?: BlueprintReference[];
  weightedTraits?: WeightedTrait[];
  payload: TPayload;
  metadata?: Record<string, unknown>;
}

export interface BlueprintComposeInput {
  kind?: BlueprintKind;
  blueprintIds?: string[];
  tags?: string[];
  weights?: Record<string, number>;
  overrides?: Record<string, unknown>;
  seed?: string;
}

export interface BlueprintCompositionResult<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  blueprintIds: string[];
  tags: string[];
  traits: WeightedTrait[];
  payload: TPayload;
  metadata: {
    inheritedFrom: string[];
    composedFrom: string[];
    seed: string;
  };
}

export interface BlueprintValidationIssue {
  level: 'error' | 'warn';
  path: string;
  message: string;
}

export interface BlueprintValidationResult {
  valid: boolean;
  issues: BlueprintValidationIssue[];
}
