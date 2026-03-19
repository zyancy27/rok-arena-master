import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import type { EncounterBlueprint } from '@/systems/foundations/encounter/EncounterBlueprint';
import type { GeneratedEncounter } from '@/systems/generated/GeneratedEncounter';
import { CompositionEngine } from './CompositionEngine';

export interface EncounterCompositionInput {
  id?: string;
  name?: string;
  situationType?: string | null;
  environmentTags?: string[];
  activeHazards?: string[];
  npcTags?: string[];
  campaignTags?: string[];
  actorTags?: string[];
  pressureSeed?: string[];
}

export const EncounterCompositionEngine = {
  compose(input: EncounterCompositionInput): GeneratedEncounter {
    const tags = [...new Set([
      ...(input.environmentTags || []),
      ...(input.activeHazards || []),
      ...(input.npcTags || []),
      ...(input.campaignTags || []),
      ...(input.actorTags || []),
      ...(input.pressureSeed || []),
    ])];

    const blueprint: EncounterBlueprint = {
      id: input.id || `encounter:${input.name || input.situationType || 'generated'}`,
      kind: 'encounter',
      name: input.name || input.situationType || 'Generated Encounter',
      tags,
      requiredAnchors: [
        { key: 'situationType', required: true, fallback: input.situationType || 'contested exchange' },
      ],
      outputNormalization: ['encounter-packet'],
      payload: {
        situationType: input.situationType || 'contested exchange',
      },
    };

    BlueprintRegistry.register(blueprint);
    const composition = CompositionEngine.compose({ kind: 'encounter', blueprintIds: [blueprint.id] });
    const scene = composition.runtime.sceneOutputs;

    return {
      blueprintId: blueprint.id,
      situationType: String(composition.blueprint.payload.situationType || input.situationType || 'contested exchange'),
      tacticalPressure: [...new Set([
        scene.scenePressure,
        scene.movementFriction,
        ...composition.runtime.pressureIdentity,
      ])],
      threatComposition: [...new Set([
        scene.combatVolatility,
        ...tags.filter((tag) => /(enemy|boss|ambush|hazard|guard|beast)/.test(tag)),
      ])],
      environmentalConflicts: [...new Set([
        ...scene.environmentalPressure,
        ...tags.filter((tag) => /(storm|ruins|fire|toxic|collapse|visibility)/.test(tag)),
      ])],
      stakes: composition.runtime.narrativeImplications,
      escalationVectors: composition.runtime.sceneOutputs.narrationToneFlags,
      recommendedEffectTags: composition.runtime.effectTags,
      tags: composition.runtime.tags,
      metadata: {
        runtime: composition.runtime,
      },
    };
  },
};
