import type { Campaign, CampaignParticipant, CampaignTime } from '@/lib/campaign-types';
import { IntentEngine } from '@/systems/intent/IntentEngine';
import { CombatResolver } from '@/systems/combat/CombatResolver';
import { createCombatState } from '@/systems/combat/CombatState';
import { CharacterCompositionEngine } from '@/systems/composition/CharacterCompositionEngine';
import { CampaignCompositionEngine } from '@/systems/composition/CampaignCompositionEngine';
import { EffectCompositionEngine } from '@/systems/composition/EffectCompositionEngine';
import { EncounterCompositionEngine } from '@/systems/composition/EncounterCompositionEngine';
import { NpcCompositionEngine } from '@/systems/composition/NpcCompositionEngine';
import { SceneCompositionEngine } from '@/systems/composition/SceneCompositionEngine';
import { WorldCompositionEngine } from '@/systems/composition/WorldCompositionEngine';
import { CampaignContextAssembler } from '@/systems/context/CampaignContextAssembler';
import { buildResolvedActionPacket } from './ActionPipeline';
import { attachGeneratedToContext } from './GeneratedRuntimeBridge';
import { NpcReactionCoordinator } from '@/systems/npc/NpcReactionCoordinator';
import { NarrationPacketBuilder } from '@/systems/narration/NarrationPacketBuilder';
import { SceneEffectBridge } from '@/systems/map/SceneEffectBridge';
import type { ActionPipelineResult, GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';

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
    const character = (input.participant.character || null) as Record<string, unknown> | null;

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
          stat_speed: Number(character?.stat_speed ?? 50),
          stat_power: Number(character?.stat_power ?? 50),
          stat_skill: Number(character?.stat_skill ?? 50),
          stat_battle_iq: Number(character?.stat_battle_iq ?? 50),
          stat_durability: Number(character?.stat_durability ?? 50),
          stat_stamina: Number(character?.stat_stamina ?? 50),
          stat_intelligence: Number(character?.stat_intelligence ?? 50),
          stat_luck: Number(character?.stat_luck ?? 50),
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

    const generatedActorIdentity = CharacterCompositionEngine.compose({
      id: input.participant.character_id,
      name: input.participant.character?.name,
      level: input.participant.character?.level || input.participant.campaign_level,
      powers: input.participant.character?.powers,
      abilities: input.participant.character?.abilities,
      personality: typeof character?.personality === 'string' ? character.personality : null,
      mentality: typeof character?.mentality === 'string' ? character.mentality : null,
      race: typeof character?.race === 'string' ? character.race : null,
      sub_race: typeof character?.sub_race === 'string' ? character.sub_race : null,
      lore: typeof character?.lore === 'string' ? character.lore : null,
      weapons_items: typeof character?.weapons_items === 'string' ? character.weapons_items : null,
      appearance_aura: typeof character?.appearance_aura === 'string' ? character.appearance_aura : null,
      appearance_movement_style: typeof character?.appearance_movement_style === 'string' ? character.appearance_movement_style : null,
      appearance_voice: typeof character?.appearance_voice === 'string' ? character.appearance_voice : null,
      stat_strength: input.participant.character?.stat_strength,
      stat_speed: Number(character?.stat_speed ?? 50),
      stat_power: Number(character?.stat_power ?? 50),
      stat_skill: Number(character?.stat_skill ?? 50),
      stat_battle_iq: Number(character?.stat_battle_iq ?? 50),
    });

    const generatedCampaignSeed = CampaignCompositionEngine.compose({
      id: input.campaign.id,
      name: input.campaign.name,
      description: input.campaign.description,
      current_zone: input.campaign.current_zone,
      chosen_location: input.campaign.chosen_location,
      environment_tags: input.campaign.environment_tags,
      world_state: input.campaign.world_state,
      story_context: {
        ...((input.campaign.story_context as Record<string, unknown> | null) || {}),
        generatedActorIdentity,
      },
      theme: String((input.campaign.story_context as Record<string, unknown> | null)?.theme || input.campaign.description || ''),
      goal: String((input.campaign.story_context as Record<string, unknown> | null)?.goal || ''),
    });

    const generatedWorldState = WorldCompositionEngine.compose({
      id: `campaign-world:${input.campaign.id}`,
      name: input.campaign.current_zone,
      regionType: input.campaign.current_zone,
      environmentTags: input.environmentTags ?? input.campaign.environment_tags,
      activeHazards: input.activeHazards ?? [],
      factionPresence: knownNpcs.map((npc) => String(npc.role || 'local actors')),
    });

    const generatedNpcIdentity = knownNpcs[0]
      ? NpcCompositionEngine.compose({
          id: typeof knownNpcs[0].id === 'string' ? knownNpcs[0].id : undefined,
          name: knownNpcs[0].name,
          role: typeof knownNpcs[0].role === 'string' ? knownNpcs[0].role : null,
          current_zone: knownNpcs[0].current_zone,
          metadata: knownNpcs[0] as Record<string, unknown>,
        })
      : null;

    const generatedEncounter = EncounterCompositionEngine.compose({
      id: `campaign-encounter:${input.campaign.id}`,
      name: input.campaign.current_zone || input.campaign.name,
      situationType: intentResult.intent.isCombatAction ? 'campaign confrontation' : 'campaign situation',
      environmentTags: context.environmentTags,
      activeHazards: context.activeHazards,
      actorTags: generatedActorIdentity.tags,
      campaignTags: generatedCampaignSeed.tags,
      npcTags: [
        ...(generatedNpcIdentity?.tags || []),
        ...activeEnemies.map((enemy) => enemy.name.toLowerCase().replace(/\s+/g, '_')),
      ],
      pressureSeed: generatedCampaignSeed.pressureSources,
    });

    const generatedSceneState = SceneCompositionEngine.compose({
      blueprintIds: [
        generatedActorIdentity.blueprintId,
        generatedCampaignSeed.blueprintId,
        generatedWorldState.blueprintId,
        generatedNpcIdentity?.blueprintId,
        generatedEncounter.blueprintId,
      ].filter(Boolean) as string[],
      tags: [
        ...generatedActorIdentity.tags,
        ...generatedCampaignSeed.tags,
        ...generatedWorldState.tags,
        ...(generatedNpcIdentity?.tags || []),
        ...generatedEncounter.tags,
      ],
    });

    const generatedPackets: GeneratedRuntimePackets = {
      actorIdentity: generatedActorIdentity,
      campaignSeed: generatedCampaignSeed,
      worldState: generatedWorldState,
      npcIdentity: generatedNpcIdentity,
      encounter: generatedEncounter,
      sceneState: generatedSceneState,
    };

    attachGeneratedToContext(context, generatedPackets);

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
        metadata: {
          ...(primaryEnemy.metadata || {}),
          generatedNpcIdentity,
          generatedEncounter,
        },
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
      worldContext: {
        zone: context.zone,
        environmentTags: context.environmentTags,
        relationshipSummary: context.relationshipContext.summary,
        memorySummary: context.memoryContext.summary,
        generatedPackets,
        generatedCampaignSeed,
        generatedWorldState,
      },
    });

    const seededSceneEffects = SceneEffectBridge.build(context, resolvedAction, npcReaction);
    const generatedEffectState = EffectCompositionEngine.compose({
      name: 'campaign-turn',
      tags: [
        ...context.environmentTags,
        ...generatedSceneState.effectTags,
        ...generatedSceneState.chatPresentationTags,
        ...seededSceneEffects.zoneShiftTags,
        ...seededSceneEffects.hazardPulseTags,
        ...seededSceneEffects.enemyPresenceTags,
        ...seededSceneEffects.environmentalPressureTags,
      ],
      environmentState: {
        zone: context.zone,
        worldState: input.campaign.world_state,
        sceneState: context.sceneState,
        scenePressure: generatedSceneState.scenePressure,
      },
    });

    generatedPackets.effectState = generatedEffectState;
    attachGeneratedToContext(context, generatedPackets);

    const sceneEffects = SceneEffectBridge.build(context, resolvedAction, npcReaction);
    const narrationPacket = NarrationPacketBuilder.build({
      resolvedAction,
      npcReaction,
      sceneEffects,
      generatedPackets,
    });
    narrationPacket.generated = generatedPackets;
    narrationPacket.metadata = {
      ...(narrationPacket.metadata || {}),
      sceneEffectPacket: sceneEffects,
    };

    return {
      context,
      resolvedAction,
      npcReaction,
      sceneEffects,
      narrationPacket,
      generatedPackets,
      primaryEnemy,
    };
  },
};
