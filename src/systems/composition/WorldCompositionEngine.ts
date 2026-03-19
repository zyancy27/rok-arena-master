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
      payload: {},
    };

    BlueprintRegistry.register(blueprint);
    const composition = CompositionEngine.compose({ kind: 'world', blueprintIds: [blueprint.id] });
    const region = WorldRegionFramework.build(input.regionType, input.environmentTags || []);
    const hazards = HazardFramework.build(input.environmentTags || [], input.activeHazards || []);
    const pressure = EnvironmentalPressureFramework.build(input.environmentTags || [], input.activeHazards || []);
    const territory = FactionTerritoryFramework.build(input.factionPresence || [], input.environmentTags || []);

    return {
      blueprintId: blueprint.id,
      regionType: region.regionType,
      terrainLogic: region.terrainLogic,
      dangerLogic: hazards.dangerLogic,
      socialDensity: pressure.socialDensity,
      economicTone: pressure.economicTone,
      weatherPressure: pressure.weatherPressure,
      travelPressure: pressure.travelPressure,
      hazardFamilies: hazards.hazardFamilies,
      pointsOfInterest: territory.pointsOfInterest,
      factionPresence: territory.factionPresence,
      culturalFlavor: region.culturalFlavor,
      tags: composition.taxonomy.tags,
      metadata: {
        sourceTags: input.environmentTags,
      },
    };
  },
};
