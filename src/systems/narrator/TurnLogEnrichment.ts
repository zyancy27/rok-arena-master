/**
 * Turn Log Enrichment
 * ─────────────────────────────────────────────────────────────────────
 * Lightweight bridge between the Intent Engine and the Turn Log.
 *
 * The chat layer doesn't have a fully resolved character context handy,
 * so we don't run the full ActionResolver here. Instead we:
 *   1) Run the IntentEngine on the raw text (cheap, deterministic).
 *   2) Derive a synthetic outcome band from intent.intensity / precision
 *      so the Promotion Engine has a meaningful signal until the real
 *      Action/Roll resolver is wired into chat narration.
 *
 * This keeps the Promotion Engine's `roll_result.band` and `parsed_intent`
 * non-stub without forcing the chat to assemble a heavy combat pipeline.
 */

import { IntentEngine, type IntentEngineContext, type Intent } from '@/systems/intent/IntentEngine';

export type SyntheticBand =
  | 'severe_failure'
  | 'normal_failure'
  | 'normal_success'
  | 'strong_success';

export interface EnrichedTurnPayload {
  parsedIntent: Record<string, unknown>;
  rollResult: Record<string, unknown> | null;
}

/**
 * Map intent intensity + precision into a coarse synthetic band.
 * No randomness — fully deterministic so the Promotion Engine evaluates
 * the same input the same way every time.
 */
function deriveBand(intent: Intent): SyntheticBand {
  const precision = intent.precision ?? 55;
  const intensity = intent.intensity ?? 50;
  const risk = intent.riskLevel ?? 40;

  // High precision + high intensity = strong outcome
  if (precision >= 75 && intensity >= 70) return 'strong_success';
  // High risk + low precision = severe failure
  if (risk >= 75 && precision < 40) return 'severe_failure';
  // Low precision generally = failure
  if (precision < 40) return 'normal_failure';
  return 'normal_success';
}

/**
 * Build an enriched turn-log payload from raw player text.
 * Safe to call on every turn — pure function, no IO.
 */
export function enrichTurnPayload(
  rawText: string,
  context: IntentEngineContext = {},
): EnrichedTurnPayload {
  const intentResult = IntentEngine.resolve(rawText, context);
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

  // Only emit a roll_result when the intent actually wants a roll.
  // Promotion Engine treats absent rollResult as "no extreme outcome".
  const rollResult: Record<string, unknown> | null = intent.requiresRoll
    ? {
        band: deriveBand(intent),
        type: intent.isCombatAction ? 'combat' : intent.type,
        synthetic: true,
        source: 'TurnLogEnrichment',
      }
    : null;

  return { parsedIntent, rollResult };
}
