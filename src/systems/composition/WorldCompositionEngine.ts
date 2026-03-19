import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import { EnvironmentalPressureFramework } from '@/systems/foundations/world/EnvironmentalPressureFramework';
import { FactionTerritoryFramework } from '@/systems/foundations/world/FactionTerritoryFramework';
import { HazardFramework } from '@/systems/foundations/world/HazardFramework';
import type { WorldBlueprint } from '@/systems/foundations/world/WorldBlueprint';
import { WorldRegionFramework } from '@/systems/foundations/world/WorldRegionFramework';
import type { GeneratedWorldState } from '@/systems/generated/GeneratedWorldState';
import { CompositionEngine } from './CompositionEngine';

export interface WorldCompositionInput {
  id?: string;
  name?: string;
  regionType?: string | null;
  environmentTags?: string[];
  activeHazards?: string[];
  factionPresence?: string[];
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
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
    const joined = composition.runtime.tags.join(' ');
    const travelPressure = uniq([...pressure.travelPressure, composition.runtime.sceneOutputs.movementFriction]);
    const hazardFamilies = uniq([...hazards.hazardFamilies, composition.runtime.sceneOutputs.hazardDensity]);
    const culturalFlavor = uniq([...region.culturalFlavor, ...composition.runtime.narrativeImplications]);
    const factionPresence = territory.factionPresence;

    return {
      blueprintId: blueprint.id,
      regionType: region.regionType,
      terrainLogic: uniq([...region.terrainLogic, composition.runtime.sceneOutputs.movementFriction]),
      dangerLogic: uniq([...hazards.dangerLogic, ...composition.runtime.sceneOutputs.environmentalPressure]),
      socialDensity: pressure.socialDensity,
      economicTone: pressure.economicTone,
      weatherPressure: uniq([...pressure.weatherPressure, composition.runtime.sceneOutputs.scenePressure]),
      travelPressure,
      hazardFamilies,
      pointsOfInterest: territory.pointsOfInterest,
      factionPresence,
      culturalFlavor,
      environmentalIdentity: uniq([region.regionType, ...region.terrainLogic, ...hazards.dangerLogic]),
      socialToneIdentity: uniq([pressure.socialDensity, pressure.economicTone, ...factionPresence]),
      travelPressureIdentity: uniq(travelPressure),
      hazardPosture: uniq([...hazardFamilies, ...hazards.dangerLogic]),
      visualEffectProfile: uniq([
        ...hazardFamilies.map((entry) => `visual:${entry}`),
        ...culturalFlavor.map((entry) => `visual-flavor:${entry}`),
        /mystic|ritual|charged/.test(joined) ? 'visual:charged_glow' : null,
      ]),
      audioPressureProfile: uniq([
        ...pressure.weatherPressure.map((entry) => `audio:${entry}`),
        ...travelPressure.map((entry) => `cadence:${entry}`),
        /fire|storm|collapse/.test(joined) ? 'audio:hazard_surge' : null,
      ]),
      volatilityProfile: uniq([
        ...pressure.weatherPressure,
        ...hazardFamilies,
        composition.runtime.sceneOutputs.scenePressure,
      ]),
      factionDensityProfile: uniq([...factionPresence, factionPresence.length > 2 ? 'crowded faction field' : 'localized faction field']),
      tags: composition.runtime.tags,
      metadata: {
        sourceTags: input.environmentTags,
        runtime: composition.runtime,
      },
    };
  },
};
