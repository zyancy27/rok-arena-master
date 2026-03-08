/**
 * Hard Clamp Enforcement – Layer 2
 *
 * Runs AFTER intent interpretation and BEFORE the existing
 * concentration / dice / physics pipeline.
 *
 * Enforces:
 *   - Force cap (derived from character stats & tier)
 *   - Stamina drain (repeated high-force posture costs more)
 *   - Ability / element compatibility with character profile
 *   - Range & AoE capability restrictions
 *   - Tier-based passive survivability (does NOT cap damage output)
 *
 * All enforcement is internal-only – the original move text is NEVER
 * modified, and nothing from this layer appears in chat.
 */

import type { MoveIntent, IntentCategory, Posture } from './intent-interpreter';
import type { CharacterStats } from './character-stats';
import { disambiguateText } from './element-disambiguation';

// ─── Public types ────────────────────────────────────────────────────────────

export interface CharacterProfile {
  name: string;
  tier: number;
  stats: CharacterStats;
  powers: string | null;
  abilities: string | null;
  /** Accumulated high-force turns this battle (tracked externally) */
  consecutiveHighForceTurns: number;
}

export interface ClampResult {
  /** Effective force category after clamping */
  effectiveForce: IntentCategory;
  /** Effective posture after clamping */
  effectivePosture: Posture;
  /** Stamina drain multiplier (1.0 = normal, >1 = extra drain) */
  staminaDrainMultiplier: number;
  /** Whether AoE was clamped to single-target */
  aoeClamped: boolean;
  /** Whether element mismatch was detected */
  elementMismatch: boolean;
  /** Mismatched elements for internal logging */
  mismatchedElements: string[];
  /** Whether control intent was suppressed */
  controlSuppressed: boolean;
  /** Whether absolute language was neutralised */
  absoluteLanguageNeutralised: boolean;
  /** Internal notes for prompt context (never shown in UI) */
  internalNotes: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Force cap thresholds by tier.
 * Tier does NOT cap damage output – it determines what force level the
 * character can reliably control.  Exceeding the cap means the action
 * should be treated at the capped level by downstream systems.
 */
const FORCE_CAP_BY_TIER: Record<number, IntentCategory> = {
  1: 'LOW_FORCE',
  2: 'MODERATE_FORCE',
  3: 'HIGH_FORCE',
  4: 'HIGH_FORCE',
  5: 'HIGH_FORCE',
  6: 'HIGH_FORCE',
  7: 'HIGH_FORCE',
};

/**
 * Minimum power stat to attempt AoE without clamping.
 */
const AOE_POWER_THRESHOLD = 30;

/**
 * Additional stamina drain per consecutive high-force turn.
 * This does NOT alter concentration formulas – it's a multiplier
 * applied to whatever stamina cost the existing system calculates.
 */
const HIGH_FORCE_STAMINA_ESCALATION = 0.08;

// ─── Element extraction (mirrors move-validation.ts logic) ───────────────────

const ELEMENT_PATTERNS: Record<string, RegExp> = {
  fire: /fire|flame|burn|heat|inferno|blaze|magma|lava|pyro/i,
  ice: /ice|freeze|frost|cold|snow|blizzard|cryo|frozen/i,
  water: /water|aqua|ocean|wave|flood|hydro|rain/i,
  lightning: /lightning|thunder|electric|shock|volt|static/i,
  earth: /earth|rock|stone|ground|terra|metal|seismic/i,
  wind: /wind|air|gust|tornado|hurricane|aero/i,
  light: /light|holy|radiant|solar|divine|celestial/i,
  dark: /dark|shadow|void|abyss|night|umbra/i,
  psychic: /psychic|mental|mind|telekinesis|telepathy|psionic/i,
  poison: /poison|toxic|venom|acid|corrosive/i,
  gravity: /gravity|weight|mass|crush|pull/i,
  time: /time|temporal|chrono/i,
  space: /space|dimension|portal|warp|teleport/i,
  energy: /energy|ki|chi|chakra|aura/i,
};

function extractCharacterElements(powers: string | null, abilities: string | null): string[] {
  const raw = `${powers || ''} ${abilities || ''}`.toLowerCase();
  // Disambiguate before scanning so character descriptions with mundane
  // phrases (e.g. "moves with light steps") don't create false element matches.
  const text = disambiguateText(raw);
  const found: string[] = [];
  for (const [element, regex] of Object.entries(ELEMENT_PATTERNS)) {
    if (regex.test(text)) found.push(element);
  }
  // Wildcard: magic / energy users are broadly compatible
  if (/magic|sorcery|arcane|mystic/i.test(text)) found.push('_wildcard');
  if (found.includes('energy')) found.push('_wildcard');
  return found;
}

// ─── Main clamp function ─────────────────────────────────────────────────────

/**
 * Apply hard clamp rules to interpreted intent.
 * Pure function – no side-effects, no UI changes.
 */
export function applyHardClamp(
  intent: MoveIntent,
  character: CharacterProfile,
): ClampResult {
  const notes: string[] = [];

  // ── 1. Force cap ──────────────────────────────────────────────────────────
  const cap = FORCE_CAP_BY_TIER[character.tier] ?? 'HIGH_FORCE';
  let effectiveForce = intent.intentCategory;

  const forceRank: Record<IntentCategory, number> = {
    LOW_FORCE: 0,
    MODERATE_FORCE: 1,
    HIGH_FORCE: 2,
  };

  if (forceRank[effectiveForce] > forceRank[cap]) {
    effectiveForce = cap;
    notes.push(`Force clamped from ${intent.intentCategory} to ${cap} (tier ${character.tier} cap).`);
  }

  // Stat-based secondary cap: low power + low strength → can't sustain HIGH_FORCE
  const avgPhysical = ((character.stats.stat_power ?? 50) + (character.stats.stat_strength ?? 50)) / 2;
  if (effectiveForce === 'HIGH_FORCE' && avgPhysical < 25) {
    effectiveForce = 'MODERATE_FORCE';
    notes.push('Force reduced: insufficient power/strength stats for HIGH_FORCE.');
  }

  // ── 2. Absolute language neutralisation ────────────────────────────────────
  const absoluteLanguageNeutralised = intent.absoluteLanguageDetected;
  if (absoluteLanguageNeutralised) {
    if (effectiveForce === 'HIGH_FORCE') {
      effectiveForce = 'MODERATE_FORCE';
    }
    notes.push('Absolute language detected and neutralised.');
  }

  // ── 3. Stamina drain escalation for repeated high-force ────────────────────
  let staminaDrainMultiplier = 1.0;
  if (intent.intentCategory === 'HIGH_FORCE' || intent.posture === 'RECKLESS') {
    const escalation = character.consecutiveHighForceTurns * HIGH_FORCE_STAMINA_ESCALATION;
    staminaDrainMultiplier = 1.0 + escalation;
    if (escalation > 0) {
      notes.push(`Stamina drain ×${staminaDrainMultiplier.toFixed(2)} (${character.consecutiveHighForceTurns} consecutive high-force turns).`);
    }
  }

  // ── 4. Posture enforcement ─────────────────────────────────────────────────
  let effectivePosture = intent.posture;

  // Low stamina stat forces SAFE posture
  const staminaStat = character.stats.stat_stamina ?? 50;
  if (effectivePosture === 'RECKLESS' && staminaStat < 20) {
    effectivePosture = 'AGGRESSIVE';
    notes.push('Reckless posture downgraded: stamina too low.');
  }

  // ── 5. AoE capability check ────────────────────────────────────────────────
  let aoeClamped = false;
  if (intent.targeting === 'AREA') {
    const powerStat = character.stats.stat_power ?? 50;
    if (powerStat < AOE_POWER_THRESHOLD && character.tier <= 2) {
      aoeClamped = true;
      notes.push('AoE clamped to single-target: insufficient power stat for tier.');
    }
  }

  // ── 6. Element compatibility check ─────────────────────────────────────────
  const characterElements = extractCharacterElements(character.powers, character.abilities);
  const hasWildcard = characterElements.includes('_wildcard');
  const mismatchedElements: string[] = [];

  if (!hasWildcard && characterElements.length > 0) {
    for (const elem of intent.detectedElements) {
      if (!characterElements.includes(elem) && elem !== 'energy') {
        mismatchedElements.push(elem);
      }
    }
  }

  const elementMismatch = mismatchedElements.length > 0;
  if (elementMismatch) {
    notes.push(`Element mismatch: [${mismatchedElements.join(', ')}] not in character profile.`);
  }

  // ── 7. Control intent suppression ──────────────────────────────────────────
  // Control-type moves (forcing opponent actions) are never mechanically valid.
  // They're allowed in prose but won't affect resolution.
  const controlSuppressed = intent.controlIntent;
  if (controlSuppressed) {
    notes.push('Control intent suppressed: opponent action control has no mechanical effect.');
  }

  return {
    effectiveForce,
    effectivePosture,
    staminaDrainMultiplier,
    aoeClamped,
    elementMismatch,
    mismatchedElements,
    controlSuppressed,
    absoluteLanguageNeutralised,
    internalNotes: notes,
  };
}

/**
 * Generate internal prompt context from clamp results.
 * This text is injected into the narrator's system prompt ONLY –
 * it is never shown to players.
 */
export function generateClampContext(clamp: ClampResult): string {
  if (clamp.internalNotes.length === 0) return '';

  const lines = ['\n[INTERNAL FAIRNESS CONTEXT — not visible to players]:'];

  if (clamp.absoluteLanguageNeutralised) {
    lines.push('• The attacker used absolute language (e.g. "unavoidable", "instant kill"). This has NO mechanical effect. Resolve normally via dice.');
  }

  if (clamp.controlSuppressed) {
    lines.push('• The attacker attempted to dictate the opponent\'s actions. This has no effect — the opponent acts freely.');
  }

  if (clamp.elementMismatch) {
    lines.push(`• Element mismatch detected: [${clamp.mismatchedElements.join(', ')}]. The character may not have these abilities — describe the action but note any inconsistency subtly in the outcome.`);
  }

  if (clamp.aoeClamped) {
    lines.push('• AoE was attempted but character lacks the power for wide-area attacks at this tier. Treat as single-target.');
  }

  if (clamp.staminaDrainMultiplier > 1.0) {
    lines.push(`• Repeated high-force aggression: stamina drain ×${clamp.staminaDrainMultiplier.toFixed(2)}. The character should show increasing fatigue.`);
  }

  return lines.join('\n');
}
