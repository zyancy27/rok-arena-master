import { CharacterBlueprintAdapter, type CharacterBlueprintAdapterInput } from '@/systems/adapters/CharacterBlueprintAdapter';
import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import { CompositionEngine } from './CompositionEngine';
import { CharacterBehaviorFramework } from '@/systems/foundations/character/CharacterBehaviorFramework';
import { CharacterCombatProfileFramework } from '@/systems/foundations/character/CharacterCombatProfileFramework';
import { CharacterExpressionFramework } from '@/systems/foundations/character/CharacterExpressionFramework';
import { CharacterIdentityFramework } from '@/systems/foundations/character/CharacterIdentityFramework';
import type { GeneratedCharacterIdentity } from '@/systems/generated/GeneratedCharacterIdentity';

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

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
    const joined = composition.runtime.tags.join(' ');
    const combatIdentity = uniq([...combat.combatIdentity, ...composition.runtime.pressureIdentity]);
    const socialIdentity = uniq([...identity.socialIdentity, composition.runtime.sceneOutputs.npcSocialReadiness]);
    const expressionIdentity = uniq([...(identity.expressionIdentity || []), ...(expression.expressionIdentity || []), ...composition.runtime.chatPresentationTags]);
    const movementStyle = uniq([...combat.movementStyle, composition.runtime.sceneOutputs.movementFriction]);
    const narrativeTone = uniq([...(identity.narrativeTone || []), ...(expression.narrativeTone || []), ...composition.runtime.sceneOutputs.narrationToneFlags]);
    const dangerProfile = uniq([...combat.dangerProfile, composition.runtime.sceneOutputs.combatVolatility]);
    const pressureStyle = uniq([...(combat.pressureStyle || []), ...(behavior.uniquePressureStyle || []), ...composition.runtime.sceneOutputs.environmentalPressure]);
    const signatureBehaviorPatterns = uniq([...(behavior.signatureBehaviorPatterns || []), ...composition.runtime.narrativeImplications]);

    return {
      blueprintId: blueprint.id,
      name: blueprint.name,
      combatIdentity,
      socialIdentity,
      expressionIdentity,
      movementStyle,
      narrativeTone,
      dangerProfile,
      pressureStyle,
      signatureBehaviorPatterns,
      pressureIdentity: uniq([...pressureStyle, ...composition.runtime.pressureIdentity]),
      movementIdentity: uniq([...movementStyle, ...composition.runtime.tags.filter((tag) => /(movement|speed|stealth|flow|open|locked|restricted|contested)/.test(tag))]),
      signaturePatternIdentity: uniq([...signatureBehaviorPatterns, ...composition.runtime.tags.filter((tag) => /(pattern|ritual|ambush|duel|command|protect)/.test(tag))]),
      narrationBias: uniq([
        ...narrativeTone,
        expressionIdentity.some((entry) => /muted|subtle|quiet/.test(entry)) ? 'hushed description bias' : null,
        /combat|aggressive|relentless|volatile/.test(joined) ? 'kinetic description bias' : 'grounded description bias',
      ]),
      effectBias: uniq([
        ...pressureStyle.map((entry) => `effect:${entry}`),
        ...expressionIdentity.filter((entry) => /(muted|cinematic|charged)/.test(entry)).map((entry) => `presentation:${entry}`),
        /mystic|ritual|charged/.test(joined) ? 'effect:charged_glow' : null,
      ]),
      environmentalFit: uniq(composition.runtime.tags.filter((tag) => /(ruins|storm|fire|toxic|shadow|mystic|occupation|urban|wild)/.test(tag))),
      rolePosture: uniq([
        ...socialIdentity.filter((entry) => /(guarded|open|tense|hostile)/.test(entry)),
        ...combatIdentity.filter((entry) => /(duelist|vanguard|sniper|controller|support)/.test(entry)),
      ]),
      tags: composition.runtime.tags,
      traits: composition.taxonomy.traits,
      metadata: {
        sourceFields: blueprint.payload.sourceFields,
        runtime: composition.runtime,
      },
    };
  },
};
