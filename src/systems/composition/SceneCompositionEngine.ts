import type { GeneratedSceneState } from '@/systems/generated/GeneratedSceneState';
import { CompositionEngine } from './CompositionEngine';

export interface SceneCompositionInput {
  blueprintIds?: string[];
  tags?: string[];
}

export const SceneCompositionEngine = {
  compose(input: SceneCompositionInput): GeneratedSceneState {
    const composition = CompositionEngine.compose({
      blueprintIds: input.blueprintIds,
      tags: input.tags,
    });

    return {
      blueprintIds: composition.blueprint.blueprintIds,
      scenePressure: composition.runtime.sceneOutputs.scenePressure,
      emotionalTone: composition.runtime.sceneOutputs.emotionalTone,
      visualIntensity: composition.runtime.sceneOutputs.visualIntensity,
      hazardDensity: composition.runtime.sceneOutputs.hazardDensity,
      movementFriction: composition.runtime.sceneOutputs.movementFriction,
      combatVolatility: composition.runtime.sceneOutputs.combatVolatility,
      npcSocialReadiness: composition.runtime.sceneOutputs.npcSocialReadiness,
      narrationToneFlags: composition.runtime.sceneOutputs.narrationToneFlags,
      effectTags: composition.runtime.effectTags,
      chatPresentationTags: composition.runtime.chatPresentationTags,
      environmentalPressure: composition.runtime.sceneOutputs.environmentalPressure,
      metadata: {
        runtime: composition.runtime,
      },
    };
  },
};
