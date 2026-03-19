import { CharacterBlueprintAdapter, type CharacterBlueprintAdapterInput } from '@/systems/adapters/CharacterBlueprintAdapter';
import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import { CompositionEngine } from './CompositionEngine';
import { CharacterBehaviorFramework } from '@/systems/foundations/character/CharacterBehaviorFramework';
import { CharacterCombatProfileFramework } from '@/systems/foundations/character/CharacterCombatProfileFramework';
import { CharacterExpressionFramework } from '@/systems/foundations/character/CharacterExpressionFramework';
import { CharacterIdentityFramework } from '@/systems/foundations/character/CharacterIdentityFramework';
import type { GeneratedCharacterIdentity } from '@/systems/generated/GeneratedCharacterIdentity';

export const CharacterCompositionEngine = {
  compose(input: CharacterBlueprintAdapterInput): GeneratedCharacterIdentity {
    const blueprint = CharacterBlueprintAdapter.fromCharacter(input);
    BlueprintRegistry.register(blueprint);
    const composition = CompositionEngine.compose({ kind: 'character', blueprintIds: [blueprint.id] });

    const identity = CharacterIdentityFramework.build({
      personality: input.personality,
      mentality: input.mentality,
      lore: input.lore,
      race: input.race,
      subRace: input.sub_race,
      level: input.level,
    });
    const combat = CharacterCombatProfileFramework.build({
      powers: input.powers,
      abilities: input.abilities,
      weaponsItems: input.weapons_items,
      stats: {
        stat_strength: input.stat_strength,
        stat_speed: input.stat_speed,
        stat_power: input.stat_power,
        stat_skill: input.stat_skill,
        stat_battle_iq: input.stat_battle_iq,
      },
    });
    const behavior = CharacterBehaviorFramework.build({
      personality: input.personality,
      mentality: input.mentality,
      powers: input.powers,
    });
    const expression = CharacterExpressionFramework.build({
      personality: input.personality,
      appearanceAura: input.appearance_aura,
      appearanceMovementStyle: input.appearance_movement_style,
      appearanceVoice: input.appearance_voice,
    });

    return {
      blueprintId: blueprint.id,
      name: blueprint.name,
      combatIdentity: combat.combatIdentity,
      socialIdentity: identity.socialIdentity,
      expressionIdentity: [...new Set([...(identity.expressionIdentity || []), ...(expression.expressionIdentity || [])])],
      movementStyle: combat.movementStyle,
      narrativeTone: [...new Set([...(identity.narrativeTone || []), ...(expression.narrativeTone || [])])],
      dangerProfile: combat.dangerProfile,
      pressureStyle: [...new Set([...(combat.pressureStyle || []), ...(behavior.uniquePressureStyle || [])])],
      signatureBehaviorPatterns: behavior.signatureBehaviorPatterns,
      tags: composition.taxonomy.tags,
      traits: composition.taxonomy.traits,
      metadata: {
        sourceFields: blueprint.payload.sourceFields,
      },
    };
  },
};
