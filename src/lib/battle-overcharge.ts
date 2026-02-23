/**
 * Variable Risk-Reward System: Overcharge Mechanic
 * 
 * Players can optionally overcharge abilities:
 * - Increased potency
 * - Increased risk probability
 * - Increased dimensional instability
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
  dimensionalInstability: boolean;
}

const NORMAL_RISK_CHANCE = 0.10;
const OVERCHARGE_RISK_CHANCE = 0.30;

const RISK_EFFECTS = [
  'Power surge backfires — energy explodes outward uncontrollably',
  'Dimensional rift opens briefly — gravity inverts for a split second',
  'Attack warps mid-flight — trajectory becomes unpredictable',
  'Overloaded energy destabilizes — causes environmental tremor',
  'Power misfires — releases a shockwave that hits both fighters',
  'Reality flickers — the attack phases in and out of existence',
  'Energy feedback — the caster takes minor recoil damage',
  'Temporal stutter — the attack freezes mid-motion then accelerates',
  'Elemental corruption — the attack changes element randomly',
  'Spatial distortion — distance warps, attack may land closer or farther',
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
  
  return {
    isOvercharged,
    potencyMultiplier: isOvercharged ? 1.5 + Math.random() * 0.5 : 1.0, // 1.5-2.0x
    riskChance: adjustedChance,
    riskOccurred,
    riskEffect: riskOccurred 
      ? RISK_EFFECTS[Math.floor(Math.random() * RISK_EFFECTS.length)]
      : null,
    dimensionalInstability: isOvercharged && riskOccurred && Math.random() < 0.4,
  };
}

/**
 * Generate AI context for overcharge state
 */
export function getOverchargeContext(result: OverchargeResult, attackerName: string): string {
  if (!result.isOvercharged && !result.riskOccurred) return '';

  const lines: string[] = [];

  if (result.isOvercharged) {
    lines.push(`\n[OVERCHARGE ACTIVE: ${attackerName} is pushing beyond safe limits! Potency x${result.potencyMultiplier.toFixed(1)}. Describe the attack as amplified, volatile, visually intense.]`);
  }

  if (result.riskOccurred && result.riskEffect) {
    lines.push(`[RISK EVENT: ${result.riskEffect}. Incorporate this unpredictable effect into the narrative!]`);
  }

  if (result.dimensionalInstability) {
    lines.push(`[DIMENSIONAL INSTABILITY: Reality warps around the overcharged attack. Describe spatial distortion, flickering terrain, or brief reality tears.]`);
  }

  return lines.join('\n');
}
