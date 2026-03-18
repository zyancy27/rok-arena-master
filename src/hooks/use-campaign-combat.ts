import { useState, useCallback, useRef } from 'react';
import { detectDirectInteraction, type HitDetectionResult } from '@/lib/battle-hit-detection';
import {
  useConcentration, useOffensiveConcentration,
  CONCENTRATION_GAP_THRESHOLD,
  type HitDetermination, type DefenseDetermination,
  type ConcentrationResult, type OffensiveConcentrationResult,
} from '@/lib/battle-dice';
import { validateMove, type MoveValidationResult } from '@/lib/move-validation';
import { useCharacterStatusEffects } from '@/hooks/use-character-status-effects';
import type { CharacterStats } from '@/lib/character-stats';
import { TIER_BASE_STATS, DEFAULT_STATS } from '@/lib/character-stats';
import { CAMPAIGN_STARTING_ABILITIES } from '@/lib/campaign-types';
import { IntentEngine } from '@/systems/intent/IntentEngine';
import { CharacterContextResolver } from '@/systems/character/CharacterContextResolver';
import { CombatResolver, type StructuredCombatResult, type CombatOutcome } from '@/systems/combat/CombatResolver';
import { createCombatState } from '@/systems/combat/CombatState';

const MAX_CONCENTRATION_USES = 3;

export interface CampaignConcentrationPrompt {
  mode: 'offense' | 'defense';
  hitDetermination: HitDetermination;
  messageText: string;
  combatResult: StructuredCombatResult;
}

export interface CampaignCombatState {
  lastHitResult: HitDetermination | null;
  lastDefenseResult: DefenseDetermination | null;
  lastHitDetection: HitDetectionResult | null;
  lastMoveValidation: MoveValidationResult | null;
  pendingValidation: boolean;
  pendingMessage: string | null;
  concentrationPrompt: CampaignConcentrationPrompt | null;
  concentrationUsesLeft: number;
}

interface CampaignCharacterContext {
  characterId: string;
  name: string;
  level: number;
  campaignLevel: number;
  powers: string | null;
  abilities: string | null;
  stats?: Partial<CharacterStats>;
}

export function buildCampaignStats(char: CampaignCharacterContext): CharacterStats {
  const baseStats = char.stats
    ? { ...DEFAULT_STATS, ...char.stats }
    : TIER_BASE_STATS[char.level] || DEFAULT_STATS;

  const maxTier = CAMPAIGN_STARTING_ABILITIES.maxPowerTierAtLevel(char.campaignLevel);
  const effectiveTier = Math.min(char.level, maxTier);
  const scaleFactor = char.level > 0 ? effectiveTier / char.level : 1;

  if (scaleFactor < 1) {
    const dampened = { ...baseStats };
    const keys: (keyof CharacterStats)[] = [
      'stat_power', 'stat_strength', 'stat_speed', 'stat_durability',
      'stat_intelligence', 'stat_stamina', 'stat_skill', 'stat_battle_iq', 'stat_luck',
    ];
    for (const k of keys) {
      dampened[k] = Math.round(dampened[k] * (0.5 + scaleFactor * 0.5));
    }
    return dampened;
  }

  return baseStats;
}

function mapOutcomeToMode(outcome: CombatOutcome): 'offense' | 'defense' {
  return outcome === 'block' || outcome === 'dodge' ? 'defense' : 'offense';
}

function createFallbackRoll(rollType: 'attack' | 'defense') {
  return {
    baseRoll: 0,
    modifiers: {
      tierBonus: 0,
      statBonus: 0,
      skillBonus: 0,
      battleIqBonus: 0,
    },
    total: 0,
    rollType,
  };
}

export function useCampaignCombat(character: CampaignCharacterContext | null, partyNames?: string[]) {
  const [combatState, setCombatState] = useState<CampaignCombatState>({
    lastHitResult: null,
    lastDefenseResult: null,
    lastHitDetection: null,
    lastMoveValidation: null,
    pendingValidation: false,
    pendingMessage: null,
    concentrationPrompt: null,
    concentrationUsesLeft: MAX_CONCENTRATION_USES,
  });

  const statusEffects = useCharacterStatusEffects({
    characterName: character?.name,
    enabled: !!character,
  });

  const penaltyRef = useRef(0);

  const validateCampaignMove = useCallback((messageText: string): MoveValidationResult => {
    if (!character) return { isValid: true, warningMessage: null, suggestedFix: null, violationType: null };

    const validation = validateMove(messageText, {
      powers: character.powers,
      abilities: character.abilities,
      name: character.name,
    }, partyNames);

    setCombatState(prev => ({
      ...prev,
      lastMoveValidation: validation,
      pendingValidation: !validation.isValid,
      pendingMessage: !validation.isValid ? messageText : null,
    }));

    return validation;
  }, [character, partyNames]);

  const processCombatAction = useCallback((messageText: string): StructuredCombatResult => {
    const hitDetection = detectDirectInteraction(messageText);

    if (!character) {
      return {
        outcome: 'miss',
        success: false,
        timing: { actorSpeed: 0, targetSpeed: 0, speedAdvantage: 0, initiative: 'even' },
        positioning: {
          currentRange: 'mid',
          resolvedRange: 'mid',
          currentZone: 'mid',
          resolvedZone: 'mid',
          meters: 8,
          movementApplied: false,
          movementRequired: false,
          actionPossible: false,
          distanceDelta: 0,
        },
        engagement: {
          engaged: false,
          restrictedMovement: false,
          disengaging: false,
          breakChance: 0,
          interceptRisk: 0,
          interceptionTriggered: false,
        },
        damage: null,
        updatedState: createCombatState({ participants: [] }),
        hitDetermination: null,
        defenseDetermination: null,
        diceMetadata: null,
        narratorDiceContext: null,
        impact: 'No combat context available.',
        consequences: [],
        concentrationAvailable: false,
        gap: 0,
      };
    }

    const scaledStats = buildCampaignStats(character);
    const intentResult = IntentEngine.resolve(messageText, {
      mode: 'campaign',
      actorName: character.name,
      possibleTargets: [{ id: 'enemy', name: 'Enemy', kind: 'enemy' }],
    });
    const characterContext = CharacterContextResolver.resolve({
      characterId: character.characterId,
      name: character.name,
      tier: character.level,
      stats: scaledStats,
      abilities: character.abilities,
      powers: character.powers,
      stamina: scaledStats.stat_stamina,
      energy: scaledStats.stat_power,
    });

    const enemyTier = Math.max(1, Math.min(7, character.campaignLevel));
    const enemyStats = TIER_BASE_STATS[enemyTier] || DEFAULT_STATS;
    const enemyContext = CharacterContextResolver.resolve({
      characterId: 'enemy',
      name: 'Enemy',
      tier: enemyTier,
      stats: enemyStats,
      stamina: enemyStats.stat_stamina,
      energy: enemyStats.stat_power,
    });

    const structured = CombatResolver.resolve(
      intentResult.intent,
      characterContext,
      createCombatState({
        participants: [
          {
            id: character.characterId,
            name: character.name,
            stats: {
              hp: 100,
              stamina: characterContext.stamina,
              speed: characterContext.stats.stat_speed,
              strength: characterContext.stats.stat_strength,
            },
            statusEffects: statusEffects.activeEffects.map(effect => ({ type: effect.type, intensity: effect.intensity })),
          },
          {
            id: 'enemy',
            name: 'Enemy',
            stats: {
              hp: 100,
              stamina: enemyContext.stamina,
              speed: enemyContext.stats.stat_speed,
              strength: enemyContext.stats.stat_strength,
            },
          },
        ],
        rangeZone: 'mid',
      }),
      {
        actorId: character.characterId,
        targetId: 'enemy',
        targetContext: enemyContext,
        defenderPenalty: penaltyRef.current,
      },
    );

    setCombatState(prev => ({
      ...prev,
      lastHitResult: structured.hitDetermination,
      lastDefenseResult: structured.defenseDetermination,
      lastHitDetection: hitDetection,
      concentrationPrompt: null,
    }));

    const closeGap = Math.abs(structured.gap) <= CONCENTRATION_GAP_THRESHOLD;
    const concentrationAvailable = structured.concentrationAvailable && closeGap && combatState.concentrationUsesLeft > 0;
    structured.concentrationAvailable = concentrationAvailable;

    if (concentrationAvailable) {
      const fallbackHit: HitDetermination = structured.hitDetermination ?? {
        attackRoll: structured.defenseDetermination?.incomingAttackPotency ?? createFallbackRoll('attack'),
        defenseRoll: structured.defenseDetermination?.defenseRoll ?? createFallbackRoll('defense'),
        wouldHit: structured.outcome === 'hit' || structured.outcome === 'partial_hit',
        gap: structured.gap,
        isMentalAttack: false,
      };
      setCombatState(prev => ({
        ...prev,
        concentrationPrompt: {
          mode: mapOutcomeToMode(structured.outcome),
          hitDetermination: fallbackHit,
          messageText,
          combatResult: structured,
        },
      }));
    }

    return structured;
  }, [character, combatState.concentrationUsesLeft, statusEffects.activeEffects]);

  const applyOffensiveConcentration = useCallback((result: OffensiveConcentrationResult) => {
    if (!combatState.concentrationPrompt) return null;
    const prompt = combatState.concentrationPrompt;
    penaltyRef.current = result.statPenalty;

    const updated: StructuredCombatResult = {
      ...prompt.combatResult,
      outcome: result.hitSuccess ? 'hit' : prompt.combatResult.outcome,
      success: result.hitSuccess,
      diceMetadata: {
        ...(prompt.combatResult.diceMetadata ?? {}),
        concentrated: true,
        concentrationBonus: result.bonusRoll,
        outcome: result.hitSuccess ? 'hit' : prompt.combatResult.outcome,
        attackRoll: {
          ...((prompt.combatResult.diceMetadata as any)?.attackRoll ?? {}),
          total: result.newAttackTotal,
        },
      },
      narratorDiceContext: {
        diceResult: {
          ...((prompt.combatResult.narratorDiceContext as any)?.diceResult ?? {}),
          concentrated: true,
          concentrationBonus: result.bonusRoll,
          hit: result.hitSuccess,
          attackTotal: result.newAttackTotal,
          outcome: result.hitSuccess ? 'hit' : prompt.combatResult.outcome,
        },
      },
    };

    setCombatState(prev => ({
      ...prev,
      concentrationPrompt: null,
      concentrationUsesLeft: prev.concentrationUsesLeft - 1,
    }));

    return updated;
  }, [combatState.concentrationPrompt]);

  const applyDefensiveConcentration = useCallback((result: ConcentrationResult) => {
    if (!combatState.concentrationPrompt) return null;
    const prompt = combatState.concentrationPrompt;
    penaltyRef.current = result.statPenalty;

    const updatedOutcome: CombatOutcome = result.dodgeSuccess ? 'dodge' : prompt.combatResult.outcome;
    const updated: StructuredCombatResult = {
      ...prompt.combatResult,
      outcome: updatedOutcome,
      success: result.dodgeSuccess,
      diceMetadata: {
        ...(prompt.combatResult.diceMetadata ?? {}),
        concentrated: true,
        concentrationBonus: result.bonusRoll,
        outcome: updatedOutcome,
        defenseRoll: {
          ...((prompt.combatResult.diceMetadata as any)?.defenseRoll ?? {}),
          total: result.newDefenseTotal,
        },
      },
      narratorDiceContext: {
        defenseResult: {
          ...((prompt.combatResult.narratorDiceContext as any)?.defenseResult ?? {}),
          concentrated: true,
          concentrationBonus: result.bonusRoll,
          success: result.dodgeSuccess,
          defenseTotal: result.newDefenseTotal,
          outcome: updatedOutcome,
        },
      },
    };

    setCombatState(prev => ({
      ...prev,
      concentrationPrompt: null,
      concentrationUsesLeft: prev.concentrationUsesLeft - 1,
    }));

    return updated;
  }, [combatState.concentrationPrompt]);

  const skipConcentration = useCallback(() => {
    const prompt = combatState.concentrationPrompt;
    setCombatState(prev => ({ ...prev, concentrationPrompt: null }));
    return prompt?.combatResult ?? null;
  }, [combatState.concentrationPrompt]);

  const processNarratorResponse = useCallback((narrationText: string) => {
    statusEffects.processMessage(narrationText, true);
  }, [statusEffects]);

  const clearPendingValidation = useCallback(() => {
    setCombatState(prev => ({
      ...prev,
      pendingValidation: false,
      pendingMessage: null,
      lastMoveValidation: null,
    }));
  }, []);

  const acceptPendingValidation = useCallback(() => {
    const msg = combatState.pendingMessage;
    setCombatState(prev => ({
      ...prev,
      pendingValidation: false,
      pendingMessage: null,
      lastMoveValidation: null,
    }));
    return msg;
  }, [combatState.pendingMessage]);

  return {
    combatState,
    statusEffects,
    validateCampaignMove,
    processCombatAction,
    processNarratorResponse,
    clearPendingValidation,
    acceptPendingValidation,
    applyOffensiveConcentration,
    applyDefensiveConcentration,
    skipConcentration,
  };
}
