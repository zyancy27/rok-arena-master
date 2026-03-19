import { NpcBlueprintAdapter, type NpcBlueprintAdapterInput } from '@/systems/adapters/NpcBlueprintAdapter';
import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import { NpcFactionFramework } from '@/systems/foundations/npc/NpcFactionFramework';
import { NpcMotivationFramework } from '@/systems/foundations/npc/NpcMotivationFramework';
import { NpcPersonalityFramework } from '@/systems/foundations/npc/NpcPersonalityFramework';
import { NpcPressureFramework } from '@/systems/foundations/npc/NpcPressureFramework';
import { NpcRoleFramework } from '@/systems/foundations/npc/NpcRoleFramework';
import type { GeneratedNpcIdentity } from '@/systems/generated/GeneratedNpcIdentity';
import { CompositionEngine } from './CompositionEngine';

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

export const NpcCompositionEngine = {
  compose(input: NpcBlueprintAdapterInput): GeneratedNpcIdentity {
    const blueprint = NpcBlueprintAdapter.fromNpc(input);
    BlueprintRegistry.register(blueprint);
    const composition = CompositionEngine.compose({ kind: 'npc', blueprintIds: [blueprint.id] });

    const role = NpcRoleFramework.build(input.role);
    const personality = NpcPersonalityFramework.build(input.personality);
    const motivation = NpcMotivationFramework.build(input.npc_goal, input.npc_motivation);
    const pressure = NpcPressureFramework.build(input.role, input.npc_current_activity);
    const faction = NpcFactionFramework.build(
      Array.isArray(input.metadata?.factionAlignment)
        ? (input.metadata?.factionAlignment as string[])
        : input.role ? [String(input.role)] : null,
    );
    const joined = composition.runtime.tags.join(' ');
    const socialPosture = uniq([...(role.socialPosture || []), composition.runtime.sceneOutputs.npcSocialReadiness]);
    const combatPressureStyle = uniq([...(role.combatPressureStyle || []), ...(pressure.combatPressureStyle || [])]);
    const relationshipPosture = uniq([...(pressure.relationshipPosture || []), ...composition.runtime.narrativeImplications]);
    const powerStyle = uniq(composition.runtime.pressureIdentity);

    return {
      blueprintId: blueprint.id,
      name: blueprint.name,
      role: role.role,
      personalityCluster: personality.personalityCluster,
      motivations: motivation.motivations,
      fearProfile: personality.fearProfile,
      loyaltyProfile: uniq([...(motivation.loyaltyProfile || []), ...(faction.loyaltyProfile || [])]),
      factionAlignment: faction.factionAlignment,
      powerStyle,
      socialPosture,
      combatPressureStyle,
      relationshipPosture,
      rolePosture: uniq([role.role, ...socialPosture]),
      threatPosture: uniq([...combatPressureStyle, ...powerStyle, composition.runtime.sceneOutputs.combatVolatility]),
      emotionalDefault: uniq([
        personality.personalityCluster.find((entry) => /(calm|hardline|curious|aggressive)/.test(entry)) || null,
        /hostile|aggressive/.test(joined) ? 'anger' : /guarded|watchful/.test(joined) ? 'suspicion' : 'focus',
      ]),
      factionPosture: uniq([...faction.factionAlignment, ...(faction.loyaltyProfile || [])]),
      interactionStyle: uniq([...socialPosture, ...personality.personalityCluster]),
      pressureStyle: uniq([...combatPressureStyle, ...powerStyle, ...composition.runtime.pressureIdentity]),
      dangerStyle: uniq([...personality.fearProfile, ...combatPressureStyle, composition.runtime.sceneOutputs.combatVolatility]),
      memoryPosture: uniq([...relationshipPosture, ...(faction.loyaltyProfile || [])]),
      narrationBias: uniq([
        ...socialPosture,
        ...relationshipPosture,
        /mystic|ritual/.test(joined) ? 'unnerving narration bias' : null,
      ]),
      effectBias: uniq([
        ...combatPressureStyle.map((entry) => `effect:${entry}`),
        ...powerStyle.map((entry) => `power:${entry}`),
        /hostile|aggressive/.test(joined) ? 'effect:impact_burst' : null,
      ]),
      tags: composition.runtime.tags,
      metadata: {
        sourceFields: blueprint.payload.sourceFields,
        runtime: composition.runtime,
      },
    };
  },
};
