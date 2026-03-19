import { applyHardClamp, type CharacterProfile, type ClampResult } from '@/lib/hard-clamp';
import { IntentEngine } from '@/systems/intent/IntentEngine';
import { CombatResolver } from '@/systems/combat/CombatResolver';
import { createCombatState } from '@/systems/combat/CombatState';
import { BattleContextAssembler } from '@/systems/context/BattleContextAssembler';
import { buildResolvedActionPacket } from './ActionPipeline';
import { NarrationPacketBuilder } from '@/systems/narration/NarrationPacketBuilder';
import { SceneEffectBridge } from '@/systems/map/SceneEffectBridge';
import type { ActionPipelineResult } from '@/systems/types/PipelineTypes';

export interface BattleActionPipelineInput {
  rawText: string;
  actor: {
    characterId: string;
    name: string;
    tier: number;
    stats: CharacterProfile['stats'];
    abilities?: string | null;
    powers?: string | null;
    statusEffects?: Array<{ type: string; intensity?: string }>;
    stamina?: number | null;
    energy?: number | null;
  };
  opponents?: Array<{
    id: string;
    name: string;
    tier?: number;
    stats?: CharacterProfile['stats'];
    abilities?: string | null;
    powers?: string | null;
  }>;
  battleZone?: string | null;
  activeHazards?: string[];
  environmentTags?: string[];
  rangeState?: { zone?: string; meters?: number };
  sceneState?: Record<string, unknown>;
  defaultTool?: string | null;
  consecutiveHighForceTurns?: number;
}

export interface BattleActionPipelineResult extends ActionPipelineResult {
  clampResult: ClampResult;
  highForceTurnCount: number;
}

export const BattleActionPipeline = {
  execute(input: BattleActionPipelineInput): BattleActionPipelineResult {
    const intentResult = IntentEngine.resolve(input.rawText, {
      mode: 'battle',
      actorName: input.actor.name,
      possibleTargets: (input.opponents || []).map((opponent) => ({
        id: opponent.id,
        name: opponent.name,
        kind: 'enemy' as const,
      })),
      defaultTool: input.defaultTool ?? null,
    });

    const profile: CharacterProfile = {
      name: input.actor.name,
      tier: input.actor.tier,
      stats: input.actor.stats,
      powers: input.actor.powers ?? null,
      abilities: input.actor.abilities ?? null,
      consecutiveHighForceTurns: input.consecutiveHighForceTurns ?? 0,
    };
    const clampResult = applyHardClamp(intentResult.legacyMoveIntent, profile);

    const context = BattleContextAssembler.assemble({
      actor: input.actor,
      opponents: input.opponents,
      battleZone: input.battleZone,
      activeHazards: input.activeHazards,
      environmentTags: input.environmentTags,
      rangeState: input.rangeState,
      narratorSceneState: input.sceneState,
    });

    const primaryTarget = context.primaryTarget?.context ?? null;
    const combatResult = intentResult.intent.isCombatAction && context.primaryTarget?.id && primaryTarget
      ? CombatResolver.resolve(
          intentResult.intent,
          context.actor,
          createCombatState({
            participants: [
              {
                id: context.actor.characterId || input.actor.characterId,
                name: context.actor.name,
                stats: {
                  hp: Math.max(1, context.actor.stamina),
                  stamina: context.actor.stamina,
                  speed: context.actor.stats.stat_speed,
                  strength: context.actor.stats.stat_strength,
                },
              },
              {
                id: context.primaryTarget.id,
                name: context.primaryTarget.name,
                stats: {
                  hp: Math.max(1, primaryTarget.stamina),
                  stamina: primaryTarget.stamina,
                  speed: primaryTarget.stats.stat_speed,
                  strength: primaryTarget.stats.stat_strength,
                },
              },
            ],
            rangeZone: (input.rangeState?.zone as 'close' | 'mid' | 'far' | undefined) ?? 'mid',
            zone: input.battleZone ?? null,
            terrainTags: input.activeHazards ?? [],
          }),
          {
            actorId: context.actor.characterId || input.actor.characterId,
            targetId: context.primaryTarget.id,
            targetContext: primaryTarget,
          },
        )
      : null;

    const resolvedAction = buildResolvedActionPacket({
      rawText: input.rawText,
      intentResult,
      context,
      actorContext: context.actor,
      targetContext: primaryTarget,
      combatResult,
    });

    const sceneEffects = SceneEffectBridge.build(context, resolvedAction, null);
    const narrationPacket = NarrationPacketBuilder.build({
      resolvedAction,
      sceneEffects,
    });

    const isHighForce = intentResult.legacyMoveIntent.intentCategory === 'HIGH_FORCE' || intentResult.legacyMoveIntent.posture === 'RECKLESS';

    return {
      context,
      resolvedAction,
      npcReaction: null,
      sceneEffects,
      narrationPacket,
      clampResult,
      highForceTurnCount: isHighForce ? (input.consecutiveHighForceTurns ?? 0) + 1 : 0,
    };
  },
};
