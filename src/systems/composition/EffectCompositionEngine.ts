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

    const visualLayers = [...new Set([
      ...visual.visualLayers,
      `visual-intensity:${composition.runtime.sceneOutputs.visualIntensity}`,
      `visual-heat:${grammar.intensity}`,
    ])];
    const audioLayers = [...new Set([
      ...audio.audioLayers,
      `audio-cadence:${grammar.cadence}`,
      `audio-pressure:${composition.runtime.sceneOutputs.scenePressure}`,
    ])];
    const chatBehaviors = [...new Set([
      ...chat.chatBehaviors,
      `effect-persistence:${grammar.persistence}`,
      ...composition.runtime.chatPresentationTags,
    ])];
    const statusOverlays = [...new Set([
      ...status.statusOverlays,
      ...composition.runtime.sceneOutputs.narrationToneFlags,
    ])];
    const environmentPersistence = [...new Set([
      ...environment.environmentPersistence,
      ...composition.runtime.sceneOutputs.environmentalPressure,
    ])];
    const burstImpacts = [...new Set([
      ...environment.burstImpacts,
      ...composition.runtime.effectTags,
    ])];

    return {
      blueprintId: blueprint.id,
      visualLayers,
      audioLayers,
      chatBehaviors,
      statusOverlays,
      environmentPersistence,
      burstImpacts,
      backgroundBehavior: [...new Set([
        ...visualLayers.filter((entry) => /visual-intensity|mist|fog|heat|shadow|glow/.test(entry)),
        `background:${grammar.cadence}`,
      ])],
      overlayPersistence: [...new Set([
        ...environmentPersistence,
        ...statusOverlays.filter((entry) => /tone:|status|overlay/.test(entry)),
      ])],
      pulsePatterns: [...new Set([
        ...chatBehaviors.filter((entry) => /pulse|impact|cadence|persistence/.test(entry)),
        `pulse:${composition.runtime.sceneOutputs.scenePressure}`,
      ])],
      impactBursts: [...new Set([
        ...burstImpacts,
        ...chatBehaviors.filter((entry) => /impact|burst/.test(entry)),
      ])],
      motionTexture: [...new Set([
        ...visualLayers.filter((entry) => /drift|shake|surge|sway|flow/.test(entry)),
        `motion:${composition.runtime.sceneOutputs.movementFriction}`,
      ])],
      soundCueFamilies: [...new Set([
        ...audioLayers,
        `cue:${composition.runtime.sceneOutputs.scenePressure}`,
      ])],
      textEmphasisStyle: [...new Set([
        ...chatBehaviors,
        ...composition.runtime.chatPresentationTags,
        ...composition.runtime.sceneOutputs.narrationToneFlags,
      ])],
      narratorHighlightFlavor: [...new Set([
        ...composition.runtime.sceneOutputs.narrationToneFlags,
        ...composition.runtime.narrativeImplications,
      ])],
      tags: composition.runtime.tags,
      metadata: {
        narratorText: input.narratorText,
        runtime: composition.runtime,
      },
    };
  },
};
