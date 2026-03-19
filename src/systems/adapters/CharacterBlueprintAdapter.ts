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
    const level = Number(input.level ?? 1);
    const statStrength = Number(input.stat_strength ?? 50);
    const statSpeed = Number(input.stat_speed ?? 50);
    const statPower = Number(input.stat_power ?? 50);
    const statSkill = Number(input.stat_skill ?? 50);
    const statBattleIq = Number(input.stat_battle_iq ?? 50);
    const powerText = `${input.powers || ''} ${input.abilities || ''} ${input.weapons_items || ''}`.toLowerCase();

    return {
      id: input.id || `character:${input.name || 'unknown'}`,
      kind: 'character',
      name: input.name || 'Unknown Character',
      tags: [input.race, input.sub_race, input.personality, input.mentality]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase().replace(/\s+/g, '_')),
      optionalFields: ['lore', 'powers', 'abilities', 'weapons_items'],
      requiredAnchors: [
        { key: 'sourceFields.level', required: false },
        { key: 'sourceFields.stats', required: false },
      ],
      optionalModules: [
        {
          id: 'movement-specialist',
          weight: statSpeed >= 70 ? 0.95 : 0.35,
          tags: ['mobile', 'tempo_pressure'],
          traits: [{ key: 'mobility', weight: statSpeed }],
        },
        {
          id: 'power-channeler',
          weight: statPower >= 70 ? 0.95 : 0.3,
          tags: [/arcane|energy|beam|fire|lightning|psychic/.test(powerText) ? 'mystic' : 'grounded_power'],
          traits: [{ key: 'power_projection', weight: statPower }],
        },
        {
          id: 'tactical-operator',
          weight: statBattleIq >= 65 || statSkill >= 65 ? 0.9 : 0.25,
          tags: ['calculated', 'adaptive'],
          traits: [{ key: 'tactical_reasoning', weight: Math.max(statBattleIq, statSkill) }],
        },
      ],
      constraints: [
        {
          id: 'mystic-needs-power-signal',
          type: 'fallback_tag',
          value: 'mystic',
          replacement: 'grounded_power',
          severity: /arcane|energy|beam|fire|lightning|psychic/.test(powerText) ? 'soft' : 'hard',
          message: 'Mystic framing without a power signal falls back to grounded power.',
        },
        {
          id: 'stealth-excludes-loud-presence',
          type: 'excludes_tag',
          value: 'berserker',
          severity: 'soft',
          replacement: 'measured',
          message: 'Stealth-leaning character identity should avoid berserker defaults unless explicit.',
        },
      ],
      outputNormalization: ['character-identity-packet', 'scene-pressure-packet'],
      derivationHooks: ['combat_identity', 'narrative_flavor', 'effect_bias'],
      weightedTraits: [
        { key: 'strength', weight: statStrength },
        { key: 'speed', weight: statSpeed },
        { key: 'power', weight: statPower },
        { key: 'skill', weight: statSkill },
        { key: 'battle_iq', weight: statBattleIq },
        { key: 'level', weight: level * 10 },
      ],
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

