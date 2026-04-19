/**
 * Turn Log Enrichment
 * ─────────────────────────────────────────────────────────────────────
 * Bridge between the Intent Engine, the Action Resolver, and the Turn Log.
 *
 * Pipeline per turn:
 *   1) IntentEngine.resolve(rawText) → structured Intent
 *   2) If a ResolvedCharacterContext is supplied:
 *        ActionResolver.resolve(intent, ctx) → ActionResult
 *      Else: derive a synthetic outcome from intent fields alone.
 *   3) Map ActionResult.effectiveness → outcome band the Promotion
 *      Engine already understands (severe_failure / normal_failure /
 *      normal_success / strong_success).
 *
 * Pure function, no IO, safe to run on every player turn.
 */

import { IntentEngine, type IntentEngineContext, type Intent } from '@/systems/intent/IntentEngine';
import { ActionResolver, type ActionResult, type ActionResolutionContext } from '@/systems/resolution/ActionResolver';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';

export type OutcomeBand =
  | 'severe_failure'
  | 'normal_failure'
  | 'normal_success'
  | 'strong_success';

export interface EnrichedTurnPayload {
  parsedIntent: Record<string, unknown>;
  rollResult: Record<string, unknown> | null;
}

export interface EnrichmentOptions {
  intentContext?: IntentEngineContext;
  characterContext?: ResolvedCharacterContext;
  resolutionContext?: ActionResolutionContext;
}

/** Map ActionResolver effectiveness (0-100) into a coarse outcome band. */
function bandFromEffectiveness(effectiveness: number, success: boolean): OutcomeBand {
  if (effectiveness >= 80) return 'strong_success';
  if (success) return 'normal_success';
  if (effectiveness <= 25) return 'severe_failure';
  return 'normal_failure';
}

/**
 * Synthetic fallback band when no character context is available.
 * Deterministic — no randomness — so promotion is reproducible.
 */
function syntheticBand(intent: Intent): OutcomeBand {
  const precision = intent.precision ?? 55;
  const intensity = intent.intensity ?? 50;
  const risk = intent.riskLevel ?? 40;
  if (precision >= 75 && intensity >= 70) return 'strong_success';
  if (risk >= 75 && precision < 40) return 'severe_failure';
  if (precision < 40) return 'normal_failure';
  return 'normal_success';
}

/**
 * Build an enriched turn-log payload from raw player text.
 */
export function enrichTurnPayload(
  rawText: string,
  options: EnrichmentOptions = {},
): EnrichedTurnPayload {
  const { intentContext, characterContext, resolutionContext } = options;

  const intentResult = IntentEngine.resolve(rawText, intentContext);
  const intent = intentResult.intent;

  const parsedIntent: Record<string, unknown> = {
    type: intent.type,
    subType: intent.subType ?? null,
    target: intent.target ?? null,
    tool: intent.tool ?? null,
    method: intent.method ?? null,
    intensity: intent.intensity ?? null,
    precision: intent.precision ?? null,
    riskLevel: intent.riskLevel ?? null,
    emotionalTone: intent.emotionalTone ?? null,
    isCombatAction: intent.isCombatAction,
    requiresRoll: intent.requiresRoll,
    confidence: intentResult.confidence,
  };

  if (!intent.requiresRoll) {
    return { parsedIntent, rollResult: null };
  }

  let rollResult: Record<string, unknown>;
  if (characterContext) {
    let actionResult: ActionResult;
    try {
      actionResult = ActionResolver.resolve(intent, characterContext, resolutionContext ?? {});
    } catch (e) {
      console.warn('[TurnLogEnrichment] ActionResolver failed, falling back to synthetic:', e);
      return {
        parsedIntent,
        rollResult: {
          band: syntheticBand(intent),
          type: intent.isCombatAction ? 'combat' : intent.type,
          synthetic: true,
          source: 'TurnLogEnrichment.fallback',
        },
      };
    }
    rollResult = {
      band: bandFromEffectiveness(actionResult.effectiveness, actionResult.success),
      type: intent.isCombatAction ? 'combat' : intent.type,
      success: actionResult.success,
      effectiveness: actionResult.effectiveness,
      impact: actionResult.impact,
      consequences: actionResult.consequences,
      synthetic: false,
      source: 'TurnLogEnrichment.actionResolver',
    };
  } else {
    rollResult = {
      band: syntheticBand(intent),
      type: intent.isCombatAction ? 'combat' : intent.type,
      synthetic: true,
      source: 'TurnLogEnrichment.synthetic',
    };
  }

  return { parsedIntent, rollResult };
}
