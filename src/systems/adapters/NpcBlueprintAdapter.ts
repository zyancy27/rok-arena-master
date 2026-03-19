import type { NpcBlueprint } from '@/systems/foundations/npc/NpcBlueprint';

export interface NpcBlueprintAdapterInput {
  id?: string;
  name?: string | null;
  role?: string | null;
  personality?: string | null;
  npc_goal?: string | null;
  npc_motivation?: string | null;
  npc_current_activity?: string | null;
  current_zone?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const NpcBlueprintAdapter = {
  fromNpc(input: NpcBlueprintAdapterInput): NpcBlueprint {
    return {
      id: input.id || `npc:${input.name || 'unknown'}`,
      kind: 'npc',
      name: input.name || 'Unknown NPC',
      tags: [input.role, input.status, input.current_zone].filter(Boolean).map((value) => String(value).toLowerCase().replace(/\s+/g, '_')),
      optionalFields: ['npc_goal', 'npc_motivation', 'npc_current_activity'],
      payload: {
        role: input.role || 'civilian',
        sourceFields: {
          personality: input.personality,
          goal: input.npc_goal,
          motivation: input.npc_motivation,
          activity: input.npc_current_activity,
          zone: input.current_zone,
          metadata: input.metadata,
        },
      },
    };
  },
};
