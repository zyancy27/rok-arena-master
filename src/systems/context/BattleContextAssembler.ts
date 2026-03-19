import { CharacterContextResolver } from '@/systems/character/CharacterContextResolver';
import { finalizeContextPacket } from './ContextAssembler';
import { EnvironmentContextResolver } from './EnvironmentContextResolver';
import { MemoryContextResolver } from './MemoryContextResolver';
import { RelationshipContextResolver } from './RelationshipContextResolver';
import type { ContextPacket } from '@/systems/types/PipelineTypes';

export interface BattleContextAssemblerInput {
  actor: {
    characterId?: string;
    name: string;
    tier?: number;
    stats?: Partial<Record<'stat_strength' | 'stat_speed' | 'stat_durability' | 'stat_stamina' | 'stat_skill' | 'stat_battle_iq' | 'stat_power' | 'stat_intelligence' | 'stat_luck', number | null | undefined>>;
    abilities?: string | string[] | null;
    powers?: string | string[] | null;
    equippedItems?: string[];
    statusEffects?: Array<string | { type: string; intensity?: string }>;
    stamina?: number | null;
    energy?: number | null;
  };
  opponents?: Array<{
    id?: string;
    name: string;
    tier?: number;
    stats?: Partial<Record<'stat_strength' | 'stat_speed' | 'stat_durability' | 'stat_stamina' | 'stat_skill' | 'stat_battle_iq' | 'stat_power' | 'stat_intelligence' | 'stat_luck', number | null | undefined>>;
    abilities?: string | string[] | null;
    powers?: string | string[] | null;
    kind?: 'enemy' | 'npc' | 'object' | 'ally' | 'player';
  }>;
  battleZone?: string | null;
  activeHazards?: string[];
  environmentTags?: string[];
  rangeState?: { zone?: string; meters?: number };
  narratorSceneState?: Record<string, unknown>;
  relationshipState?: unknown[];
  memoryState?: unknown[];
}

export const BattleContextAssembler = {
  assemble(input: BattleContextAssemblerInput): ContextPacket {
    const actor = CharacterContextResolver.resolve(input.actor);
    const targets = (input.opponents || []).map((opponent) => ({
      id: opponent.id,
      name: opponent.name,
      kind: opponent.kind ?? 'enemy',
      context: CharacterContextResolver.resolve({
        characterId: opponent.id,
        name: opponent.name,
        tier: opponent.tier,
        stats: opponent.stats,
        abilities: opponent.abilities,
        powers: opponent.powers,
      }),
    }));

    const environment = EnvironmentContextResolver.resolve({
      zone: input.battleZone,
      environmentTags: input.environmentTags,
      activeHazards: input.activeHazards,
      hasThreat: targets.length > 0,
      sceneState: {
        ...(input.narratorSceneState || {}),
        range: input.rangeState?.zone,
        meters: input.rangeState?.meters,
        statusEffects: actor.statusEffects,
      },
    });

    return finalizeContextPacket({
      mode: 'battle',
      actor,
      targets,
      primaryTarget: targets[0] ?? null,
      zone: environment.zone,
      environmentTags: environment.environmentTags,
      activeHazards: environment.activeHazards,
      worldState: environment.worldState,
      relationshipContext: RelationshipContextResolver.resolve(input.relationshipState),
      memoryContext: MemoryContextResolver.resolve(input.memoryState),
      narratorSceneContext: environment.narratorSceneContext,
      sceneState: environment.sceneState,
    });
  },
};
