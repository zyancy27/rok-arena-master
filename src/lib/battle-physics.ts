/**
 * Battle Physics System
 * 
 * Defines physics rules for combat based on power tier.
 * Tier 5+ characters can bend/manipulate physics.
 */

export interface PhysicsRules {
  respectsGravity: boolean;
  respectsMomentum: boolean;
  respectsThermodynamics: boolean;
  canManipulateSpace: boolean;
  canManipulateTime: boolean;
  canManipulateReality: boolean;
  description: string;
}

/**
 * Get physics rules based on character tier
 */
export function getPhysicsRulesForTier(tier: number): PhysicsRules {
  if (tier <= 2) {
    return {
      respectsGravity: true,
      respectsMomentum: true,
      respectsThermodynamics: true,
      canManipulateSpace: false,
      canManipulateTime: false,
      canManipulateReality: false,
      description: 'Bound by all physical laws. Combat follows realistic physics.',
    };
  }
  
  if (tier === 3) {
    return {
      respectsGravity: true,
      respectsMomentum: true,
      respectsThermodynamics: true,
      canManipulateSpace: false,
      canManipulateTime: false,
      canManipulateReality: false,
      description: 'Enhanced physical capabilities but still bound by natural laws. May have limited supernatural abilities.',
    };
  }
  
  if (tier === 4) {
    return {
      respectsGravity: true,
      respectsMomentum: false, // Can manipulate energy/mass
      respectsThermodynamics: false,
      canManipulateSpace: false,
      canManipulateTime: false,
      canManipulateReality: false,
      description: 'Can manipulate energy and mass at will. May ignore momentum conservation through power manipulation.',
    };
  }
  
  if (tier === 5) {
    return {
      respectsGravity: false,
      respectsMomentum: false,
      respectsThermodynamics: false,
      canManipulateSpace: true,
      canManipulateTime: true,
      canManipulateReality: true,
      description: 'Reality warper. Can ignore physical laws but still bound by quantum mechanics and paradox prevention.',
    };
  }
  
  if (tier === 6) {
    return {
      respectsGravity: false,
      respectsMomentum: false,
      respectsThermodynamics: false,
      canManipulateSpace: true,
      canManipulateTime: true,
      canManipulateReality: true,
      description: 'Logic Bending. Exists outside normal physics. Can reshape reality with thought or word.',
    };
  }
  
  // Tier 7
  return {
    respectsGravity: false,
    respectsMomentum: false,
    respectsThermodynamics: false,
    canManipulateSpace: true,
    canManipulateTime: true,
    canManipulateReality: true,
    description: 'Logic Resorts. Paradox incarnate. Physical laws are optional and can be inverted at will.',
  };
}

/**
 * Generate physics context for AI based on both fighters' tiers
 */
export function generatePhysicsContext(userTier: number, opponentTier: number): string {
  const userRules = getPhysicsRulesForTier(userTier);
  const opponentRules = getPhysicsRulesForTier(opponentTier);
  
  const lines: string[] = [];
  
  lines.push('\nPHYSICS RULES FOR THIS BATTLE:');
  
  // Determine battle physics based on highest tier
  const highestTier = Math.max(userTier, opponentTier);
  
  if (highestTier <= 4) {
    lines.push('• Combat follows physics-based rules. Gravity, momentum, and energy conservation apply.');
    lines.push('• Describe the physical impact of actions: how gravity affects jumps, how momentum affects throws.');
    lines.push('• Environmental physics matter: use them creatively in combat descriptions.');
  } else if (highestTier === 5) {
    lines.push('• High-tier reality manipulation is in play. Physical laws can be bent but not broken entirely.');
    lines.push('• Quantum effects may occur: superposition, entanglement, probability manipulation.');
    lines.push('• Lower-tier fighters still experience normal physics unless protected or enhanced.');
  } else {
    lines.push('• Logic-bending powers are active. Reality itself is malleable.');
    lines.push('• Physical laws are suggestions, not rules. Paradoxes may occur.');
    lines.push('• Describe reality warping, logic inversions, and conceptual attacks.');
  }
  
  // Note asymmetric physics if tiers differ significantly
  if (Math.abs(userTier - opponentTier) >= 2) {
    const strongerName = userTier > opponentTier ? 'The user' : 'The opponent';
    const weakerName = userTier > opponentTier ? 'The opponent' : 'The user';
    lines.push(`• ASYMMETRIC PHYSICS: ${strongerName} can manipulate physics that ${weakerName} must obey.`);
  }
  
  return lines.join('\n');
}

/**
 * Skill Proficiency System
 * 
 * Low skill causes unpredictable outcomes in battle.
 */
export interface SkillProficiencyEffect {
  proficiencyLevel: 'novice' | 'developing' | 'competent' | 'proficient' | 'expert' | 'master';
  failureChance: number; // 0-1
  criticalChance: number; // 0-1
  description: string;
}

export function getSkillProficiency(skillStat: number): SkillProficiencyEffect {
  if (skillStat <= 15) {
    return {
      proficiencyLevel: 'novice',
      failureChance: 0.4,
      criticalChance: 0.02,
      description: 'Barely trained. Attacks frequently miss or backfire. Powers may activate unexpectedly.',
    };
  }
  
  if (skillStat <= 30) {
    return {
      proficiencyLevel: 'developing',
      failureChance: 0.25,
      criticalChance: 0.05,
      description: 'Still learning. Inconsistent execution. May lose control of abilities.',
    };
  }
  
  if (skillStat <= 50) {
    return {
      proficiencyLevel: 'competent',
      failureChance: 0.1,
      criticalChance: 0.1,
      description: 'Reliable in normal conditions. May falter under pressure or with complex techniques.',
    };
  }
  
  if (skillStat <= 70) {
    return {
      proficiencyLevel: 'proficient',
      failureChance: 0.05,
      criticalChance: 0.15,
      description: 'Well-trained fighter. Consistent performance with occasional brilliance.',
    };
  }
  
  if (skillStat <= 90) {
    return {
      proficiencyLevel: 'expert',
      failureChance: 0.02,
      criticalChance: 0.25,
      description: 'Masterful technique. Rarely makes mistakes. Frequent displays of exceptional skill.',
    };
  }
  
  return {
    proficiencyLevel: 'master',
    failureChance: 0,
    criticalChance: 0.35,
    description: 'Perfect technique. Every move is precise. Frequently achieves the impossible.',
  };
}

/**
 * Generate skill proficiency context for AI
 */
export function generateSkillContext(userSkill: number, opponentSkill: number): string {
  const userProf = getSkillProficiency(userSkill);
  const opponentProf = getSkillProficiency(opponentSkill);
  
  const lines: string[] = [];
  
  lines.push('\nSKILL PROFICIENCY EFFECTS:');
  lines.push(`• User (${userProf.proficiencyLevel}): ${userProf.description}`);
  lines.push(`• Opponent (${opponentProf.proficiencyLevel}): ${opponentProf.description}`);
  
  // Add specific guidance for low skill scenarios
  if (userSkill <= 30) {
    lines.push('• USER LOW SKILL: Occasionally describe their attacks misfiring, powers surging unexpectedly, or techniques failing partway through execution.');
  }
  
  if (opponentSkill <= 30) {
    lines.push('• OPPONENT LOW SKILL: When responding, occasionally describe your own moves faltering or powers behaving erratically.');
  }
  
  // High skill creates opportunities
  if (userSkill >= 80 || opponentSkill >= 80) {
    lines.push('• HIGH SKILL PRESENT: Expert fighters may exploit mistakes, chain complex combos, or perform techniques that seem impossible.');
  }
  
  return lines.join('\n');
}

/**
 * Determine if a skill mishap should occur (for UI feedback)
 */
export function shouldTriggerSkillMishap(skillStat: number): boolean {
  const prof = getSkillProficiency(skillStat);
  return Math.random() < prof.failureChance;
}

/**
 * Determine if a critical success should occur
 */
export function shouldTriggerCritical(skillStat: number): boolean {
  const prof = getSkillProficiency(skillStat);
  return Math.random() < prof.criticalChance;
}

/**
 * Get proficiency bar color based on skill level
 */
export function getSkillBarColor(skillStat: number): string {
  if (skillStat <= 15) return 'hsl(0 70% 55%)'; // Red
  if (skillStat <= 30) return 'hsl(30 70% 55%)'; // Orange
  if (skillStat <= 50) return 'hsl(45 70% 55%)'; // Yellow
  if (skillStat <= 70) return 'hsl(90 70% 55%)'; // Light green
  if (skillStat <= 90) return 'hsl(180 70% 55%)'; // Cyan
  return 'hsl(270 70% 60%)'; // Purple (master)
}
