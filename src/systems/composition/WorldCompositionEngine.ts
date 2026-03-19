import { CompositionEngine } from './CompositionEngine';
import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import type { WorldBlueprint } from '@/systems/foundations/world/WorldBlueprint';
import { EnvironmentalPressureFramework } from '@/systems/foundations/world/EnvironmentalPressureFramework';
import { FactionTerritoryFramework } from '@/systems/foundations/world/FactionTerritoryFramework';
import { HazardFramework } from '@/systems/foundations/world/HazardFramework';
import { WorldRegionFramework } from '@/systems/foundations/world/WorldRegionFramework';
import type { GeneratedWorldState } from '@/systems/generated/GeneratedWorldState';

export interface WorldCompositionInput {
  id?: string;
  name?: string;
  regionType?: string | null;
  environmentTags?: string[];
  activeHazards?: string[];
  factionPresence?: string[];
}

export const WorldCompositionEngine = {
  compose(input: WorldCompositionInput): GeneratedWorldState {
    const blueprint: WorldBlueprint = {
      id: input.id || `world:${input.name || 'region'}`,
      kind: 'world',
      name: input.name || 'Generated Region',
      tags: [...new Set(input.environmentTags || [])],
      requiredAnchors: [
        { key: 'regionType', required: true, fallback: input.regionType || input.name || 'contested region' },
      ],
      optionalModules: [
        {
          id: 'hazard-envelope',
          weight: (input.activeHazards || []).length ? 0.9 : 0.25,
          tags: ['hazardous', 'environmental_pressure'],
          traits: [{ key: 'hazard_density', weight: (input.activeHazards || []).length * 25 }],
        },
        {
          id: 'faction-friction',
          weight: (input.factionPresence || []).length ? 0.8 : 0.2,
          tags: ['social_pressure', 'territorial_friction'],
          traits: [{ key: 'faction_density', weight: (input.factionPresence || []).length * 20 }],
        },
      ],
      outputNormalization: ['world-state-packet', 'scene-pressure-packet'],
      payload: {
        regionType: input.regionType || input.name || 'contested region',
      },
    };

    BlueprintRegistry.register(blueprint);
    const composition = CompositionEngine.compose({ kind: 'world', blueprintIds: [blueprint.id] });
    const region = WorldRegionFramework.build(input.regionType, composition.runtime.tags);
    const hazards = HazardFramework.build(composition.runtime.tags, input.activeHazards || []);
    const pressure = EnvironmentalPressureFramework.build(composition.runtime.tags, input.activeHazards || []);
    const territory = FactionTerritoryFramework.build(input.factionPresence || [], composition.runtime.tags);

    return {
      blueprintId: blueprint.id,
      regionType: region.regionType,
      terrainLogic: [...new Set([...region.terrainLogic, composition.runtime.sceneOutputs.movementFriction])],
      dangerLogic: [...new Set([...hazards.dangerLogic, ...composition.runtime.sceneOutputs.environmentalPressure])],
      socialDensity: pressure.socialDensity,
      economicTone: pressure.economicTone,
      weatherPressure: [...new Set([...pressure.weatherPressure, composition.runtime.sceneOutputs.scenePressure])],
      travelPressure: [...new Set([...pressure.travelPressure, composition.runtime.sceneOutputs.movementFriction])],
      hazardFamilies: [...new Set([...hazards.hazardFamilies, composition.runtime.sceneOutputs.hazardDensity])],
      pointsOfInterest: territory.pointsOfInterest,
      factionPresence: territory.factionPresence,
      culturalFlavor: [...new Set([...region.culturalFlavor, ...composition.runtime.narrativeImplications])],
      tags: composition.runtime.tags,
      metadata: {
        sourceTags: input.environmentTags,
        runtime: composition.runtime,
      },
    };
  },
};

