/**
 * Intent Interpreter – Layer 1
 *
 * Non-authoritative, invisible classifier that reads raw move text and
 * produces categorical metadata.  It NEVER modifies the original text,
 * injects anything into chat, calculates damage, or decides outcomes.
 *
 * The output is consumed exclusively by the hard-clamp layer.
 */

// ─── Public types ────────────────────────────────────────────────────────────

export type ActionType =
  | 'ATTACK'
  | 'DEFENSE'
  | 'MOVEMENT'
  | 'UTILITY'
  | 'CHARGE'
  | 'COUNTER'
  | 'ENVIRONMENTAL'
  | 'UNKNOWN';

export type IntentCategory = 'LOW_FORCE' | 'MODERATE_FORCE' | 'HIGH_FORCE';

export type Posture = 'SAFE' | 'AGGRESSIVE' | 'RECKLESS';

export type Targeting = 'SINGLE' | 'AREA';

export interface MoveIntent {
  /** Broad category of the action */
  actionType: ActionType;
  /** Force magnitude bucket */
  intentCategory: IntentCategory;
  /** Risk posture of the player */
  posture: Posture;
  /** Single-target or area-of-effect */
  targeting: Targeting;
  /** Whether the text implies an attempt to control the opponent's actions */
  controlIntent: boolean;
  /** Whether the text describes preparation rather than execution */
  preparationIntent: boolean;
  /** 0-1 confidence that interpretation is accurate */
  confidence: number;
  /** Detected element keywords (for downstream element-compat checks) */
  detectedElements: string[];
  /** Whether absolute/exploit language was detected and neutralised */
  absoluteLanguageDetected: boolean;
}

// ─── Internal keyword sets ───────────────────────────────────────────────────

const ATTACK_KEYWORDS = [
  'attack', 'strike', 'punch', 'kick', 'slash', 'stab', 'blast',
  'fire', 'shoot', 'launch', 'throw', 'hurl', 'slam', 'smash',
  'crush', 'beam', 'barrage', 'assault', 'lunge', 'cleave',
  'swing', 'cut', 'pierce', 'impale', 'bombard',
];

const DEFENSE_KEYWORDS = [
  'dodge', 'block', 'parry', 'deflect', 'evade', 'shield',
  'guard', 'brace', 'protect', 'ward', 'barrier', 'counter',
  'sidestep', 'duck', 'roll', 'absorb',
];

const MOVEMENT_KEYWORDS = [
  'move', 'dash', 'teleport', 'run', 'sprint', 'leap', 'fly',
  'retreat', 'advance', 'flank', 'circle', 'phase',
];

const CHARGE_KEYWORDS = [
  'charge', 'channel', 'gather', 'build', 'focus', 'concentrate',
  'power up', 'channeling', 'preparing',
];

const UTILITY_KEYWORDS = [
  'heal', 'buff', 'summon', 'create', 'construct', 'repair',
  'analyze', 'scan', 'observe',
];

const ENVIRONMENTAL_KEYWORDS = [
  'terrain', 'environment', 'ground', 'weather', 'surroundings',
  'landscape', 'floor', 'ceiling', 'wall',
];

const HIGH_FORCE_KEYWORDS = [
  'full power', 'maximum', 'ultimate', 'all-out', 'strongest',
  'devastating', 'annihilate', 'obliterate', 'disintegrate', 'erase',
  'destroy', 'demolish', 'nuke', 'eradicate', 'cataclysm',
  'apocalypse', 'extinction', 'planet-level', 'galaxy',
];

const MODERATE_FORCE_KEYWORDS = [
  'powerful', 'strong', 'heavy', 'hard', 'intense', 'fierce',
  'mighty', 'forceful', 'concentrated',
];

const RECKLESS_KEYWORDS = [
  'reckless', 'kamikaze', 'sacrifice', 'all-in', 'desperate',
  'abandon', 'no regard', 'don\'t care', 'suicidal', 'berserk',
  'frenzy',
];

const AGGRESSIVE_KEYWORDS = [
  'aggressive', 'relentless', 'fury', 'rage', 'onslaught',
  'barrage', 'flurry', 'blitz', 'rush',
];

const AREA_KEYWORDS = [
  'area', 'everything', 'everywhere', 'all around', 'entire',
  'whole', 'massive', 'radius', 'shockwave', 'explosion',
  'widespread', 'engulf', 'surround',
];

const CONTROL_KEYWORDS = [
  'force them', 'make them', 'compel', 'control', 'puppet',
  'command', 'dominate', 'manipulate', 'enslave', 'override',
  'you must', 'you have to', 'you can\'t', 'you cannot',
];

const PREPARATION_KEYWORDS = [
  'prepare', 'ready', 'stance', 'position', 'set up',
  'wind up', 'draw back', 'aim', 'lock on', 'focus',
];

/**
 * Absolute / exploit language that should NOT boost force interpretation.
 */
const ABSOLUTE_LANGUAGE = [
  'unavoidable', 'guaranteed', 'instant kill', 'undodgeable',
  'cannot be blocked', 'inescapable', 'absolute', 'unblockable',
  'cannot miss', 'auto-hit', 'one-shot', 'no chance', 'impossible to',
  'nothing can stop', 'no defense', 'infinite damage', 'unlimited power',
  'kills instantly', 'erases from existence',
];

const ELEMENT_KEYWORDS: Record<string, RegExp> = {
  fire: /fire|flame|burn|heat|inferno|blaze|magma|lava|pyro|combustion/i,
  ice: /ice|freeze|frost|cold|snow|blizzard|cryo|frozen|glacial/i,
  water: /water|aqua|ocean|wave|flood|hydro|liquid|rain|tide/i,
  lightning: /lightning|thunder|electric|shock|volt|static|storm/i,
  earth: /earth|rock|stone|ground|terra|metal|mineral|seismic/i,
  wind: /wind|air|gust|tornado|hurricane|aero|cyclone/i,
  light: /light|holy|radiant|solar|divine|celestial|luminous/i,
  dark: /dark|shadow|void|abyss|night|umbra|shade/i,
  psychic: /psychic|mental|mind|telekinesis|telepathy|psionic/i,
  poison: /poison|toxic|venom|acid|corrosive|noxious/i,
  gravity: /gravity|weight|mass|crush|pull/i,
  time: /time|temporal|chrono|age/i,
  space: /space|dimension|portal|warp|teleport/i,
  energy: /energy|ki|chi|chakra|aura/i,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw)).length;
}

function hasMatch(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// ─── Main interpreter ────────────────────────────────────────────────────────

/**
 * Interpret the categorical intent of a raw move string.
 * Pure function – no side-effects.
 */
export function interpretMove(moveText: string): MoveIntent {
  const text = moveText.toLowerCase();

  // 1. Detect absolute / exploit language (neutralise – do NOT boost force)
  const absoluteLanguageDetected = hasMatch(text, ABSOLUTE_LANGUAGE);

  // 2. Action type (highest keyword-match wins)
  const scores: Record<ActionType, number> = {
    ATTACK: countMatches(text, ATTACK_KEYWORDS),
    DEFENSE: countMatches(text, DEFENSE_KEYWORDS),
    MOVEMENT: countMatches(text, MOVEMENT_KEYWORDS),
    CHARGE: countMatches(text, CHARGE_KEYWORDS),
    UTILITY: countMatches(text, UTILITY_KEYWORDS),
    ENVIRONMENTAL: countMatches(text, ENVIRONMENTAL_KEYWORDS),
    COUNTER: 0,
    UNKNOWN: 0,
  };

  // Counter = defense + attack together
  if (scores.DEFENSE > 0 && scores.ATTACK > 0) {
    scores.COUNTER = scores.DEFENSE + scores.ATTACK;
  }

  let actionType: ActionType = 'UNKNOWN';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as [ActionType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      actionType = type;
    }
  }

  // 3. Intent category
  // Adjectives do NOT stack – we use presence, not count.
  let intentCategory: IntentCategory = 'MODERATE_FORCE';
  if (hasMatch(text, HIGH_FORCE_KEYWORDS)) {
    intentCategory = 'HIGH_FORCE';
  } else if (!hasMatch(text, MODERATE_FORCE_KEYWORDS)) {
    intentCategory = 'LOW_FORCE';
  }

  // Neutralise: absolute language caps at MODERATE_FORCE
  if (absoluteLanguageDetected && intentCategory === 'HIGH_FORCE') {
    intentCategory = 'MODERATE_FORCE';
  }

  // 4. Posture
  let posture: Posture = 'SAFE';
  if (hasMatch(text, RECKLESS_KEYWORDS)) {
    posture = 'RECKLESS';
  } else if (hasMatch(text, AGGRESSIVE_KEYWORDS)) {
    posture = 'AGGRESSIVE';
  }

  // 5. Targeting
  const targeting: Targeting = hasMatch(text, AREA_KEYWORDS) ? 'AREA' : 'SINGLE';

  // 6. Control intent
  const controlIntent = hasMatch(text, CONTROL_KEYWORDS);

  // 7. Preparation intent
  const preparationIntent = hasMatch(text, PREPARATION_KEYWORDS) && actionType !== 'ATTACK';

  // 8. Confidence
  let confidence = 0.8;
  if (bestScore === 0) confidence = 0.3;
  else if (bestScore === 1) confidence = 0.6;
  else if (bestScore >= 3) confidence = 0.95;

  // Low confidence → default to safe/moderate
  if (confidence < 0.5) {
    intentCategory = 'MODERATE_FORCE';
    posture = 'SAFE';
  }

  // 9. Detected elements
  const detectedElements: string[] = [];
  for (const [element, regex] of Object.entries(ELEMENT_KEYWORDS)) {
    if (regex.test(text)) detectedElements.push(element);
  }

  return {
    actionType,
    intentCategory,
    posture,
    targeting,
    controlIntent,
    preparationIntent,
    confidence,
    detectedElements,
    absoluteLanguageDetected,
  };
}
