import { CharacterIdentityGenerator } from '@/systems/identity/CharacterIdentityGenerator';
import { CampaignCompositionEngine, type CampaignCompositionInput } from '@/systems/composition/CampaignCompositionEngine';
import { CampaignEncounterDensityGenerator } from './CampaignEncounterDensityGenerator';
import { CampaignNpcDistributionGenerator } from './CampaignNpcDistributionGenerator';
import { CampaignObjectiveGenerator } from './CampaignObjectiveGenerator';
import { CampaignTensionGenerator } from './CampaignTensionGenerator';

export interface SparseCampaignSeedInput extends CampaignCompositionInput {
  character?: {
    id?: string;
    name?: string | null;
    level?: number | null;
    powers?: string | null;
    abilities?: string | null;
    personality?: string | null;
    mentality?: string | null;
    race?: string | null;
    sub_race?: string | null;
    lore?: string | null;
    weapons_items?: string | null;
    appearance_aura?: string | null;
    appearance_movement_style?: string | null;
    appearance_voice?: string | null;
    stat_strength?: number | null;
    stat_speed?: number | null;
    stat_power?: number | null;
    stat_skill?: number | null;
    stat_battle_iq?: number | null;
  } | null;
}

export interface SparseCampaignRuntimeSeed {
  actorIdentity: ReturnType<typeof CharacterIdentityGenerator.generate> | null;
  generatedCampaignSeed: ReturnType<typeof CampaignCompositionEngine.compose>;
  coreTension: string;
  likelyObjectives: string[];
  npcDistribution: string[];
  encounterDensity: 'low' | 'medium' | 'high';
  isSparseDominant: boolean;
}

export const SparseCampaignSeedBuilder = {
  build(input: SparseCampaignSeedInput): SparseCampaignRuntimeSeed {
    const actorIdentity = input.character
      ? CharacterIdentityGenerator.generate({
          id: input.character.id,
          name: input.character.name,
          level: input.character.level,
          powers: input.character.powers,
          abilities: input.character.abilities,
          personality: input.character.personality,
          mentality: input.character.mentality,
          race: input.character.race,
          sub_race: input.character.sub_race,
          lore: input.character.lore,
          weapons_items: input.character.weapons_items,
          appearance_aura: input.character.appearance_aura,
          appearance_movement_style: input.character.appearance_movement_style,
          appearance_voice: input.character.appearance_voice,
          stat_strength: input.character.stat_strength,
          stat_speed: input.character.stat_speed,
          stat_power: input.character.stat_power,
          stat_skill: input.character.stat_skill,
          stat_battle_iq: input.character.stat_battle_iq,
        })
      : null;

    const coreTension = CampaignTensionGenerator.generate({
      theme: input.theme,
      goal: input.goal,
      characterName: input.character?.name,
      environmentTags: input.environment_tags,
    });
    const likelyObjectives = CampaignObjectiveGenerator.generate({
      goal: input.goal,
      theme: input.theme,
      location: input.current_zone || input.chosen_location,
    });
    const pressureSources = actorIdentity
      ? [...new Set([...(actorIdentity.pressureStyle || []), coreTension])]
      : [coreTension];
    const npcDistribution = CampaignNpcDistributionGenerator.generate({
      theme: input.theme,
      environmentTags: input.environment_tags,
      pressureSources,
    });
    const encounterDensity = CampaignEncounterDensityGenerator.generate({
      pressureSources,
      environmentTags: input.environment_tags,
    });
    const sparseSignalCount = [input.theme, input.goal, input.description, input.current_zone, input.chosen_location]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .length;
    const isSparseDominant = sparseSignalCount <= 2 || !(input.theme && input.goal);

    const composed = CampaignCompositionEngine.compose({
      ...input,
      goal: input.goal || likelyObjectives[0],
      theme: input.theme || coreTension,
      story_context: {
        ...((input.story_context as Record<string, unknown> | null) || {}),
        generatedActorIdentity: actorIdentity,
        sparseCampaignSeed: {
          coreTension,
          likelyObjectives,
          npcDistribution,
          encounterDensity,
          isSparseDominant,
        },
      },
    });

    return {
      actorIdentity,
      generatedCampaignSeed: {
        ...composed,
        centralTension: isSparseDominant ? coreTension || composed.centralTension : composed.centralTension,
        pressureSources: [...new Set([...composed.pressureSources, ...pressureSources])],
        likelyObjectives: [...new Set([...likelyObjectives, ...composed.likelyObjectives])],
        npcPresence: [...new Set([...npcDistribution, ...composed.npcPresence])],
        encounterOpportunities: [...new Set([
          ...composed.encounterOpportunities,
          `${encounterDensity}-density complications`,
        ])],
        metadata: {
          ...(composed.metadata || {}),
          sparseInput: {
            actorIdentity,
            coreTension,
            npcDistribution,
            encounterDensity,
            isSparseDominant,
          },
        },
      },
      coreTension,
      likelyObjectives,
      npcDistribution,
      encounterDensity,
      isSparseDominant,
    };
  },
};
