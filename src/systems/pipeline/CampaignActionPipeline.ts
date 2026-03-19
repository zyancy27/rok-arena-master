import type { Campaign, CampaignParticipant, CampaignTime } from '@/lib/campaign-types';
import { IntentEngine } from '@/systems/intent/IntentEngine';
import { CombatResolver } from '@/systems/combat/CombatResolver';
import { createCombatState } from '@/systems/combat/CombatState';
import { CampaignContextAssembler } from '@/systems/context/CampaignContextAssembler';
import { buildResolvedActionPacket } from './ActionPipeline';
import { NpcReactionCoordinator } from '@/systems/npc/NpcReactionCoordinator';
import { NarrationPacketBuilder } from '@/systems/narration/NarrationPacketBuilder';
import { SceneEffectBridge } from '@/systems/map/SceneEffectBridge';
import type { ActionPipelineResult } from '@/systems/types/PipelineTypes';

export interface CampaignActionPipelineInput {
  rawText: string;
  participant: CampaignParticipant;
  campaign: Campaign;
  equippedItems?: string[];
  activeHazards?: string[];
  environmentTags?: string[];
  activeEnemies?: Array<{
    id: string;
    name: string;
    tier: number;
    hp: number;
    hp_max: number;
    description?: string | null;
    behavior_profile?: string | null;
    last_action?: string | null;
    metadata?: Record<string, unknown> | null;
    status?: string;
  }>;
  knownNpcs?: Array<{ id?: string; name: string; role?: string; current_zone?: string | null; [key: string]: unknown }>;
  partyContext?: string[];
  relationshipState?: unknown[];
  memoryState?: unknown[];
}

export interface CampaignActionPipelineResult extends ActionPipelineResult {
  primaryEnemy: CampaignActionPipelineInput['activeEnemies'] extends Array<infer T> ? T | null : never;
}

function extractChaosLevel(worldState: Record<string, unknown> | null | undefined) {
  return Number(worldState?.chaosLevel ?? 40);
}

function extractEscapeRoutes(worldState: Record<string, unknown> | null | undefined) {
  return Number(worldState?.escapeRoutes ?? 2);
}

export const CampaignActionPipeline = {
  execute(input: CampaignActionPipelineInput): CampaignActionPipelineResult {
    const activeEnemies = (input.activeEnemies || []).filter((enemy) => enemy.status === 'active' || enemy.status === 'hiding' || !enemy.status);
    const knownNpcs = input.knownNpcs || [];
    const defaultTool = input.equippedItems?.[0] ?? null;

    const intentResult = IntentEngine.resolve(input.rawText, {
      mode: 'campaign',
      actorName: input.participant.character?.name,
      possibleTargets: [
        ...activeEnemies.map((enemy) => ({ id: enemy.id, name: enemy.name, kind: 'enemy' as const })),
        ...knownNpcs.map((npc) => ({ id: typeof npc.id === 'string' ? npc.id : undefined, name: npc.name, kind: 'npc' as const })),
      ],
      defaultTool,
    });

    const context = CampaignContextAssembler.assemble({
      actor: {
        characterId: input.participant.character_id,
        name: input.participant.character?.name || 'Character',
        tier: input.participant.character?.level || input.participant.campaign_level,
        stats: {
          stat_strength: input.participant.character?.stat_strength ?? 50,
        },
        abilities: input.participant.character?.abilities,
        powers: input.participant.character?.powers,
        equippedItems: input.equippedItems,
        stamina: Math.round((input.participant.campaign_hp / Math.max(1, input.participant.campaign_hp_max)) * 100),
      },
      activeEnemies: activeEnemies.map((enemy) => ({
        id: enemy.id,
        name: enemy.name,
        tier: enemy.tier,
        hp: enemy.hp,
        hpMax: enemy.hp_max,
        description: enemy.description,
        behaviorProfile: enemy.behavior_profile,
        lastAction: enemy.last_action,
        metadata: enemy.metadata,
      })),
      knownNpcs,
      currentZone: input.campaign.current_zone,
      environmentTags: input.environmentTags ?? input.campaign.environment_tags,
      activeHazards: input.activeHazards,
      worldState: input.campaign.world_state,
      partyContext: input.partyContext,
      relationshipState: input.relationshipState,
      memoryState: input.memoryState,
    });

    const primaryEnemy = activeEnemies[0] ?? null;
    const targetContext = context.primaryTarget?.kind === 'enemy' ? context.primaryTarget.context ?? null : null;
    const combatResult = intentResult.intent.isCombatAction && primaryEnemy && targetContext
      ? CombatResolver.resolve(
          intentResult.intent,
          context.actor,
          createCombatState({
            participants: [
              {
                id: input.participant.character_id,
                name: input.participant.character?.name || 'Character',
                stats: {
                  hp: input.participant.campaign_hp,
                  stamina: context.actor.stamina,
                  speed: context.actor.stats.stat_speed,
                  strength: context.actor.stats.stat_strength,
                },
              },
              {
                id: primaryEnemy.id,
                name: primaryEnemy.name,
                stats: {
                  hp: primaryEnemy.hp,
                  stamina: 100,
                  speed: targetContext.stats.stat_speed,
                  strength: targetContext.stats.stat_strength,
                },
              },
            ],
            rangeZone: 'mid',
            zone: input.campaign.current_zone,
            terrainTags: input.activeHazards ?? [],
          }),
          {
            actorId: input.participant.character_id,
            targetId: primaryEnemy.id,
            targetContext,
          },
        )
      : null;

    const resolvedAction = buildResolvedActionPacket({
      rawText: input.rawText,
      intentResult,
      context,
      actorContext: context.actor,
      targetContext,
      combatResult,
    });

    const npcReaction = NpcReactionCoordinator.resolve({
      activeEnemies: primaryEnemy ? [{
        id: primaryEnemy.id,
        name: primaryEnemy.name,
        tier: primaryEnemy.tier,
        hp: primaryEnemy.hp,
        hpMax: primaryEnemy.hp_max,
        description: primaryEnemy.description,
        behaviorProfile: primaryEnemy.behavior_profile,
        lastAction: primaryEnemy.last_action,
        metadata: primaryEnemy.metadata,
      }] : [],
      actor: {
        id: input.participant.character_id,
        name: input.participant.character?.name || 'Character',
        healthPct: Math.round((input.participant.campaign_hp / Math.max(1, input.participant.campaign_hp_max)) * 100),
        context: context.actor,
      },
      timeOfDay: input.campaign.time_of_day as CampaignTime,
      chaosLevel: extractChaosLevel(input.campaign.world_state),
      escapeRoutes: extractEscapeRoutes(input.campaign.world_state),
      combatResult,
    });

    const sceneEffects = SceneEffectBridge.build(context, resolvedAction, npcReaction);
    const narrationPacket = NarrationPacketBuilder.build({
      resolvedAction,
      npcReaction,
      sceneEffects,
    });

    return {
      context,
      resolvedAction,
      npcReaction,
      sceneEffects,
      narrationPacket,
      primaryEnemy,
    };
  },
};
