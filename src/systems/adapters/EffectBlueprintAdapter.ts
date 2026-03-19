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
    const normalizedTags = [...new Set(input.tags || [])];
    const environmentState = input.environmentState || {};
    const scenePressure = String(environmentState.scenePressure || environmentState.contextPressure || 'grounded');

    return {
      id: input.id || `effect:${input.name || 'context'}`,
      kind: 'effect',
      name: input.name || 'Context Effect',
      tags: normalizedTags,
      optionalFields: ['narratorText', 'environmentState'],
      requiredAnchors: [
        { key: 'effectMode', required: true, fallback: scenePressure },
      ],
      optionalModules: [
        {
          id: 'hazard-audio-response',
          weight: normalizedTags.some((tag) => /hazard|storm|collapse|combat/.test(tag)) ? 0.9 : 0.2,
          tags: ['audio_reactive', 'impact_weighted'],
          traits: [{ key: 'effect_intensity', weight: normalizedTags.length * 10 }],
        },
        {
          id: 'stealth-quieting',
          weight: normalizedTags.some((tag) => /stealth|quiet|calm|social/.test(tag)) ? 0.8 : 0.1,
          tags: ['subtle', 'controlled'],
          traits: [{ key: 'effect_restraint', weight: 85 }],
        },
      ],
      constraints: [
        {
          id: 'stealth-heavy-encounter-avoids-loud-defaults',
          type: 'fallback_tag',
          value: 'loud',
          replacement: 'subtle',
          severity: normalizedTags.some((tag) => /stealth/.test(tag)) ? 'hard' : 'soft',
          message: 'Stealth-heavy encounters should not emit loud scene effects by default.',
        },
        {
          id: 'calm-social-avoids-aggressive-chat-pulse',
          type: 'fallback_tag',
          value: 'aggressive_chat',
          replacement: 'measured_chat',
          severity: normalizedTags.some((tag) => /social|calm|guarded/.test(tag)) ? 'hard' : 'soft',
          message: 'Calm social exchanges should not auto-trigger aggressive chat pulse effects.',
        },
      ],
      outputNormalization: ['effect-state-packet', 'chat-presentation-packet'],
      derivationHooks: ['overlay_persistence', 'motion_texture', 'sound_family'],
      payload: {
        effectMode: scenePressure,
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

