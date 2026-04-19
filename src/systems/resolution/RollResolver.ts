/**
 * RollResolver — Part 7 of the ROK Narrator Brain
 * ─────────────────────────────────────────────────────────────────────
 * Thin labeled-roll layer on top of ActionResolver.
 *
 * The existing ActionResolver decides effectiveness (0-100) and success.
 * RollResolver adds:
 *   • a labeled roll type (Attack / Perception / Stealth / Social / …)
 *   • a coarse outcome tier (strong_success → severe_failure)
 *   • narration-ready descriptors of what the roll affected
 *
 * Pure mapping layer — no IO, no state writes.
 * Combat behavior is preserved: combat intents always map to AttackRoll.
 */

import type { Intent } from '@/systems/intent/IntentEngine';
import type { ActionResult, ActionResolutionContext } from '@/systems/resolution/ActionResolver';
import { ActionResolver } from '@/systems/resolution/ActionResolver';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';

export type RollType =
  | 'AttackRoll'
  | 'DefenseRoll'
  | 'StrengthRoll'
  | 'AgilityRoll'
  | 'PerceptionRoll'
  | 'InvestigationRoll'
  | 'StealthRoll'
  | 'SocialRoll'
  | 'ResistanceRoll'
  | 'SurvivalRoll'
  | 'UtilityRoll';

export type OutcomeTier =
  | 'strong_success'
  | 'normal_success'
  | 'partial_success'
  | 'failure_with_consequence'
  | 'severe_failure';

export type RollMode = 'static' | 'opposed';

/** What surfaces of the world this roll's outcome should touch. */
export type RollAffects =
  | 'position'
  | 'information'
  | 'social_response'
  | 'time'
  | 'pressure'
  | 'opportunity_state'
  | 'suspicion_trust_access';

export interface ResolvedRoll {
  type: RollType;
  mode: RollMode;
  required: boolean;        // false → trivial, no roll surfaced
  tier: OutcomeTier;
  effectiveness: number;    // 0-100, mirrors ActionResult
  success: boolean;
  affects: RollAffects[];
  /** Short reason the roll resolver chose this label (for tester debug). */
  label_reason: string;
  /** Narration-ready impact phrase. */
  impact: string;
  /** Consequences forwarded from the action resolver. */
  consequences: string[];
}

// ─── Roll-type selection ─────────────────────────────────────────────

/**
 * Decide which labeled roll covers this intent.
 * Combat intents are always AttackRoll to keep the combat pipeline intact.
 */
function pickRollType(intent: Intent): { type: RollType; reason: string } {
  if (intent.isCombatAction) {
    return { type: 'AttackRoll', reason: 'intent.isCombatAction' };
  }

  switch (intent.type) {
    case 'attack':
      return { type: 'AttackRoll', reason: 'intent.type=attack' };

    case 'observe': {
      const sub = (intent.subType ?? '').toLowerCase();
      const txt = `${intent.method ?? ''} ${intent.target ?? ''} ${sub}`.toLowerCase();
      if (/investigat|search|examine|inspect|study|piece together/.test(txt)) {
        return { type: 'InvestigationRoll', reason: 'observe → investigative wording' };
      }
      return { type: 'PerceptionRoll', reason: 'intent.type=observe' };
    }

    case 'move': {
      const txt = `${intent.method ?? ''} ${intent.subType ?? ''}`.toLowerCase();
      if (/sneak|hide|stealth|silent|unseen|slip past|creep/.test(txt)) {
        return { type: 'StealthRoll', reason: 'move → stealth wording' };
      }
      if (/climb|jump|leap|vault|tumble|sprint|dodge|balance/.test(txt)) {
        return { type: 'AgilityRoll', reason: 'move → agility wording' };
      }
      if (/endure|trek|push through|march|carry|haul/.test(txt)) {
        return { type: 'SurvivalRoll', reason: 'move → survival wording' };
      }
      return { type: 'AgilityRoll', reason: 'intent.type=move (default)' };
    }

    case 'speak': {
      const tone = (intent.emotionalTone ?? '').toLowerCase();
      if (/intimidat|threaten|menac/.test(tone)) {
        return { type: 'SocialRoll', reason: 'speak → intimidation tone' };
      }
      return { type: 'SocialRoll', reason: 'intent.type=speak' };
    }

    case 'interact': {
      const txt = `${intent.method ?? ''} ${intent.target ?? ''} ${intent.tool ?? ''}`.toLowerCase();
      if (/force|break|pry|smash|shove|lift|push/.test(txt)) {
        return { type: 'StrengthRoll', reason: 'interact → force wording' };
      }
      if (/resist|withstand|brace|hold against/.test(txt)) {
        return { type: 'ResistanceRoll', reason: 'interact → resistance wording' };
      }
      return { type: 'UtilityRoll', reason: 'intent.type=interact (default)' };
    }

    case 'ability': {
      // Powers/abilities still resolve through stats but get a clear label
      // so the narrator doesn't treat them like attacks unless they are.
      return { type: 'UtilityRoll', reason: 'intent.type=ability (non-combat)' };
    }

    default:
      return { type: 'UtilityRoll', reason: 'fallback' };
  }
}

// ─── Outcome tier mapping ────────────────────────────────────────────

function tierFromAction(result: ActionResult): OutcomeTier {
  const eff = result.effectiveness;
  if (result.success) {
    if (eff >= 80) return 'strong_success';
    if (eff >= 55) return 'normal_success';
    return 'partial_success';
  }
  if (eff <= 20) return 'severe_failure';
  return 'failure_with_consequence';
}

// ─── Affects mapping ─────────────────────────────────────────────────

const AFFECTS_BY_TYPE: Record<RollType, RollAffects[]> = {
  AttackRoll:        ['position', 'pressure'],
  DefenseRoll:       ['position', 'pressure'],
  StrengthRoll:      ['position', 'time'],
  AgilityRoll:       ['position', 'time'],
  PerceptionRoll:    ['information'],
  InvestigationRoll: ['information', 'opportunity_state'],
  StealthRoll:       ['suspicion_trust_access', 'position'],
  SocialRoll:        ['social_response', 'suspicion_trust_access'],
  ResistanceRoll:    ['pressure'],
  SurvivalRoll:      ['time', 'pressure'],
  UtilityRoll:       ['opportunity_state'],
};

// ─── Required-roll gate ──────────────────────────────────────────────

/**
 * Skip rolls for trivial/obvious actions even when ActionResolver runs.
 * Mirrors the spec: only roll when uncertainty AND consequence matter.
 */
function rollIsRequired(intent: Intent, ctx: ActionResolutionContext): boolean {
  if (intent.isCombatAction) return true;
  if (!intent.requiresRoll) return false;

  // Trivial-action heuristics
  const risk = intent.riskLevel ?? 30;
  const intensity = intent.intensity ?? 40;
  const hasPressure = Boolean(ctx.hasActiveThreat) || (ctx.activeHazards?.length ?? 0) > 0;
  if (risk < 15 && intensity < 25 && !hasPressure) return false;

  return true;
}

// ─── Public API ──────────────────────────────────────────────────────

export const RollResolver = {
  /**
   * Resolve a labeled roll for the given intent.
   * Internally delegates effectiveness math to ActionResolver so combat
   * remains identical to the current pipeline.
   */
  resolve(
    intent: Intent,
    characterContext: ResolvedCharacterContext,
    ctx: ActionResolutionContext = {},
    opposed?: { value: number },
  ): ResolvedRoll {
    const pick = pickRollType(intent);
    const required = rollIsRequired(intent, ctx);
    const action = ActionResolver.resolve(intent, characterContext, ctx);

    let tier = tierFromAction(action);

    // Opposed-check adjustment: if an opposing value was supplied, downgrade
    // strong successes that don't beat the opposition by a clear margin.
    if (opposed && action.success) {
      const margin = action.effectiveness - opposed.value;
      if (margin < -10) tier = 'failure_with_consequence';
      else if (margin < 5 && tier === 'strong_success') tier = 'normal_success';
      else if (margin < 0 && tier === 'normal_success') tier = 'partial_success';
    }

    // Trivial actions: surface the outcome but mark roll as not required
    // so the narrator doesn't dramatize a non-roll.
    if (!required) {
      tier = action.success ? 'normal_success' : 'partial_success';
    }

    return {
      type: pick.type,
      mode: opposed ? 'opposed' : 'static',
      required,
      tier,
      effectiveness: action.effectiveness,
      success: action.success,
      affects: AFFECTS_BY_TYPE[pick.type],
      label_reason: pick.reason,
      impact: action.impact,
      consequences: action.consequences,
    };
  },

  /** Compact one-line summary for tester debug + narrator prompt. */
  describe(roll: ResolvedRoll): string {
    if (!roll.required) {
      return `${roll.type} skipped (trivial) — outcome ${roll.tier}`;
    }
    return `${roll.type} ${roll.mode} → ${roll.tier} (eff ${roll.effectiveness}) affects ${roll.affects.join('/')}`;
  },
};
