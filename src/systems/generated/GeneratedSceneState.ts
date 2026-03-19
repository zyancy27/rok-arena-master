export interface GeneratedSceneState {
  blueprintIds?: string[];
  scenePressure: 'low' | 'medium' | 'high' | 'critical';
  emotionalTone: string[];
  visualIntensity: 'subtle' | 'grounded' | 'elevated' | 'volatile';
  hazardDensity: 'minimal' | 'present' | 'dense' | 'overwhelming';
  movementFriction: 'open' | 'contested' | 'restricted' | 'locked';
  combatVolatility: 'stable' | 'shifting' | 'volatile' | 'explosive';
  npcSocialReadiness: 'open' | 'guarded' | 'tense' | 'hostile';
  narrationToneFlags: string[];
  effectTags: string[];
  chatPresentationTags: string[];
  environmentalPressure: string[];
  metadata?: Record<string, unknown>;
}
