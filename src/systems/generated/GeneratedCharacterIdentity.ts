export interface GeneratedCharacterIdentity {
  blueprintId?: string;
  name: string;
  combatIdentity: string[];
  socialIdentity: string[];
  expressionIdentity: string[];
  movementStyle: string[];
  narrativeTone: string[];
  dangerProfile: string[];
  pressureStyle: string[];
  signatureBehaviorPatterns: string[];
  tags: string[];
  traits: string[];
  metadata?: Record<string, unknown>;
}
