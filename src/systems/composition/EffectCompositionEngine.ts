import { EffectBlueprintAdapter, type EffectBlueprintAdapterInput } from '@/systems/adapters/EffectBlueprintAdapter';
import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import { AudioEffectFramework } from '@/systems/foundations/effects/AudioEffectFramework';
import { ChatEffectFramework } from '@/systems/foundations/effects/ChatEffectFramework';
import { EffectGrammar } from '@/systems/foundations/effects/EffectGrammar';
import { EnvironmentEffectFramework } from '@/systems/foundations/effects/EnvironmentEffectFramework';
import { StatusEffectFramework } from '@/systems/foundations/effects/StatusEffectFramework';
import { VisualEffectFramework } from '@/systems/foundations/effects/VisualEffectFramework';
import type { GeneratedEffectState } from '@/systems/generated/GeneratedEffectState';
import { CompositionEngine } from './CompositionEngine';

export const EffectCompositionEngine = {
  compose(input: EffectBlueprintAdapterInput): GeneratedEffectState {
    const blueprint = EffectBlueprintAdapter.fromContext(input);
    BlueprintRegistry.register(blueprint);
    const composition = CompositionEngine.compose({ kind: 'effect', blueprintIds: [blueprint.id] });
    const grammar = EffectGrammar.compose(composition.taxonomy.tags);
    const visual = VisualEffectFramework.build(composition.taxonomy.tags);
    const audio = AudioEffectFramework.build(composition.taxonomy.tags);
    const chat = ChatEffectFramework.build(composition.taxonomy.tags);
    const status = StatusEffectFramework.build(composition.taxonomy.tags);
    const environment = EnvironmentEffectFramework.build(composition.taxonomy.tags);

    return {
      blueprintId: blueprint.id,
      visualLayers: [...visual.visualLayers, `visual-intensity:${grammar.intensity}`],
      audioLayers: [...audio.audioLayers, `audio-cadence:${grammar.cadence}`],
      chatBehaviors: [...chat.chatBehaviors, `effect-persistence:${grammar.persistence}`],
      statusOverlays: status.statusOverlays,
      environmentPersistence: environment.environmentPersistence,
      burstImpacts: environment.burstImpacts,
      tags: composition.taxonomy.tags,
      metadata: {
        narratorText: input.narratorText,
      },
    };
  },
};
