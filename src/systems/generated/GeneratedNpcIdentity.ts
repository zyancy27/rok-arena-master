export interface GeneratedNpcIdentity {
  blueprintId?: string;
  name: string;
  role: string;
  personalityCluster: string[];
  motivations: string[];
  fearProfile: string[];
  loyaltyProfile: string[];
  factionAlignment: string[];
  powerStyle: string[];
  socialPosture: string[];
  combatPressureStyle: string[];
  relationshipPosture: string[];
  rolePosture: string[];
  threatPosture: string[];
  emotionalDefault: string[];
  factionPosture: string[];
  interactionStyle: string[];
  pressureStyle: string[];
  dangerStyle: string[];
  memoryPosture: string[];
  narrationBias: string[];
  effectBias: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
}
