/**
 * Variable Risk-Reward System: Overcharge Mechanic
 * 
 * Players can optionally overcharge abilities:
 * - Increased potency
 * - Increased risk probability
 * - Grounded consequences (fatigue, backfires, misfires)
 * 
 * Normal attack → 10% risk chance
 * Overcharged → 30% risk chance + amplified effect
 */

export interface OverchargeResult {
  isOvercharged: boolean;
  potencyMultiplier: number; // 1.0 normal, 1.5-2.0 overcharged
  riskChance: number; // 0-1
  riskOccurred: boolean;
  riskEffect: string | null;
  riskCategory: 'fatigue' | 'backfire' | 'misfire' | 'recoil' | 'exposure' | null;
}

const NORMAL_RISK_CHANCE = 0.10;
const OVERCHARGE_RISK_CHANCE = 0.30;

const RISK_EFFECTS: Array<{ text: string; category: OverchargeResult['riskCategory'] }> = [
  // Fatigue — pushing too hard drains the body
  { text: 'Severe muscle fatigue — the character staggers, movement slowed for the next moment', category: 'fatigue' },
  { text: 'Stamina burnout — breathing becomes labored, reaction time drops noticeably', category: 'fatigue' },
  { text: 'Energy drain — the effort leaves the character momentarily dizzy and off-balance', category: 'fatigue' },
  // Backfire — the attack turns on its user
  { text: 'Power backfire — the attack\'s energy rebounds, striking the attacker with partial force', category: 'backfire' },
  { text: 'Technique collapses mid-execution — the built-up force discharges inward, causing self-damage', category: 'backfire' },
  { text: 'Overloaded strike — the excess power shatters the attacker\'s footing, leaving them wide open', category: 'backfire' },
  // Misfire — hits the wrong thing
  { text: 'Attack veers off-target — the overcharged force is hard to control and clips nearby terrain instead', category: 'misfire' },
  { text: 'Wild trajectory — the move connects with something unintended near the target', category: 'misfire' },
  { text: 'Aim destabilized — the raw power throws off precision, the attack grazes rather than lands clean', category: 'misfire' },
  // Recoil — physical kickback
  { text: 'Bone-jarring recoil — the force of the attack sends painful shockwaves back through the attacker\'s body', category: 'recoil' },
  { text: 'Joint strain — the overcharged motion hyper-extends a limb, causing sharp pain', category: 'recoil' },
  // Exposure — leaves the user vulnerable
  { text: 'Recovery lag — the overcharged move takes too long to reset, leaving the attacker defenseless for a beat', category: 'exposure' },
  { text: 'Guard drops — all energy was poured into the attack, leaving zero defensive posture', category: 'exposure' },
  { text: 'Tunnel vision — the intense focus on overcharging blinds the attacker to incoming threats', category: 'exposure' },
];

/**
 * Roll for overcharge effects
 * @param isOvercharged Whether the player toggled overcharge
 * @param psychRiskModifier Multiplier from psychological state (1.0 normal)
 * @param edgeStateActive Whether Edge State reduces risk chance
 */
export function resolveOvercharge(
  isOvercharged: boolean,
  psychRiskModifier: number = 1.0,
  edgeStateActive: boolean = false,
): OverchargeResult {
  const baseRiskChance = isOvercharged ? OVERCHARGE_RISK_CHANCE : NORMAL_RISK_CHANCE;
  
  // Apply psychological modifier
  let adjustedChance = baseRiskChance * psychRiskModifier;
  
  // Edge State reduces risk chance
  if (edgeStateActive) {
    adjustedChance *= 0.5; // 50% reduction
  }
  
  // Clamp
  adjustedChance = Math.max(0.02, Math.min(0.6, adjustedChance));
  
  const riskOccurred = Math.random() < adjustedChance;
  const riskEntry = riskOccurred
    ? RISK_EFFECTS[Math.floor(Math.random() * RISK_EFFECTS.length)]
    : null;
  
  return {
    isOvercharged,
    potencyMultiplier: isOvercharged ? 1.5 + Math.random() * 0.5 : 1.0, // 1.5-2.0x
    riskChance: adjustedChance,
    riskOccurred,
    riskEffect: riskEntry?.text ?? null,
    riskCategory: riskEntry?.category ?? null,
  };
}

/**
 * Generate AI context for overcharge state
 */
export function getOverchargeContext(result: OverchargeResult, attackerName: string): string {
  if (!result.isOvercharged && !result.riskOccurred) return '';

  const lines: string[] = [];

  if (result.isOvercharged) {
    lines.push(`\n[OVERCHARGE ACTIVE: ${attackerName} is pushing beyond safe limits! Potency x${result.potencyMultiplier.toFixed(1)}. Describe the attack as amplified, intense, and visibly straining the character.]`);
  }

  if (result.riskOccurred && result.riskEffect) {
    lines.push(`[RISK EVENT (${result.riskCategory}): ${result.riskEffect}. Incorporate this consequence into the narrative — show the physical toll or tactical disadvantage it creates!]`);
  }

  return lines.join('\n');
}
