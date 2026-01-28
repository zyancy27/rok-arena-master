// Defense validation system - detects when players ignore attacks without addressing them

/**
 * Keywords that indicate defensive acknowledgment
 */
const DEFENSE_KEYWORDS = [
  // Direct defensive actions
  'dodge', 'dodged', 'dodges', 'dodging',
  'block', 'blocked', 'blocks', 'blocking',
  'parry', 'parried', 'parries', 'parrying',
  'deflect', 'deflected', 'deflects', 'deflecting',
  'evade', 'evaded', 'evades', 'evading',
  'avoid', 'avoided', 'avoids', 'avoiding',
  'sidestep', 'sidestepped', 'sidesteps', 'sidestepping',
  'duck', 'ducked', 'ducks', 'ducking',
  'roll', 'rolled', 'rolls', 'rolling',
  'leap', 'leaped', 'leaps', 'leaping',
  'jump', 'jumped', 'jumps', 'jumping',
  
  // Damage acknowledgment
  'hit', 'hits', 'struck', 'strikes',
  'take', 'takes', 'took', 'taking',
  'feel', 'feels', 'felt',
  'impact', 'impacted', 'impacts',
  'hurt', 'hurts', 'hurting',
  'pain', 'painful',
  'wound', 'wounded', 'wounds',
  'damage', 'damaged', 'damages',
  'stagger', 'staggers', 'staggered',
  'stumble', 'stumbled', 'stumbles',
  'reel', 'reeled', 'reels',
  'wince', 'winced', 'winces',
  'grunt', 'grunted', 'grunts',
  'absorb', 'absorbed', 'absorbs',
  
  // Shield/barrier actions
  'shield', 'shields', 'shielded', 'shielding',
  'barrier', 'barriers',
  'protect', 'protected', 'protects', 'protecting',
  'guard', 'guards', 'guarded', 'guarding',
  'ward', 'warded', 'wards', 'warding',
  'brace', 'braced', 'braces', 'bracing',
  
  // Movement acknowledgment
  'retreat', 'retreated', 'retreats', 'retreating',
  'back', 'backed', 'backing',
  'move', 'moved', 'moves', 'moving',
  'dash', 'dashed', 'dashes', 'dashing',
  'teleport', 'teleported', 'teleports', 'teleporting',
  'phase', 'phased', 'phases', 'phasing',
  'vanish', 'vanished', 'vanishes',
  'disappear', 'disappeared', 'disappears',
  
  // Counter acknowledgment
  'counter', 'countered', 'counters', 'countering',
  'intercept', 'intercepted', 'intercepts',
  'catch', 'caught', 'catches',
  'grab', 'grabbed', 'grabs',
  'stop', 'stopped', 'stops',
  'halt', 'halted', 'halts',
  
  // Resistance/immunity
  'withstand', 'withstands', 'withstood',
  'endure', 'endured', 'endures',
  'resist', 'resisted', 'resists',
  'immune', 'immunity',
  'unfazed', 'unphased',
  'unaffected',
  'shrug', 'shrugged', 'shrugs',
  'ignore', 'ignores', 'ignored', // if explicitly describing tanking
  
  // Tier-specific acknowledgments
  'tank', 'tanked', 'tanks', 'tanking',
  'weather', 'weathered', 'weathers',
  'power through', 'powered through',
  'push through', 'pushed through',
];

/**
 * Keywords that indicate the opponent made an attack that should be addressed
 */
const ATTACK_KEYWORDS = [
  'attack', 'attacked', 'attacks', 'attacking',
  'strike', 'struck', 'strikes', 'striking',
  'punch', 'punched', 'punches', 'punching',
  'kick', 'kicked', 'kicks', 'kicking',
  'slash', 'slashed', 'slashes', 'slashing',
  'stab', 'stabbed', 'stabs', 'stabbing',
  'blast', 'blasted', 'blasts', 'blasting',
  'fire', 'fired', 'fires', 'firing',
  'shoot', 'shot', 'shoots', 'shooting',
  'throw', 'threw', 'throws', 'throwing',
  'hurl', 'hurled', 'hurls', 'hurling',
  'launch', 'launched', 'launches', 'launching',
  'swing', 'swung', 'swings', 'swinging',
  'slam', 'slammed', 'slams', 'slamming',
  'smash', 'smashed', 'smashes', 'smashing',
  'crush', 'crushed', 'crushes', 'crushing',
  'beam', 'beamed', 'beams',
  'energy', 'energies',
  'projectile', 'projectiles',
  'bullet', 'bullets',
  'arrow', 'arrows',
  'bolt', 'bolts',
  'wave', 'waved', 'waves',
  'pulse', 'pulsed', 'pulses',
  'burst', 'bursted', 'bursts',
  'explosion', 'exploded', 'explodes',
  'barrage', 'barrages',
  'onslaught',
  'assault', 'assaulted', 'assaults',
  'charge', 'charged', 'charges', 'charging',
  'rush', 'rushed', 'rushes', 'rushing',
  'lunge', 'lunged', 'lunges', 'lunging',
];

export interface DefenseValidationResult {
  hasDefensiveAction: boolean;
  hasAttackToAddress: boolean;
  shouldEnforceHit: boolean;
  missingDefenseType: 'none' | 'dodge' | 'block' | 'acknowledge' | 'any';
  confidence: number; // 0-1 how confident we are in this assessment
}

/**
 * Check if an action contains defensive acknowledgment
 */
function containsDefenseKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DEFENSE_KEYWORDS.some(keyword => {
    // Use word boundary matching
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Check if an action contains attack keywords (for the opponent's previous move)
 */
function containsAttackKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ATTACK_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Validate if a player's response adequately addresses an opponent's attack
 */
export function validateDefense(
  playerAction: string,
  opponentPreviousAction: string,
  attackDidHit: boolean // From dice roll result
): DefenseValidationResult {
  const playerHasDefense = containsDefenseKeyword(playerAction);
  const opponentDidAttack = containsAttackKeyword(opponentPreviousAction);
  
  // If opponent didn't attack, no defense needed
  if (!opponentDidAttack) {
    return {
      hasDefensiveAction: playerHasDefense,
      hasAttackToAddress: false,
      shouldEnforceHit: false,
      missingDefenseType: 'none',
      confidence: 0.9,
    };
  }
  
  // If attack was supposed to hit (from dice) and player didn't acknowledge it
  if (attackDidHit && !playerHasDefense) {
    return {
      hasDefensiveAction: false,
      hasAttackToAddress: true,
      shouldEnforceHit: true,
      missingDefenseType: 'acknowledge',
      confidence: 0.85,
    };
  }
  
  // If attack missed (from dice) and player didn't mention any defensive action
  // This is less critical but still worth noting
  if (!attackDidHit && !playerHasDefense) {
    return {
      hasDefensiveAction: false,
      hasAttackToAddress: true,
      shouldEnforceHit: false,
      missingDefenseType: 'dodge',
      confidence: 0.6, // Lower confidence - maybe they just moved past it quickly
    };
  }
  
  // Player addressed the attack appropriately
  return {
    hasDefensiveAction: playerHasDefense,
    hasAttackToAddress: opponentDidAttack,
    shouldEnforceHit: false,
    missingDefenseType: 'none',
    confidence: 0.9,
  };
}

/**
 * Generate a prompt injection for the AI when player ignores an attack
 */
export function generateDefenseEnforcementPrompt(
  playerName: string,
  attackerName: string,
  attackDescription: string,
  hitDamageLevel: 'light' | 'moderate' | 'heavy'
): string {
  const damageDescriptions = {
    light: `The attack clips ${playerName}, causing them to flinch momentarily.`,
    moderate: `The attack connects solidly with ${playerName}, clearly affecting their stance.`,
    heavy: `The attack lands devastatingly on ${playerName}, visibly staggering them.`,
  };
  
  return `[DEFENSE ENFORCEMENT: ${playerName} did not address or acknowledge ${attackerName}'s previous attack in their action. The dice determined this attack HITS. 
  
IMPORTANT: Before responding to ${playerName}'s action, you MUST first describe how ${attackerName}'s attack connects with ${playerName}. ${damageDescriptions[hitDamageLevel]}

Then continue with your response to their action, but incorporate how the damage affects their intended move. Their action should not proceed as cleanly as they described - the hit has consequences.

This enforces the rule that players cannot simply ignore opponent actions.]`;
}

/**
 * Determine damage level based on attack-defense gap
 */
export function getDamageLevel(gap: number): 'light' | 'moderate' | 'heavy' {
  if (gap <= 3) return 'light';
  if (gap <= 7) return 'moderate';
  return 'heavy';
}

/**
 * Check if an action is purely defensive (no counter-attack)
 */
export function isPurelyDefensive(action: string): boolean {
  const hasDefense = containsDefenseKeyword(action);
  const hasAttack = containsAttackKeyword(action);
  return hasDefense && !hasAttack;
}

/**
 * Check if action acknowledges taking damage (for when attacks hit)
 */
export function acknowledgesDamage(action: string): boolean {
  const damageAcknowledgments = [
    'hit', 'struck', 'hurt', 'pain', 'damage', 'wounded', 'stagger',
    'feel', 'felt', 'impact', 'take', 'took', 'absorb', 'wince', 'grunt',
    'reel', 'stumble', 'blood', 'bleed', 'bruise', 'burn', 'sting',
  ];
  
  const lowerText = action.toLowerCase();
  return damageAcknowledgments.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerText);
  });
}
