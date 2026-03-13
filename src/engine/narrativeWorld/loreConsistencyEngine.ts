/**
 * Lore Consistency Engine
 *
 * Validates narrator outputs against established lore, character
 * timelines, world rules, and technology levels. Flags contradictions
 * and suggests corrections before narration reaches the user.
 */

// ── Types ───────────────────────────────────────────────────────

export type LoreCategory =
  | 'character_lore'
  | 'character_timeline'
  | 'world_lore'
  | 'faction_history'
  | 'technology_level'
  | 'power_rules'
  | 'environment_rules'
  | 'npc_consistency'
  | 'geography';

export interface LoreFact {
  id: string;
  category: LoreCategory;
  fact: string;
  /** Keywords for matching */
  keywords: string[];
  /** Priority: higher = stricter enforcement */
  priority: number;
  source: string;
}

export interface LoreViolation {
  fact: LoreFact;
  violatingText: string;
  severity: 'warning' | 'error';
  suggestion: string;
}

export interface LoreValidationResult {
  isValid: boolean;
  violations: LoreViolation[];
  adjustedText: string | null;
}

export interface LoreDatabase {
  facts: LoreFact[];
  technologyLevel: TechnologyLevel;
  worldRules: string[];
}

export type TechnologyLevel =
  | 'primitive'
  | 'medieval'
  | 'renaissance'
  | 'industrial'
  | 'modern'
  | 'futuristic'
  | 'mixed';

// ── Constants ───────────────────────────────────────────────────

const TECH_LEVEL_FORBIDDEN: Record<TechnologyLevel, RegExp[]> = {
  primitive: [
    /\b(gun|rifle|pistol|cannon|engine|machine|electricity|computer|phone|car|train|aircraft|robot|laser|plasma)\b/i,
  ],
  medieval: [
    /\b(gun|rifle|pistol|engine|electricity|computer|phone|car|train|aircraft|robot|laser|plasma|internet|radio)\b/i,
  ],
  renaissance: [
    /\b(electricity|computer|phone|car|train|aircraft|robot|laser|plasma|internet|radio|nuclear)\b/i,
  ],
  industrial: [
    /\b(computer|phone|aircraft|robot|laser|plasma|internet|nuclear|satellite|drone)\b/i,
  ],
  modern: [
    /\b(laser|plasma|teleport|warp|hyperspace)\b/i,
  ],
  futuristic: [],
  mixed: [],
};

const PERSONALITY_CONTRADICTION_MAP: Record<string, { pattern: RegExp; suggestion: string }[]> = {
  cautious: [
    { pattern: /\brecklessly\b/i, suggestion: 'Frame reckless behavior as unusual and out of character.' },
    { pattern: /\bcharges? (forward|ahead|in)\b/i, suggestion: 'Note hesitation before the charge — this character typically weighs options.' },
  ],
  peaceful: [
    { pattern: /\b(brutally|savagely|mercilessly)\s+(attack|strike|kill)/i, suggestion: 'Frame violent actions as reluctant or provoked.' },
  ],
  cowardly: [
    { pattern: /\b(bravely|heroically|fearlessly)\b/i, suggestion: 'Show internal conflict — courage despite fear.' },
  ],
};

let _factId = 0;

// ── Factory ─────────────────────────────────────────────────────

export function createLoreDatabase(techLevel: TechnologyLevel = 'medieval'): LoreDatabase {
  return {
    facts: [],
    technologyLevel: techLevel,
    worldRules: [],
  };
}

// ── Fact Management ─────────────────────────────────────────────

export function addLoreFact(
  db: LoreDatabase,
  category: LoreCategory,
  fact: string,
  keywords: string[],
  source: string,
  priority = 5,
): LoreDatabase {
  const newFact: LoreFact = {
    id: `lore_${++_factId}`,
    category,
    fact,
    keywords: keywords.map(k => k.toLowerCase()),
    priority,
    source,
  };
  return { ...db, facts: [...db.facts, newFact] };
}

export function addWorldRule(db: LoreDatabase, rule: string): LoreDatabase {
  return { ...db, worldRules: [...db.worldRules, rule] };
}

// ── Validation ──────────────────────────────────────────────────

/**
 * Validate narration text against the lore database.
 */
export function validateNarration(
  db: LoreDatabase,
  narrationText: string,
  characterPersonality?: string,
): LoreValidationResult {
  const violations: LoreViolation[] = [];
  const lower = narrationText.toLowerCase();

  // 1. Technology level check
  const forbidden = TECH_LEVEL_FORBIDDEN[db.technologyLevel] || [];
  for (const pattern of forbidden) {
    const match = pattern.exec(narrationText);
    if (match) {
      violations.push({
        fact: {
          id: 'tech_level',
          category: 'technology_level',
          fact: `Technology level is ${db.technologyLevel}`,
          keywords: [],
          priority: 10,
          source: 'world_settings',
        },
        violatingText: match[0],
        severity: 'error',
        suggestion: `Remove "${match[0]}" — incompatible with ${db.technologyLevel} technology level. Use period-appropriate alternatives.`,
      });
    }
  }

  // 2. Character personality contradictions
  if (characterPersonality) {
    const personalityLower = characterPersonality.toLowerCase();
    for (const [trait, checks] of Object.entries(PERSONALITY_CONTRADICTION_MAP)) {
      if (personalityLower.includes(trait)) {
        for (const { pattern, suggestion } of checks) {
          const match = pattern.exec(narrationText);
          if (match) {
            violations.push({
              fact: {
                id: `personality_${trait}`,
                category: 'character_lore',
                fact: `Character personality includes "${trait}"`,
                keywords: [trait],
                priority: 7,
                source: 'character_profile',
              },
              violatingText: match[0],
              severity: 'warning',
              suggestion,
            });
          }
        }
      }
    }
  }

  // 3. Lore fact contradictions
  for (const fact of db.facts) {
    const keywordMatch = fact.keywords.some(kw => lower.includes(kw));
    if (!keywordMatch) continue;

    // Check for direct contradiction keywords
    const negationPatterns = [
      new RegExp(`\\bnot?\\s+${fact.keywords[0]}\\b`, 'i'),
      new RegExp(`\\bnever\\s+.*${fact.keywords[0]}\\b`, 'i'),
      new RegExp(`\\bno\\s+${fact.keywords[0]}\\b`, 'i'),
    ];

    for (const negPattern of negationPatterns) {
      const match = negPattern.exec(narrationText);
      if (match) {
        violations.push({
          fact,
          violatingText: match[0],
          severity: fact.priority >= 8 ? 'error' : 'warning',
          suggestion: `Contradicts established lore: "${fact.fact}" (source: ${fact.source})`,
        });
      }
    }
  }

  return {
    isValid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    adjustedText: violations.length > 0 ? null : narrationText,
  };
}

/**
 * Build a lore consistency context block for the narrator prompt.
 * This proactively prevents violations by instructing the narrator.
 */
export function buildLoreConsistencyContext(
  db: LoreDatabase,
  characterPersonality?: string,
  characterLore?: string,
): string {
  const parts: string[] = [];

  parts.push(`LORE RULES (never violate):`);
  parts.push(`- Technology level: ${db.technologyLevel}. Do NOT reference technology beyond this era.`);

  if (db.worldRules.length > 0) {
    for (const rule of db.worldRules.slice(0, 5)) {
      parts.push(`- ${rule}`);
    }
  }

  if (characterPersonality) {
    parts.push(`- Character personality: "${characterPersonality}". Narration must be consistent with this. Frame contradictory actions as unusual.`);
  }

  if (characterLore) {
    const loreSummary = characterLore.length > 200 ? characterLore.substring(0, 200) + '...' : characterLore;
    parts.push(`- Character background: "${loreSummary}". Reference naturally.`);
  }

  const highPriorityFacts = db.facts.filter(f => f.priority >= 7).slice(0, 5);
  if (highPriorityFacts.length > 0) {
    parts.push('KEY LORE FACTS:');
    for (const f of highPriorityFacts) {
      parts.push(`- [${f.category}] ${f.fact}`);
    }
  }

  return parts.join('\n');
}
