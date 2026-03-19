import { NpcBlueprintAdapter, type NpcBlueprintAdapterInput } from '@/systems/adapters/NpcBlueprintAdapter';
import { BlueprintRegistry } from '@/systems/blueprints/BlueprintRegistry';
import { NpcFactionFramework } from '@/systems/foundations/npc/NpcFactionFramework';
import { NpcMotivationFramework } from '@/systems/foundations/npc/NpcMotivationFramework';
import { NpcPersonalityFramework } from '@/systems/foundations/npc/NpcPersonalityFramework';
import { NpcPressureFramework } from '@/systems/foundations/npc/NpcPressureFramework';
import { NpcRoleFramework } from '@/systems/foundations/npc/NpcRoleFramework';
import type { GeneratedNpcIdentity } from '@/systems/generated/GeneratedNpcIdentity';
import { CompositionEngine } from './CompositionEngine';

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

    return {
      blueprintId: blueprint.id,
      name: blueprint.name,
      role: role.role,
      personalityCluster: personality.personalityCluster,
      motivations: motivation.motivations,
      fearProfile: personality.fearProfile,
      loyaltyProfile: [...new Set([...(motivation.loyaltyProfile || []), ...(faction.loyaltyProfile || [])])],
      factionAlignment: faction.factionAlignment,
      powerStyle: composition.runtime.pressureIdentity,
      socialPosture: [...new Set([...(role.socialPosture || []), composition.runtime.sceneOutputs.npcSocialReadiness])],
      combatPressureStyle: [...new Set([...(role.combatPressureStyle || []), ...(pressure.combatPressureStyle || [])])],
      relationshipPosture: [...new Set([...(pressure.relationshipPosture || []), ...composition.runtime.narrativeImplications])],
      tags: composition.runtime.tags,
      metadata: {
        sourceFields: blueprint.payload.sourceFields,
        runtime: composition.runtime,
      },
    };
  },
};
