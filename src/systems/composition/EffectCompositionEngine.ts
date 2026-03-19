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
    const grammar = EffectGrammar.compose(composition.runtime.tags);
    const visual = VisualEffectFramework.build(composition.runtime.tags);
    const audio = AudioEffectFramework.build(composition.runtime.tags);
    const chat = ChatEffectFramework.build(composition.runtime.tags);
    const status = StatusEffectFramework.build(composition.runtime.tags);
    const environment = EnvironmentEffectFramework.build(composition.runtime.tags);

    return {
      blueprintId: blueprint.id,
      visualLayers: [...new Set([...visual.visualLayers, `visual-intensity:${composition.runtime.sceneOutputs.visualIntensity}`, `visual-heat:${grammar.intensity}`])],
      audioLayers: [...new Set([...audio.audioLayers, `audio-cadence:${grammar.cadence}`, `audio-pressure:${composition.runtime.sceneOutputs.scenePressure}`])],
      chatBehaviors: [...new Set([...chat.chatBehaviors, `effect-persistence:${grammar.persistence}`, ...composition.runtime.chatPresentationTags])],
      statusOverlays: [...new Set([...status.statusOverlays, ...composition.runtime.sceneOutputs.narrationToneFlags])],
      environmentPersistence: [...new Set([...environment.environmentPersistence, ...composition.runtime.sceneOutputs.environmentalPressure])],
      burstImpacts: [...new Set([...environment.burstImpacts, ...composition.runtime.effectTags])],
      tags: composition.runtime.tags,
      metadata: {
        narratorText: input.narratorText,
        runtime: composition.runtime,
      },
    };
  },
};

