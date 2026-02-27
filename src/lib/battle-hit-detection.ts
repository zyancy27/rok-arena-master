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
  /** Weight for confidence scoring (default 1) */
  weight?: number;
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
  { base: 'hit', forms: ['hit', 'hits', 'hitting'], intent: 'attack', weight: 0.7 },
  { base: 'backhand', forms: ['backhand', 'backhands', 'backhanded'], intent: 'attack' },
  { base: 'uppercut', forms: ['uppercut', 'uppercuts', 'uppercutting'], intent: 'attack' },
  { base: 'hook', forms: ['hook', 'hooks', 'hooked', 'hooking'], intent: 'attack', weight: 0.6 },
  { base: 'jab', forms: ['jab', 'jabs', 'jabbed', 'jabbing'], intent: 'attack' },
  { base: 'claw', forms: ['claw', 'claws', 'clawed', 'clawing'], intent: 'attack' },
  { base: 'bite', forms: ['bite', 'bites', 'bit', 'biting', 'bitten'], intent: 'attack' },
  { base: 'stomp', forms: ['stomp', 'stomps', 'stomped', 'stomping'], intent: 'attack' },
  { base: 'pummel', forms: ['pummel', 'pummels', 'pummeled', 'pummeling'], intent: 'attack' },
  { base: 'batter', forms: ['batter', 'batters', 'battered', 'battering'], intent: 'attack' },
  { base: 'ram', forms: ['ram', 'rams', 'rammed', 'ramming'], intent: 'attack' },
  { base: 'swing', forms: ['swing', 'swings', 'swung', 'swinging'], intent: 'attack' },

  // ─── Blade / weapon verbs
  { base: 'slash', forms: ['slash', 'slashes', 'slashed', 'slashing'], intent: 'attack' },
  { base: 'stab', forms: ['stab', 'stabs', 'stabbed', 'stabbing'], intent: 'attack' },
  { base: 'pierce', forms: ['pierce', 'pierces', 'pierced', 'piercing'], intent: 'attack' },
  { base: 'cut', forms: ['cut', 'cuts', 'cutting'], intent: 'attack', weight: 0.6 },
  { base: 'cleave', forms: ['cleave', 'cleaves', 'cleaved', 'cleaving'], intent: 'attack' },
  { base: 'slice', forms: ['slice', 'slices', 'sliced', 'slicing'], intent: 'attack' },
  { base: 'impale', forms: ['impale', 'impales', 'impaled', 'impaling'], intent: 'attack' },
  { base: 'hack', forms: ['hack', 'hacks', 'hacked', 'hacking'], intent: 'attack' },
  { base: 'sever', forms: ['sever', 'severs', 'severed', 'severing'], intent: 'attack' },
  { base: 'gouge', forms: ['gouge', 'gouges', 'gouged', 'gouging'], intent: 'attack' },
  { base: 'thrust', forms: ['thrust', 'thrusts', 'thrusting'], intent: 'attack' },

  // ─── Ranged / projectile verbs
  { base: 'shoot', forms: ['shoot', 'shoots', 'shot', 'shooting'], intent: 'attack', ranged: true },
  { base: 'fire', forms: ['fire', 'fires', 'fired', 'firing'], intent: 'attack', ranged: true, weight: 0.7 },
  { base: 'blast', forms: ['blast', 'blasts', 'blasted', 'blasting'], intent: 'attack', ranged: true },
  { base: 'hurl', forms: ['hurl', 'hurls', 'hurled', 'hurling'], intent: 'attack', ranged: true },
  { base: 'throw', forms: ['throw', 'throws', 'threw', 'throwing', 'thrown'], intent: 'attack', ranged: true },
  { base: 'launch', forms: ['launch', 'launches', 'launched', 'launching'], intent: 'attack', ranged: true },
  { base: 'unleash', forms: ['unleash', 'unleashes', 'unleashed', 'unleashing'], intent: 'attack', ranged: true },
  { base: 'rain', forms: ['rain', 'rains', 'rained', 'raining'], intent: 'attack', ranged: true, weight: 0.5 },
  { base: 'bombard', forms: ['bombard', 'bombards', 'bombarded', 'bombarding'], intent: 'attack', ranged: true },
  { base: 'barrage', forms: ['barrage', 'barrages', 'barraged'], intent: 'attack', ranged: true },
  { base: 'snipe', forms: ['snipe', 'snipes', 'sniped', 'sniping'], intent: 'attack', ranged: true },

  // ─── Energy / magic verbs
  { base: 'channel', forms: ['channel', 'channels', 'channeled', 'channeling'], intent: 'attack', ranged: true, weight: 0.5 },
  { base: 'surge', forms: ['surge', 'surges', 'surged', 'surging'], intent: 'attack', ranged: true, weight: 0.5 },
  { base: 'detonate', forms: ['detonate', 'detonates', 'detonated', 'detonating'], intent: 'attack', ranged: true },
  { base: 'erupt', forms: ['erupt', 'erupts', 'erupted', 'erupting'], intent: 'attack', ranged: true, weight: 0.6 },
  { base: 'incinerate', forms: ['incinerate', 'incinerates', 'incinerated', 'incinerating'], intent: 'attack', ranged: true },
  { base: 'disintegrate', forms: ['disintegrate', 'disintegrates', 'disintegrated'], intent: 'attack', ranged: true },
  { base: 'zap', forms: ['zap', 'zaps', 'zapped', 'zapping'], intent: 'attack', ranged: true },
  { base: 'shock', forms: ['shock', 'shocks', 'shocked', 'shocking'], intent: 'attack', ranged: true, weight: 0.6 },
  { base: 'electrocute', forms: ['electrocute', 'electrocutes', 'electrocuted'], intent: 'attack', ranged: true },
  { base: 'freeze', forms: ['freeze', 'freezes', 'froze', 'freezing', 'frozen'], intent: 'attack', ranged: true, weight: 0.5 },
  { base: 'ignite', forms: ['ignite', 'ignites', 'ignited', 'igniting'], intent: 'attack', ranged: true, weight: 0.6 },
  { base: 'scorch', forms: ['scorch', 'scorches', 'scorched', 'scorching'], intent: 'attack', ranged: true },
  { base: 'combust', forms: ['combust', 'combusts', 'combusted', 'combusting'], intent: 'attack', ranged: true },
  { base: 'vaporize', forms: ['vaporize', 'vaporizes', 'vaporized', 'vaporizing'], intent: 'attack', ranged: true },
  { base: 'implode', forms: ['implode', 'implodes', 'imploded', 'imploding'], intent: 'attack', ranged: true },

  // ─── Grapple / restrain verbs
  { base: 'grab', forms: ['grab', 'grabs', 'grabbed', 'grabbing'], intent: 'grapple' },
  { base: 'tackle', forms: ['tackle', 'tackles', 'tackled', 'tackling'], intent: 'grapple' },
  { base: 'restrain', forms: ['restrain', 'restrains', 'restrained', 'restraining'], intent: 'grapple' },
  { base: 'bind', forms: ['bind', 'binds', 'bound', 'binding'], intent: 'grapple', weight: 0.7 },
  { base: 'choke', forms: ['choke', 'chokes', 'choked', 'choking'], intent: 'grapple' },
  { base: 'pin', forms: ['pin', 'pins', 'pinned', 'pinning'], intent: 'grapple' },
  { base: 'grapple', forms: ['grapple', 'grapples', 'grappled', 'grappling'], intent: 'grapple' },
  { base: 'hold', forms: ['hold down', 'holds down', 'held down', 'holding down'], intent: 'grapple' },
  { base: 'wrap', forms: ['wrap', 'wraps', 'wrapped', 'wrapping'], intent: 'grapple', weight: 0.5 },
  { base: 'constrict', forms: ['constrict', 'constricts', 'constricted', 'constricting'], intent: 'grapple' },
  { base: 'ensnare', forms: ['ensnare', 'ensnares', 'ensnared', 'ensnaring'], intent: 'grapple' },
  { base: 'snatch', forms: ['snatch', 'snatches', 'snatched', 'snatching'], intent: 'grapple' },
  { base: 'latch', forms: ['latch', 'latches', 'latched', 'latching'], intent: 'grapple' },
  { base: 'seize', forms: ['seize', 'seizes', 'seized', 'seizing'], intent: 'grapple' },

  // ─── Block / parry verbs
  { base: 'block', forms: ['block', 'blocks', 'blocked', 'blocking'], intent: 'block' },
  { base: 'parry', forms: ['parry', 'parries', 'parried', 'parrying'], intent: 'block' },
  { base: 'deflect', forms: ['deflect', 'deflects', 'deflected', 'deflecting'], intent: 'block' },
  { base: 'intercept', forms: ['intercept', 'intercepts', 'intercepted', 'intercepting'], intent: 'block' },
  { base: 'counter', forms: ['counter', 'counters', 'countered', 'countering'], intent: 'block', weight: 0.6 },
  { base: 'repel', forms: ['repel', 'repels', 'repelled', 'repelling'], intent: 'block' },

  // ─── Dodge / evasion
  { base: 'dodge', forms: ['dodge', 'dodges', 'dodged', 'dodging'], intent: 'dodge' },
  { base: 'evade', forms: ['evade', 'evades', 'evaded', 'evading'], intent: 'dodge' },
  { base: 'sidestep', forms: ['sidestep', 'sidesteps', 'sidestepped'], intent: 'dodge' },
  { base: 'duck', forms: ['duck', 'ducks', 'ducked', 'ducking'], intent: 'dodge' },
  { base: 'weave', forms: ['weave', 'weaves', 'weaved', 'weaving'], intent: 'dodge' },
  { base: 'roll', forms: ['roll', 'rolls', 'rolled', 'rolling'], intent: 'dodge', weight: 0.4 },

  // ─── Charge / rush (attack-movement hybrids)
  { base: 'lunge', forms: ['lunge', 'lunges', 'lunged', 'lunging'], intent: 'attack' },
  { base: 'charge', forms: ['charge', 'charges', 'charged', 'charging'], intent: 'attack', weight: 0.6 },
  { base: 'rush', forms: ['rush', 'rushes', 'rushed', 'rushing'], intent: 'attack', weight: 0.5 },
  { base: 'pounce', forms: ['pounce', 'pounces', 'pounced', 'pouncing'], intent: 'attack' },
  { base: 'dive', forms: ['dive', 'dives', 'dived', 'diving'], intent: 'attack', weight: 0.5 },
];

// ─── Target pronouns ────────────────────────────────────────────

const TARGET_PRONOUNS = [
  'you', 'him', 'her', 'them', 'it',
  'his', 'their', 'the opponent', 'the enemy',
  'my opponent', 'my enemy', 'the target',
  // Third-person narration
  'he', 'she', 'they',
];

// ─── Negation / conditional patterns ─────────────────────────────

/**
 * Patterns that appear BEFORE a verb and negate it or make it hypothetical.
 * We look for these within a small word window before the matched verb.
 */
const NEGATION_PREFIXES = [
  'not', "n't", 'never', 'no', 'without',
  'barely', 'hardly', 'almost', 'nearly',
  'fails to', 'failed to', 'unable to', 'couldn\'t',
  'doesn\'t', 'didn\'t', 'won\'t', 'wouldn\'t',
  'can\'t', 'cannot',
];

/**
 * Words that indicate hypothetical / conditional / preparatory intent
 * rather than an actual action being performed now.
 */
const HYPOTHETICAL_MARKERS = [
  'would', 'could', 'might', 'may', 'should',
  'want to', 'wants to', 'wanted to',
  'plan to', 'plans to', 'planned to',
  'think about', 'thinks about', 'thinking about',
  'consider', 'considers', 'considered', 'considering',
  'tempted to', 'prepare to', 'prepares to', 'preparing to',
  'ready to', 'readies',
  'about to', 'threatens to',
  'feint', 'feints', 'feinted', 'feinting',
  'fake', 'fakes', 'faked', 'faking',
];

/**
 * Phrases describing past / remembered events, not current actions.
 */
const NARRATIVE_PAST_MARKERS = [
  'remembers when', 'recalled', 'recalls', 'remembered',
  'used to', 'once', 'long ago', 'in the past',
  'flashback', 'memory of', 'memories of',
  'had once', 'had previously',
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
  /** Reasons hit check was suppressed (for debugging) */
  suppressionReasons?: string[];
}

// ─── Parser ──────────────────────────────────────────────────────

/**
 * Check if a verb match at a given position is negated or hypothetical.
 * Looks at a window of ~8 words before the match position.
 */
function isVerbNegated(text: string, matchIndex: number): string | null {
  // Get up to 60 chars before the match (covers ~8 words)
  const prefix = text.substring(Math.max(0, matchIndex - 60), matchIndex).toLowerCase();

  for (const neg of NEGATION_PREFIXES) {
    if (prefix.includes(neg)) return `negated by "${neg}"`;
  }
  for (const hyp of HYPOTHETICAL_MARKERS) {
    if (prefix.includes(hyp)) return `hypothetical: "${hyp}"`;
  }
  return null;
}

/**
 * Check if the entire text is framed as a past narrative / memory.
 */
function isNarrativePast(text: string): boolean {
  const lower = text.toLowerCase();
  return NARRATIVE_PAST_MARKERS.some(marker => lower.includes(marker));
}

/**
 * Detect direct interaction language in battle text.
 *
 * Returns whether a hit check should be triggered.
 */
export function detectDirectInteraction(actionText: string): HitDetectionResult {
  const text = actionText.toLowerCase();
  const matchedVerbs: string[] = [];
  const suppressionReasons: string[] = [];
  let primaryIntent: InteractionIntent = 'none';
  let isRanged = false;
  let totalWeight = 0;
  let verbCount = 0;

  // Narrative-past check (global suppression)
  const isPast = isNarrativePast(text);
  if (isPast) {
    suppressionReasons.push('narrative past tense / memory');
  }

  // Check each registered verb
  for (const entry of INTERACTION_VERBS) {
    for (const form of entry.forms) {
      const regex = new RegExp(`\\b${escapeRegex(form)}\\b`, 'i');
      const match = regex.exec(text);
      if (match) {
        // Check negation/hypothetical around this specific match
        const negation = isVerbNegated(text, match.index);
        if (negation) {
          suppressionReasons.push(`"${form}" ${negation}`);
          break; // Skip this verb entry
        }

        matchedVerbs.push(form);
        const w = entry.weight ?? 1;
        totalWeight += w;
        verbCount++;

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

  // ─── Confidence scoring (weighted) ─────────────────────────────
  let confidence = 0;
  if (verbCount > 0) confidence += Math.min(0.35, totalWeight * 0.15);
  if (verbCount > 1) confidence += Math.min(0.2, (totalWeight - 1) * 0.1);
  if (hasTarget) confidence += 0.3;

  const isOffensiveIntent = primaryIntent === 'attack' || primaryIntent === 'grapple';
  if (isOffensiveIntent) confidence += 0.2;
  confidence = Math.min(1, confidence);

  // ─── Trigger decision ──────────────────────────────────────────
  let shouldTriggerHitCheck = false;

  if (isPast) {
    // Never trigger for memories / flashbacks
    shouldTriggerHitCheck = false;
  } else if (isOffensiveIntent && hasTarget && confidence >= 0.5) {
    // Strong signal: offensive verb + explicit target + decent confidence
    shouldTriggerHitCheck = true;
  } else if (isOffensiveIntent && verbCount >= 2 && confidence >= 0.6) {
    // Multiple offensive verbs without explicit target but high confidence
    shouldTriggerHitCheck = true;
  }

  // If all matched verbs were suppressed, don't trigger
  if (matchedVerbs.length === 0 && suppressionReasons.length > 0) {
    shouldTriggerHitCheck = false;
  }

  return {
    detected: matchedVerbs.length > 0,
    intent: primaryIntent,
    matchedVerbs,
    isRanged,
    hasTarget,
    shouldTriggerHitCheck,
    confidence,
    suppressionReasons: suppressionReasons.length > 0 ? suppressionReasons : undefined,
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
