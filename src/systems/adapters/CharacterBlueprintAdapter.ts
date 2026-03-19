import type { CharacterBlueprint } from '@/systems/foundations/character/CharacterBlueprint';

export interface CharacterBlueprintAdapterInput {
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
}

export const CharacterBlueprintAdapter = {
  fromCharacter(input: CharacterBlueprintAdapterInput): CharacterBlueprint {
    return {
      id: input.id || `character:${input.name || 'unknown'}`,
      kind: 'character',
      name: input.name || 'Unknown Character',
      tags: [input.race, input.sub_race, input.personality].filter(Boolean).map((value) => String(value).toLowerCase().replace(/\s+/g, '_')),
      optionalFields: ['lore', 'powers', 'abilities', 'weapons_items'],
      payload: {
        sourceFields: {
          level: input.level,
          powers: input.powers,
          abilities: input.abilities,
          personality: input.personality,
          mentality: input.mentality,
          race: input.race,
          subRace: input.sub_race,
          lore: input.lore,
          weaponsItems: input.weapons_items,
          appearanceAura: input.appearance_aura,
          appearanceMovementStyle: input.appearance_movement_style,
          appearanceVoice: input.appearance_voice,
          stats: {
            stat_strength: input.stat_strength,
            stat_speed: input.stat_speed,
            stat_power: input.stat_power,
            stat_skill: input.stat_skill,
            stat_battle_iq: input.stat_battle_iq,
          },
        },
      },
    };
  },
};
