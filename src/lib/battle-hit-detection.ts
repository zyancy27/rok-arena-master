/**
 * Adaptive Hit Detection Language Parser
 *
 * Detects direct-interaction language in battle text and determines
 * whether to trigger the dice/hit-check workflow.
 *
 * The parser is "buildable" — all verbs, templates, and synonyms live
 * in config objects that can be extended without rewriting logic.
 */

// ─── Verb Config ─────────────────────────────────────────────────

export interface VerbEntry {
  /** Base form of the verb */
  base: string;
  /** All conjugations / tense variations */
  forms: string[];
  /** Intent category */
  intent: 'attack' | 'grapple' | 'block' | 'dodge' | 'movement';
  /** Is this a ranged action? */
  ranged?: boolean;
}

/**
 * Expandable verb registry.
 * Add new entries here to extend detection without touching parser logic.
 */
export const INTERACTION_VERBS: VerbEntry[] = [
  // ─── Strike / impact verbs
  { base: 'punch', forms: ['punch', 'punches', 'punched', 'punching'], intent: 'attack' },
  { base: 'kick', forms: ['kick', 'kicks', 'kicked', 'kicking'], intent: 'attack' },
  { base: 'headbutt', forms: ['headbutt', 'headbutts', 'headbutted', 'headbutting'], intent: 'attack' },
  { base: 'elbow', forms: ['elbow', 'elbows', 'elbowed', 'elbowing'], intent: 'attack' },
  { base: 'knee', forms: ['knee', 'knees', 'kneed', 'kneeing'], intent: 'attack' },
  { base: 'slam', forms: ['slam', 'slams', 'slammed', 'slamming'], intent: 'attack' },
  { base: 'smash', forms: ['smash', 'smashes', 'smashed', 'smashing'], intent: 'attack' },
  { base: 'crush', forms: ['crush', 'crushes', 'crushed', 'crushing'], intent: 'attack' },
  { base: 'strike', forms: ['strike', 'strikes', 'struck', 'striking'], intent: 'attack' },
  { base: 'hit', forms: ['hit', 'hits', 'hitting'], intent: 'attack' },
  { base: 'backhand', forms: ['backhand', 'backhands', 'backhanded'], intent: 'attack' },
  { base: 'uppercut', forms: ['uppercut', 'uppercuts', 'uppercutting'], intent: 'attack' },
  { base: 'hook', forms: ['hook', 'hooks', 'hooked', 'hooking'], intent: 'attack' },
  { base: 'jab', forms: ['jab', 'jabs', 'jabbed', 'jabbing'], intent: 'attack' },

  // ─── Blade / weapon verbs
  { base: 'slash', forms: ['slash', 'slashes', 'slashed', 'slashing'], intent: 'attack' },
  { base: 'stab', forms: ['stab', 'stabs', 'stabbed', 'stabbing'], intent: 'attack' },
  { base: 'pierce', forms: ['pierce', 'pierces', 'pierced', 'piercing'], intent: 'attack' },
  { base: 'cut', forms: ['cut', 'cuts', 'cutting'], intent: 'attack' },
  { base: 'cleave', forms: ['cleave', 'cleaves', 'cleaved', 'cleaving'], intent: 'attack' },
  { base: 'slice', forms: ['slice', 'slices', 'sliced', 'slicing'], intent: 'attack' },
  { base: 'impale', forms: ['impale', 'impales', 'impaled', 'impaling'], intent: 'attack' },

  // ─── Ranged / projectile verbs
  { base: 'shoot', forms: ['shoot', 'shoots', 'shot', 'shooting'], intent: 'attack', ranged: true },
  { base: 'fire', forms: ['fire', 'fires', 'fired', 'firing'], intent: 'attack', ranged: true },
  { base: 'blast', forms: ['blast', 'blasts', 'blasted', 'blasting'], intent: 'attack', ranged: true },
  { base: 'hurl', forms: ['hurl', 'hurls', 'hurled', 'hurling'], intent: 'attack', ranged: true },
  { base: 'throw', forms: ['throw', 'throws', 'threw', 'throwing', 'thrown'], intent: 'attack', ranged: true },
  { base: 'launch', forms: ['launch', 'launches', 'launched', 'launching'], intent: 'attack', ranged: true },
  { base: 'unleash', forms: ['unleash', 'unleashes', 'unleashed', 'unleashing'], intent: 'attack', ranged: true },

  // ─── Grapple / restrain verbs
  { base: 'grab', forms: ['grab', 'grabs', 'grabbed', 'grabbing'], intent: 'grapple' },
  { base: 'tackle', forms: ['tackle', 'tackles', 'tackled', 'tackling'], intent: 'grapple' },
  { base: 'restrain', forms: ['restrain', 'restrains', 'restrained', 'restraining'], intent: 'grapple' },
  { base: 'bind', forms: ['bind', 'binds', 'bound', 'binding'], intent: 'grapple' },
  { base: 'choke', forms: ['choke', 'chokes', 'choked', 'choking'], intent: 'grapple' },
  { base: 'pin', forms: ['pin', 'pins', 'pinned', 'pinning'], intent: 'grapple' },
  { base: 'grapple', forms: ['grapple', 'grapples', 'grappled', 'grappling'], intent: 'grapple' },
  { base: 'hold', forms: ['hold down', 'holds down', 'held down', 'holding down'], intent: 'grapple' },
  { base: 'wrap', forms: ['wrap', 'wraps', 'wrapped', 'wrapping'], intent: 'grapple' },

  // ─── Block / parry verbs
  { base: 'block', forms: ['block', 'blocks', 'blocked', 'blocking'], intent: 'block' },
  { base: 'parry', forms: ['parry', 'parries', 'parried', 'parrying'], intent: 'block' },
  { base: 'deflect', forms: ['deflect', 'deflects', 'deflected', 'deflecting'], intent: 'block' },
  { base: 'intercept', forms: ['intercept', 'intercepts', 'intercepted', 'intercepting'], intent: 'block' },

  // ─── Dodge / evasion
  { base: 'dodge', forms: ['dodge', 'dodges', 'dodged', 'dodging'], intent: 'dodge' },
  { base: 'evade', forms: ['evade', 'evades', 'evaded', 'evading'], intent: 'dodge' },
  { base: 'sidestep', forms: ['sidestep', 'sidesteps', 'sidestepped'], intent: 'dodge' },
  { base: 'duck', forms: ['duck', 'ducks', 'ducked', 'ducking'], intent: 'dodge' },
];

// ─── Target pronouns ────────────────────────────────────────────

const TARGET_PRONOUNS = [
  'you', 'him', 'her', 'them', 'it',
  'his', 'their', 'the opponent', 'the enemy',
  'my opponent', 'my enemy', 'the target',
  // Third-person narration
  'he', 'she', 'they',
];

// ─── Types ───────────────────────────────────────────────────────

export type InteractionIntent = 'attack' | 'grapple' | 'block' | 'dodge' | 'movement' | 'none';

export interface HitDetectionResult {
  /** Was direct interaction detected? */
  detected: boolean;
  /** What kind of interaction */
  intent: InteractionIntent;
  /** Which verb(s) matched */
  matchedVerbs: string[];
  /** Is the attack ranged? */
  isRanged: boolean;
  /** Does the text target another character? */
  hasTarget: boolean;
  /** Should we trigger the dice/hit-check workflow? */
  shouldTriggerHitCheck: boolean;
  /** Confidence 0-1 */
  confidence: number;
}

// ─── Parser ──────────────────────────────────────────────────────

/**
 * Detect direct interaction language in battle text.
 *
 * Returns whether a hit check should be triggered.
 */
export function detectDirectInteraction(actionText: string): HitDetectionResult {
  const text = actionText.toLowerCase();
  const matchedVerbs: string[] = [];
  let primaryIntent: InteractionIntent = 'none';
  let isRanged = false;

  // Check each registered verb
  for (const entry of INTERACTION_VERBS) {
    for (const form of entry.forms) {
      // Word-boundary match
      const regex = new RegExp(`\\b${escapeRegex(form)}\\b`, 'i');
      if (regex.test(text)) {
        matchedVerbs.push(form);
        // First attack/grapple verb wins for primary intent
        if (primaryIntent === 'none' || (entry.intent === 'attack' && primaryIntent !== 'attack')) {
          primaryIntent = entry.intent;
        }
        if (entry.ranged) isRanged = true;
        break; // One match per entry is enough
      }
    }
  }

  // Check for target pronoun
  const hasTarget = TARGET_PRONOUNS.some(pronoun => {
    const regex = new RegExp(`\\b${escapeRegex(pronoun)}\\b`, 'i');
    return regex.test(text);
  });

  // Determine if hit check should trigger
  // Attack or grapple WITH a target = trigger
  const isOffensiveIntent = primaryIntent === 'attack' || primaryIntent === 'grapple';
  const shouldTriggerHitCheck = isOffensiveIntent && (hasTarget || matchedVerbs.length >= 2);

  // Confidence based on how many signals we found
  let confidence = 0;
  if (matchedVerbs.length > 0) confidence += 0.3;
  if (matchedVerbs.length > 1) confidence += 0.2;
  if (hasTarget) confidence += 0.3;
  if (isOffensiveIntent) confidence += 0.2;
  confidence = Math.min(1, confidence);

  return {
    detected: matchedVerbs.length > 0,
    intent: primaryIntent,
    matchedVerbs,
    isRanged,
    hasTarget,
    shouldTriggerHitCheck,
    confidence,
  };
}

/**
 * Classify what type of hit-check to run.
 */
export function classifyInteraction(result: HitDetectionResult): 'physical_attack' | 'ranged_attack' | 'grapple' | 'defensive' | 'none' {
  if (!result.detected) return 'none';

  if (result.intent === 'grapple') return 'grapple';
  if (result.intent === 'block' || result.intent === 'dodge') return 'defensive';
  if (result.intent === 'attack') {
    return result.isRanged ? 'ranged_attack' : 'physical_attack';
  }
  return 'none';
}

/**
 * Generate context for the AI narrator about hit detection.
 */
export function getHitDetectionContext(result: HitDetectionResult): string {
  if (!result.shouldTriggerHitCheck) return '';

  const lines = ['[HIT DETECTION]:'];
  lines.push(`Direct interaction detected: ${result.matchedVerbs.join(', ')}`);
  lines.push(`Intent: ${result.intent} | Ranged: ${result.isRanged} | Target: ${result.hasTarget}`);
  lines.push(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  lines.push(`A dice roll will determine the outcome. Do NOT auto-decide if the attack lands.`);
  return lines.join('\n');
}

// ─── Utilities ───────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Add a custom verb entry at runtime (for extensibility).
 */
export function registerVerb(entry: VerbEntry): void {
  INTERACTION_VERBS.push(entry);
}
