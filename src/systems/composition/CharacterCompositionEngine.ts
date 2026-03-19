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
      combatIdentity: [...new Set([...combat.combatIdentity, ...composition.runtime.pressureIdentity])],
      socialIdentity: [...new Set([...identity.socialIdentity, composition.runtime.sceneOutputs.npcSocialReadiness])],
      expressionIdentity: [...new Set([...(identity.expressionIdentity || []), ...(expression.expressionIdentity || []), ...composition.runtime.chatPresentationTags])],
      movementStyle: [...new Set([...combat.movementStyle, composition.runtime.sceneOutputs.movementFriction])],
      narrativeTone: [...new Set([...(identity.narrativeTone || []), ...(expression.narrativeTone || []), ...composition.runtime.sceneOutputs.narrationToneFlags])],
      dangerProfile: [...new Set([...combat.dangerProfile, composition.runtime.sceneOutputs.combatVolatility])],
      pressureStyle: [...new Set([...(combat.pressureStyle || []), ...(behavior.uniquePressureStyle || []), ...composition.runtime.sceneOutputs.environmentalPressure])],
      signatureBehaviorPatterns: [...new Set([...(behavior.signatureBehaviorPatterns || []), ...composition.runtime.narrativeImplications])],
      tags: composition.runtime.tags,
      traits: composition.taxonomy.traits,
      metadata: {
        sourceFields: blueprint.payload.sourceFields,
        runtime: composition.runtime,
      },
    };
  },
};

