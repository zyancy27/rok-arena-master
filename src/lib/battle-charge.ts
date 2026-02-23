/**
 * ⚡ R.O.K. Charge Attack System
 *
 * A high-risk/high-reward mechanic where players lock into a multi-turn
 * charge, restricting actions to defense-only with reduced dodge,
 * then releasing a massively scaled attack.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChargeState {
  isCharging: boolean;
  chargeTurnsRemaining: number;
  totalChargeTurns: number;
  concentrationDifficulty: number; // 0–1 scale
  interrupted: boolean;
  accumulatedRisk: number; // risk chance stacking each turn
  cooldownTurnsRemaining: number; // 1 turn cooldown after release
}

export interface ChargeResult {
  finalMultiplier: number;
  momentumBonus: number;
  riskDuringCharge: boolean;
  description: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_CHARGE_TURNS = 2;
const MAX_CHARGE_TURNS = 5;
const MAX_MULTIPLIER_CAP = 3.5;
const CHARGE_RISK_PER_TURN = 0.05;
const CHARGE_MOMENTUM_BONUS = 25;
const EDGE_STATE_INTERRUPT_REDUCTION = 0.20;

const CHARGE_KEYWORDS = [
  'charging',
  'gathering energy',
  'focusing power',
  'channeling',
  'preparing final attack',
  'concentrating energy',
  'charge attack',
  'powering up',
  'building energy',
];

const DEFENSIVE_KEYWORDS = [
  'guard', 'brace', 'shield', 'block', 'defend', 'counter stance',
  'protect', 'hunker', 'cover', 'deflect', 'parry',
];

const FORBIDDEN_KEYWORDS = [
  'attack', 'strike', 'punch', 'kick', 'slash', 'blast',
  'fire', 'shoot', 'launch', 'throw', 'charge forward',
  'rush', 'lunge', 'overcharge',
];

// ─── State Management ────────────────────────────────────────────────────────

export function createChargeState(): ChargeState {
  return {
    isCharging: false,
    chargeTurnsRemaining: 0,
    totalChargeTurns: 0,
    concentrationDifficulty: 0,
    interrupted: false,
    accumulatedRisk: 0,
    cooldownTurnsRemaining: 0,
  };
}

/**
 * Detect if the player's message initiates a charge
 */
export function detectChargeInitiation(message: string): { isCharging: boolean; requestedTurns: number } {
  const lower = message.toLowerCase();
  const isCharging = CHARGE_KEYWORDS.some(kw => lower.includes(kw));

  if (!isCharging) return { isCharging: false, requestedTurns: 0 };

  // Try to extract turn count from message (e.g., "3 turn charge", "charge for 4 turns")
  const turnMatch = lower.match(/(\d)\s*(?:turn|round)/);
  const requestedTurns = turnMatch
    ? Math.max(MIN_CHARGE_TURNS, Math.min(MAX_CHARGE_TURNS, parseInt(turnMatch[1])))
    : 3; // default

  return { isCharging: true, requestedTurns };
}

/**
 * Initiate a charge state
 */
export function initiateCharge(
  currentState: ChargeState,
  turns: number,
  playerLevel: number,
): ChargeState {
  if (currentState.isCharging || currentState.cooldownTurnsRemaining > 0) {
    return currentState; // Can't chain charges or charge during cooldown
  }

  const clampedTurns = Math.max(MIN_CHARGE_TURNS, Math.min(MAX_CHARGE_TURNS, turns));
  // Higher level = better focus (lower difficulty)
  const difficulty = Math.max(0.3, 0.8 - (playerLevel * 0.05));

  return {
    isCharging: true,
    chargeTurnsRemaining: clampedTurns,
    totalChargeTurns: clampedTurns,
    concentrationDifficulty: difficulty,
    interrupted: false,
    accumulatedRisk: 0,
    cooldownTurnsRemaining: 0,
  };
}

/**
 * Validate a player's action while charging.
 * Returns whether the action is allowed.
 */
export function validateChargeAction(message: string): { allowed: boolean; reason: string } {
  const lower = message.toLowerCase();

  // Check for forbidden (offensive) actions
  const hasForbidden = FORBIDDEN_KEYWORDS.some(kw => lower.includes(kw));
  if (hasForbidden) {
    return {
      allowed: false,
      reason: 'You cannot attack while charging! You may only guard, brace, shield, or counter stance.',
    };
  }

  // Check if the action is defensive
  const isDefensive = DEFENSIVE_KEYWORDS.some(kw => lower.includes(kw));
  if (!isDefensive) {
    // Allow generic messages, but warn
    return {
      allowed: true,
      reason: 'While charging, defensive actions are recommended.',
    };
  }

  return { allowed: true, reason: '' };
}

/**
 * Calculate dodge penalty while charging
 */
export function getChargeDodgePenalty(state: ChargeState): number {
  if (!state.isCharging) return 0;
  // dodgePenalty = totalChargeTurns * concentrationDifficulty * 0.2
  return Math.min(0.95, state.totalChargeTurns * state.concentrationDifficulty * 0.2);
}

/**
 * Apply effective dodge reduction.
 * Returns the multiplier for defense rolls (1.0 = no penalty).
 */
export function getChargeDefenseMultiplier(state: ChargeState): number {
  if (!state.isCharging) return 1.0;
  return Math.max(0.05, 1 - getChargeDodgePenalty(state));
}

/**
 * Check if a hit interrupts the charge
 */
export function checkChargeInterruption(
  state: ChargeState,
  incomingGap: number, // How much the attack exceeded defense
  resolveLevel: number, // 0-100
  fearLevel: number, // 0-100
  momentum: number, // 0-100
  edgeStateActive: boolean,
): { interrupted: boolean; chance: number } {
  if (!state.isCharging) return { interrupted: false, chance: 0 };

  // Base interruption chance from damage
  let interruptionChance = Math.abs(incomingGap) * state.concentrationDifficulty * 0.05;

  // Modifiers
  const resolveReduction = (resolveLevel - 50) / 200; // -0.25 to +0.25
  const fearIncrease = (fearLevel - 50) / 150; // ~-0.33 to +0.33
  const momentumReduction = momentum * 0.002; // 0 to 0.2

  interruptionChance += fearIncrease - resolveReduction - momentumReduction;

  if (edgeStateActive) {
    interruptionChance *= (1 - EDGE_STATE_INTERRUPT_REDUCTION);
  }

  interruptionChance = Math.max(0.05, Math.min(0.9, interruptionChance));

  const interrupted = Math.random() < interruptionChance;

  return { interrupted, chance: interruptionChance };
}

/**
 * Interrupt the charge - returns updated state
 */
export function interruptCharge(state: ChargeState): ChargeState {
  return {
    ...state,
    isCharging: false,
    interrupted: true,
    chargeTurnsRemaining: 0,
    cooldownTurnsRemaining: 1,
  };
}

/**
 * Tick a charge turn and accumulate risk
 */
export function tickChargeTurn(state: ChargeState, skillMastery: number): ChargeState {
  if (!state.isCharging) return state;

  const remaining = state.chargeTurnsRemaining - 1;
  // High mastery reduces risk growth rate
  const masteryReduction = Math.max(0.3, 1 - (skillMastery / 200)); // 0.5 to 1.0
  const riskGrowth = CHARGE_RISK_PER_TURN * state.concentrationDifficulty * masteryReduction;

  if (remaining <= 0) {
    // Charge complete!
    return {
      ...state,
      chargeTurnsRemaining: 0,
      accumulatedRisk: state.accumulatedRisk + riskGrowth,
    };
  }

  return {
    ...state,
    chargeTurnsRemaining: remaining,
    accumulatedRisk: state.accumulatedRisk + riskGrowth,
  };
}

/**
 * Check if accumulated risk triggers during charge
 */
export function checkChargeRisk(state: ChargeState): boolean {
  if (!state.isCharging) return false;
  return Math.random() < state.accumulatedRisk;
}

/**
 * Resolve the final charged attack
 */
export function resolveChargeAttack(
  state: ChargeState,
  playerLevel: number,
  skillMastery: number, // 0-100
  currentMomentum: number, // 0-100
  resolveLevel: number, // 0-100
  fearLevel: number, // 0-100
): ChargeResult {
  // Base charge multiplier
  const chargeMultiplier = 1 + (state.totalChargeTurns * 0.4);

  // Scaling bonuses
  const masteryBonus = (skillMastery / 100) * 0.3;
  const levelScaling = playerLevel * 0.02;
  const momentumBonus = currentMomentum * 0.01;
  const psychStabilityBonus = ((resolveLevel - fearLevel) / 100) * 0.3;

  let finalMultiplier = chargeMultiplier + masteryBonus + levelScaling + momentumBonus + psychStabilityBonus;

  // Cap
  finalMultiplier = Math.min(MAX_MULTIPLIER_CAP, Math.max(1.0, finalMultiplier));

  // Risk check during release
  const riskDuringCharge = Math.random() < state.accumulatedRisk;

  if (riskDuringCharge) {
    finalMultiplier *= 0.5; // Halve if risk triggers on release
  }

  const description = riskDuringCharge
    ? `Energy destabilized during release! Multiplier reduced to x${finalMultiplier.toFixed(1)}`
    : `Charge released at x${finalMultiplier.toFixed(1)} power!`;

  return {
    finalMultiplier,
    momentumBonus: CHARGE_MOMENTUM_BONUS,
    riskDuringCharge,
    description,
  };
}

/**
 * Complete the charge and return to normal state with cooldown
 */
export function completeCharge(state: ChargeState): ChargeState {
  return {
    ...createChargeState(),
    cooldownTurnsRemaining: 1,
  };
}

/**
 * Tick cooldown (called each turn when not charging)
 */
export function tickChargeCooldown(state: ChargeState): ChargeState {
  if (state.cooldownTurnsRemaining <= 0) return state;
  return {
    ...state,
    cooldownTurnsRemaining: state.cooldownTurnsRemaining - 1,
  };
}

/**
 * Get charge progress ratio (0-1, where 1 = fully charged)
 */
export function getChargeProgress(state: ChargeState): number {
  if (!state.isCharging || state.totalChargeTurns === 0) return 0;
  return (state.totalChargeTurns - state.chargeTurnsRemaining) / state.totalChargeTurns;
}

/**
 * Get the color stage based on progress
 */
export function getChargeColorStage(progress: number): 'yellow' | 'orange' | 'red' | 'white' {
  if (progress >= 0.9) return 'white';
  if (progress >= 0.65) return 'red';
  if (progress >= 0.35) return 'orange';
  return 'yellow';
}

/**
 * Generate AI context for the charge state
 */
export function getChargeContext(
  chargerName: string,
  state: ChargeState,
  opponentName: string,
): string {
  if (!state.isCharging && state.cooldownTurnsRemaining <= 0) return '';

  const lines: string[] = [];

  if (state.isCharging) {
    const progress = getChargeProgress(state);
    const colorStage = getChargeColorStage(progress);
    const turnsElapsed = state.totalChargeTurns - state.chargeTurnsRemaining;

    lines.push(`\n[CHARGE STATE: ${chargerName} is CHARGING! Turn ${turnsElapsed + 1}/${state.totalChargeTurns}.]`);
    lines.push(`[${chargerName} is locked in concentration. Energy aura intensity: ${colorStage.toUpperCase()}. They can only defend — dodging is severely limited (${Math.round(getChargeDodgePenalty(state) * 100)}% reduction).]`);
    lines.push(`[${opponentName} has a window of opportunity to attack the vulnerable ${chargerName}. Describe the growing energy around them.]`);

    if (state.chargeTurnsRemaining <= 1) {
      lines.push(`[FINAL TURN: ${chargerName}'s charge is about to release! Describe building to a climax — energy crackling, ground trembling, air vibrating.]`);
    }
  }

  if (state.cooldownTurnsRemaining > 0) {
    lines.push(`[${chargerName} is recovering from a charged attack. They are briefly vulnerable.]`);
  }

  return lines.join('\n');
}
