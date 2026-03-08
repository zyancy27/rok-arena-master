/**
 * Campaign combat mechanics hook.
 * Integrates dice rolls, hit detection, move validation, and status effects
 * seamlessly into the campaign RP chat.
 */

import { useState, useCallback, useRef } from 'react';
import { detectDirectInteraction, classifyInteraction, type HitDetectionResult } from '@/lib/battle-hit-detection';
import { determineHit, determineMentalHit, determineDefenseSuccess, type HitDetermination, type DefenseDetermination } from '@/lib/battle-dice';
import { validateMove, isMentalAttack, type MoveValidationResult } from '@/lib/move-validation';
import { useCharacterStatusEffects } from '@/hooks/use-character-status-effects';
import type { CharacterStats } from '@/lib/character-stats';
import { TIER_BASE_STATS, DEFAULT_STATS } from '@/lib/character-stats';
import { CAMPAIGN_STARTING_ABILITIES } from '@/lib/campaign-types';

export interface CampaignCombatState {
  /** Latest dice roll result (attack) */
  lastHitResult: HitDetermination | null;
  /** Latest defense result */
  lastDefenseResult: DefenseDetermination | null;
  /** Latest hit detection */
  lastHitDetection: HitDetectionResult | null;
  /** Latest move validation */
  lastMoveValidation: MoveValidationResult | null;
  /** Whether a move validation warning is pending */
  pendingValidation: boolean;
  /** The message text waiting for validation approval */
  pendingMessage: string | null;
}

interface CampaignCharacterContext {
  characterId: string;
  name: string;
  level: number; // Original tier
  campaignLevel: number;
  powers: string | null;
  abilities: string | null;
  /** Full stats from character record */
  stats?: Partial<CharacterStats>;
}

/**
 * Build approximate stats for a campaign character.
 * Uses actual character stats if available, otherwise derives from tier.
 * Applies campaign-level scaling (power reset dampening).
 */
function buildCampaignStats(char: CampaignCharacterContext): CharacterStats {
  const baseStats = char.stats
    ? { ...DEFAULT_STATS, ...char.stats }
    : TIER_BASE_STATS[char.level] || DEFAULT_STATS;

  // Campaign power reset: scale stats down based on campaign level vs original tier
  const maxTier = CAMPAIGN_STARTING_ABILITIES.maxPowerTierAtLevel(char.campaignLevel);
  const effectiveTier = Math.min(char.level, maxTier);
  const scaleFactor = char.level > 0 ? effectiveTier / char.level : 1;

  // Only dampen stats if character is above their allowed campaign tier
  if (scaleFactor < 1) {
    const dampened = { ...baseStats };
    const keys: (keyof CharacterStats)[] = [
      'stat_power', 'stat_strength', 'stat_speed', 'stat_durability',
      'stat_intelligence', 'stat_stamina', 'stat_skill', 'stat_battle_iq', 'stat_luck',
    ];
    for (const k of keys) {
      dampened[k] = Math.round(dampened[k] * (0.5 + scaleFactor * 0.5)); // Dampen but not fully
    }
    return dampened;
  }

  return baseStats;
}

export function useCampaignCombat(character: CampaignCharacterContext | null, partyNames?: string[]) {
  const [combatState, setCombatState] = useState<CampaignCombatState>({
    lastHitResult: null,
    lastDefenseResult: null,
    lastHitDetection: null,
    lastMoveValidation: null,
    pendingValidation: false,
    pendingMessage: null,
  });

  // Status effects
  const statusEffects = useCharacterStatusEffects({
    characterName: character?.name,
    enabled: !!character,
  });

  // Penalty from last concentration or action
  const penaltyRef = useRef(0);

  /**
   * Validate a move against the character's abilities.
   * Returns the validation result. If invalid, sets pendingValidation.
   */
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

  /**
   * Process a player message for combat mechanics.
   * Detects hits, rolls dice, returns context for the narrator.
   */
  const processCombatAction = useCallback((messageText: string): {
    hitDetection: HitDetectionResult;
    hitResult: HitDetermination | null;
    defenseResult: DefenseDetermination | null;
    narratorDiceContext: Record<string, unknown> | null;
    diceMetadata: Record<string, unknown> | null;
  } => {
    if (!character) {
      const emptyDetection: HitDetectionResult = {
        detected: false, intent: 'none', matchedVerbs: [], isRanged: false,
        hasTarget: false, shouldTriggerHitCheck: false, shouldTriggerDefenseCheck: false, confidence: 0,
      };
      return { hitDetection: emptyDetection, hitResult: null, defenseResult: null, narratorDiceContext: null, diceMetadata: null };
    }

    const hitDetection = detectDirectInteraction(messageText);
    const charStats = buildCampaignStats(character);

    // Use campaign-effective tier for dice
    const maxTier = CAMPAIGN_STARTING_ABILITIES.maxPowerTierAtLevel(character.campaignLevel);
    const effectiveTier = Math.min(character.level, maxTier);

    // Generic "enemy" stats based on campaign context (scaled to campaign level)
    const enemyTier = Math.max(1, Math.min(7, character.campaignLevel));
    const enemyStats = TIER_BASE_STATS[enemyTier] || DEFAULT_STATS;

    let hitResult: HitDetermination | null = null;
    let defenseResult: DefenseDetermination | null = null;
    let narratorDiceContext: Record<string, unknown> | null = null;
    let diceMetadata: Record<string, unknown> | null = null;

    if (hitDetection.shouldTriggerHitCheck) {
      const isMental = isMentalAttack(messageText);
      hitResult = isMental
        ? determineMentalHit(charStats, effectiveTier, enemyStats, enemyTier, true, penaltyRef.current)
        : determineHit(charStats, effectiveTier, enemyStats, enemyTier, true, penaltyRef.current);

      narratorDiceContext = {
        diceResult: {
          hit: hitResult.wouldHit,
          attackTotal: hitResult.attackRoll.total,
          defenseTotal: hitResult.defenseRoll.total,
          gap: hitResult.gap,
          isMental,
        },
      };

      diceMetadata = {
        type: 'attack',
        hit: hitResult.wouldHit,
        attackRoll: hitResult.attackRoll,
        defenseRoll: hitResult.defenseRoll,
        gap: hitResult.gap,
        isMental,
      };

      // Reset penalty after use
      penaltyRef.current = 0;
    } else if (hitDetection.shouldTriggerDefenseCheck) {
      const classification = classifyInteraction(hitDetection);
      const defType = classification === 'defensive'
        ? (hitDetection.intent === 'dodge' ? 'dodge' : 'block')
        : 'block';

      defenseResult = determineDefenseSuccess(
        charStats, effectiveTier, enemyStats, enemyTier, defType as 'block' | 'dodge', penaltyRef.current
      );

      narratorDiceContext = {
        defenseResult: {
          success: defenseResult.defenseSuccess,
          defenseTotal: defenseResult.defenseRoll.total,
          incomingTotal: defenseResult.incomingAttackPotency.total,
          gap: defenseResult.gap,
          defenseType: defType,
        },
      };

      diceMetadata = {
        type: 'defense',
        success: defenseResult.defenseSuccess,
        defenseRoll: defenseResult.defenseRoll,
        incomingRoll: defenseResult.incomingAttackPotency,
        gap: defenseResult.gap,
        defenseType: defType,
      };

      penaltyRef.current = 0;
    }

    setCombatState(prev => ({
      ...prev,
      lastHitResult: hitResult,
      lastDefenseResult: defenseResult,
      lastHitDetection: hitDetection,
    }));

    return { hitDetection, hitResult, defenseResult, narratorDiceContext, diceMetadata };
  }, [character]);

  /**
   * Process a narrator response for status effects.
   */
  const processNarratorResponse = useCallback((narrationText: string) => {
    statusEffects.processMessage(narrationText, true);
  }, [statusEffects]);

  /**
   * Clear pending validation (user chose to redo).
   */
  const clearPendingValidation = useCallback(() => {
    setCombatState(prev => ({
      ...prev,
      pendingValidation: false,
      pendingMessage: null,
      lastMoveValidation: null,
    }));
  }, []);

  /**
   * Accept pending validation (user explained successfully).
   */
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
  };
}
