import { CharacterContextResolver } from '@/systems/character/CharacterContextResolver';
import { finalizeContextPacket } from './ContextAssembler';
import { EnvironmentContextResolver } from './EnvironmentContextResolver';
import { MemoryContextResolver } from './MemoryContextResolver';
import { RelationshipContextResolver } from './RelationshipContextResolver';
import type { ContextPacket } from '@/systems/types/PipelineTypes';

export interface CampaignContextAssemblerInput {
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
  activeEnemies?: Array<{
    id: string;
    name: string;
    tier?: number;
    hp?: number;
    hpMax?: number;
    description?: string | null;
    behaviorProfile?: string | null;
    lastAction?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
  knownNpcs?: Array<{ id?: string; name: string; role?: string; current_zone?: string | null; [key: string]: unknown }>;
  currentZone?: string | null;
  environmentTags?: string[];
  activeHazards?: string[];
  worldState?: Record<string, unknown> | null;
  partyContext?: string[];
  relationshipState?: unknown[];
  memoryState?: unknown[];
}

function toEnemyContext(enemy: NonNullable<CampaignContextAssemblerInput['activeEnemies']>[number]) {
  return CharacterContextResolver.resolve({
    characterId: enemy.id,
    name: enemy.name,
    tier: enemy.tier,
    stats: {
      stat_strength: 50,
      stat_speed: 50,
      stat_durability: 50,
      stat_stamina: 50,
      stat_skill: 50,
      stat_battle_iq: 50,
      stat_power: 50,
      stat_intelligence: 50,
      stat_luck: 50,
    },
    stamina: 100,
    energy: 50,
  });
}

export const CampaignContextAssembler = {
  assemble(input: CampaignContextAssemblerInput): ContextPacket {
    const actor = CharacterContextResolver.resolve(input.actor);
    const enemyTargets = (input.activeEnemies || []).map((enemy) => ({
      id: enemy.id,
      name: enemy.name,
      kind: 'enemy' as const,
      context: toEnemyContext(enemy),
      metadata: {
        hp: enemy.hp,
        hpMax: enemy.hpMax,
        description: enemy.description,
        behaviorProfile: enemy.behaviorProfile,
        lastAction: enemy.lastAction,
        npcMetadata: enemy.metadata,
      },
    }));
    const npcTargets = (input.knownNpcs || []).map((npc) => ({
      id: typeof npc.id === 'string' ? npc.id : undefined,
      name: npc.name,
      kind: 'npc' as const,
      metadata: { ...npc },
    }));
    const targets = [...enemyTargets, ...npcTargets];

    const environment = EnvironmentContextResolver.resolve({
      zone: input.currentZone,
      environmentTags: input.environmentTags,
      activeHazards: input.activeHazards,
      worldState: input.worldState,
      hasThreat: enemyTargets.length > 0,
      sceneState: {
        currentZone: input.currentZone,
        partySize: input.partyContext?.length ?? 0,
      },
    });

    return finalizeContextPacket({
      mode: 'campaign',
      actor,
      targets,
      primaryTarget: enemyTargets[0] ?? targets[0] ?? null,
      zone: environment.zone,
      environmentTags: environment.environmentTags,
      activeHazards: environment.activeHazards,
      worldState: environment.worldState,
      partyContext: input.partyContext,
      relationshipContext: RelationshipContextResolver.resolve(input.relationshipState),
      memoryContext: MemoryContextResolver.resolve(input.memoryState),
      narratorSceneContext: environment.narratorSceneContext,
      sceneState: environment.sceneState,
      metadata: {
        knownNpcCount: npcTargets.length,
        activeEnemyCount: enemyTargets.length,
      },
    });
  },
};
