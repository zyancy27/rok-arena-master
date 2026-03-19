import type { EffectBlueprint } from '@/systems/foundations/effects/EffectBlueprint';

export interface EffectBlueprintAdapterInput {
  id?: string;
  name?: string | null;
  tags?: string[];
  narratorText?: string | null;
  environmentState?: Record<string, unknown> | null;
}

export const EffectBlueprintAdapter = {
  fromContext(input: EffectBlueprintAdapterInput): EffectBlueprint {
    return {
      id: input.id || `effect:${input.name || 'context'}`,
      kind: 'effect',
      name: input.name || 'Context Effect',
      tags: [...new Set(input.tags || [])],
      optionalFields: ['narratorText', 'environmentState'],
      payload: {
        visualLayers: [],
        audioLayers: [],
        chatBehaviors: [],
      },
      metadata: {
        narratorText: input.narratorText,
        environmentState: input.environmentState,
      },
    };
  },
};
