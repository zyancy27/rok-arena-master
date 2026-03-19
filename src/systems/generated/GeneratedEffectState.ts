export interface GeneratedEffectState {
  blueprintId?: string;
  visualLayers: string[];
  audioLayers: string[];
  chatBehaviors: string[];
  statusOverlays: string[];
  environmentPersistence: string[];
  burstImpacts: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
}
