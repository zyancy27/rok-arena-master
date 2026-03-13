/**
 * Character Contradiction Engine
 *
 * Detects when a character behaves against their established tendencies
 * and generates subtle narrator acknowledgements. Never blocks actions —
 * only changes how the narrator interprets them.
 *
 * Integrates with: Identity Discovery Engine, Character Psychology Engine,
 * Character Timeline, Story Orchestrator.
 */

import type { CharacterTendency, DiscoveryProfile } from './characterIdentityDiscoveryEngine';

// ── Types ───────────────────────────────────────────────────────

export interface ContradictionDetection {
  /** The established tendency being contradicted */
  tendency: CharacterTendency;
  /** Confidence level of the established tendency (higher = more surprising) */
  tendencyConfidence: number;
  /** The action that contradicts it */
  action: string;
  /** How strong the contradiction is (0-100) */
  contradictionStrength: number;
  /** Turn number */
  turn: number;
}

export interface ContradictionReflection {
  detection: ContradictionDetection;
  /** Narrator line to weave naturally */
  text: string;
  /** Whether this represents growth, stress, or emotional shift */
  interpretationType: 'growth' | 'stress' | 'emotional_shift' | 'surprise';
}

export interface ContradictionEngineState {
  /** Recent contradictions detected */
  recentContradictions: ContradictionDetection[];
  /** Contradictions the narrator has already reflected on */
  reflectedContradictions: { tendency: CharacterTendency; turn: number }[];
  /** Contradiction frequency per tendency */
  contradictionCounts: Record<string, number>;
}

// ── Opposite Tendency Map ───────────────────────────────────────

const TENDENCY_OPPOSITES: Record<CharacterTendency, CharacterTendency[]> = {
  protective: ['cold', 'opportunistic'],
  curious: ['cautious'],
  cautious: ['reckless', 'instinctive'],
  reckless: ['cautious', 'analytical'],
  compassionate: ['cold', 'opportunistic'],
  cold: ['compassionate', 'self_sacrificing', 'protective'],
  stubborn: ['diplomatic'],
  prideful: ['self_sacrificing', 'diplomatic'],
  loyal: ['opportunistic'],
  self_sacrificing: ['cold', 'opportunistic', 'prideful'],
  opportunistic: ['loyal', 'compassionate', 'self_sacrificing'],
  diplomatic: ['stubborn', 'defiant', 'reckless'],
  analytical: ['instinctive', 'reckless'],
  instinctive: ['analytical', 'cautious'],
  defiant: ['diplomatic'],
};

// ── Action-to-Tendency Detection ────────────────────────────────

const ACTION_TENDENCY_MAP: { pattern: RegExp; tendency: CharacterTendency }[] = [
  { pattern: /\b(protect|shield|defend|guard|cover|save)\b/i, tendency: 'protective' },
  { pattern: /\b(investigate|examine|explore|search|inspect)\b/i, tendency: 'curious' },
  { pattern: /\b(wait|observe|assess|careful|slowly|check first)\b/i, tendency: 'cautious' },
  { pattern: /\b(rush|charge|leap|dive|reckless|head first)\b/i, tendency: 'reckless' },
  { pattern: /\b(help|heal|comfort|mercy|forgive|gentle)\b/i, tendency: 'compassionate' },
  { pattern: /\b(ignore|leave them|walk past|not my problem|waste of time)\b/i, tendency: 'cold' },
  { pattern: /\b(refuse|insist|no matter what|stand ground|my way)\b/i, tendency: 'stubborn' },
  { pattern: /\b(pride|honor|reputation|prove|worthy|best)\b/i, tendency: 'prideful' },
  { pattern: /\b(promise|oath|never leave|follow|with you|trust)\b/i, tendency: 'loyal' },
  { pattern: /\b(sacrifice|take the hit|my life|give everything)\b/i, tendency: 'self_sacrificing' },
  { pattern: /\b(advantage|opportunity|profit|leverage|benefit)\b/i, tendency: 'opportunistic' },
  { pattern: /\b(negotiate|compromise|peace|reason with|talk through)\b/i, tendency: 'diplomatic' },
  { pattern: /\b(analyze|calculate|strategy|logic|deduce)\b/i, tendency: 'analytical' },
  { pattern: /\b(instinct|gut|feel|react|impulse|sense)\b/i, tendency: 'instinctive' },
  { pattern: /\b(defy|resist|rebel|fight back|never surrender|challenge)\b/i, tendency: 'defiant' },
];

// ── Reflection Templates ────────────────────────────────────────

const CONTRADICTION_TEMPLATES: Record<string, string[]> = {
  'cautious→reckless': [
    'You hesitate for a moment. Charging forward like this isn\'t usually your way.',
    'Something drives you past your usual caution. Even you seem surprised.',
    'For once, you don\'t stop to think. The moment demands something different.',
  ],
  'compassionate→cold': [
    'The words come out colder than expected. A part of you wonders if you mean them.',
    'You turn away. It\'s not like you, and the silence that follows feels heavy.',
    'Kindness has always been your instinct. Today, something else takes over.',
  ],
  'cold→compassionate': [
    'Even you seem surprised by how quickly the blade moves — to shield, not strike.',
    'You help without thinking. It\'s unlike you, and you\'re not sure what to make of it.',
    'Somewhere beneath the distance you keep, something stirs.',
  ],
  'protective→cold': [
    'You look away this time. Protecting everyone is exhausting, and today you let it go.',
    'For once, you don\'t step between harm and the vulnerable. The absence feels strange.',
  ],
  'loyal→opportunistic': [
    'Loyalty has always defined you. But right now, survival speaks louder.',
    'You make a choice that younger you would not have understood. Or forgiven.',
  ],
  'reckless→cautious': [
    'You stop. Think. Plan. It\'s not your style, but something about this moment demands it.',
    'Patience. A strange feeling for someone who usually acts before thinking.',
  ],
  'diplomatic→defiant': [
    'Words were always your first weapon. Today you choose a different one.',
    'You\'ve always found the middle ground. This time, you refuse to look for it.',
  ],
  'analytical→instinctive': [
    'Logic takes a back seat. Something deeper drives this decision.',
    'You act on feeling alone. Analysis can wait.',
  ],
  'stubborn→diplomatic': [
    'You bend. Just slightly. But it surprises everyone — including yourself.',
    'Compromise has never been your language. Today, you find new words.',
  ],
  'prideful→self_sacrificing': [
    'Pride has always shielded you. Today you set it down, willingly, for someone else.',
    'You lower yourself in a way that would have been unthinkable before.',
  ],
};

const GENERIC_TEMPLATES: string[] = [
  'Something about this moment pulls you outside your usual patterns.',
  'You act differently than expected. Perhaps the world is changing you.',
  'Even you seem to notice — this isn\'t quite who you\'ve been.',
  'A small contradiction. But meaningful ones always start small.',
];

// ── Engine Functions ────────────────────────────────────────────

export function createContradictionState(): ContradictionEngineState {
  return {
    recentContradictions: [],
    reflectedContradictions: [],
    contradictionCounts: {},
  };
}

/** Detect if a player action contradicts established tendencies. */
export function detectContradiction(
  state: ContradictionEngineState,
  profile: DiscoveryProfile,
  action: string,
  turnNumber: number,
): { state: ContradictionEngineState; detection: ContradictionDetection | null } {
  if (profile.emergingIdentity.length === 0) {
    return { state, detection: null };
  }

  // Determine what tendencies the action signals
  const actionTendencies: CharacterTendency[] = [];
  for (const { pattern, tendency } of ACTION_TENDENCY_MAP) {
    if (pattern.test(action)) actionTendencies.push(tendency);
  }

  if (actionTendencies.length === 0) return { state, detection: null };

  // Check if any action tendency contradicts an established one
  for (const established of profile.emergingIdentity) {
    const obs = profile.tendencies.find(t => t.tendency === established);
    if (!obs || obs.confidence < 30) continue;

    const opposites = TENDENCY_OPPOSITES[established] || [];
    const contradicting = actionTendencies.find(at => opposites.includes(at));
    if (!contradicting) continue;

    const strength = Math.min(100, obs.confidence * 0.8 + 10);
    const detection: ContradictionDetection = {
      tendency: established,
      tendencyConfidence: obs.confidence,
      action: action.slice(0, 120),
      contradictionStrength: strength,
      turn: turnNumber,
    };

    const key = established;
    const newCounts = { ...state.contradictionCounts };
    newCounts[key] = (newCounts[key] || 0) + 1;

    return {
      state: {
        ...state,
        recentContradictions: [...state.recentContradictions.slice(-19), detection],
        contradictionCounts: newCounts,
      },
      detection,
    };
  }

  return { state, detection: null };
}

/** Check if narrator should reflect on a contradiction. */
export function shouldReflectContradiction(
  state: ContradictionEngineState,
  detection: ContradictionDetection,
): boolean {
  // Don't reflect too often
  const recentReflections = state.reflectedContradictions.filter(
    r => detection.turn - r.turn < 10,
  );
  if (recentReflections.length >= 2) return false;

  // Higher contradiction strength → higher chance
  const chance = detection.contradictionStrength > 60 ? 0.35 : 0.15;
  return Math.random() < chance;
}

/** Generate a narrator reflection about a contradiction. */
export function generateContradictionReflection(
  state: ContradictionEngineState,
  detection: ContradictionDetection,
  actionTendency: CharacterTendency,
): { state: ContradictionEngineState; reflection: ContradictionReflection } {
  const key = `${detection.tendency}→${actionTendency}`;
  const templates = CONTRADICTION_TEMPLATES[key] || GENERIC_TEMPLATES;
  const text = templates[Math.floor(Math.random() * templates.length)];

  // Determine interpretation
  const count = state.contradictionCounts[detection.tendency] || 0;
  let interpretationType: ContradictionReflection['interpretationType'];
  if (count >= 3) interpretationType = 'growth';
  else if (detection.contradictionStrength > 70) interpretationType = 'stress';
  else if (detection.contradictionStrength > 40) interpretationType = 'emotional_shift';
  else interpretationType = 'surprise';

  const reflection: ContradictionReflection = {
    detection,
    text,
    interpretationType,
  };

  return {
    state: {
      ...state,
      reflectedContradictions: [
        ...state.reflectedContradictions.filter(r => detection.turn - r.turn < 50),
        { tendency: detection.tendency, turn: detection.turn },
      ],
    },
    reflection,
  };
}

/** Build narrator context from contradiction state. */
export function buildContradictionNarratorContext(state: ContradictionEngineState): string {
  if (state.recentContradictions.length === 0) return '';

  const parts: string[] = ['CHARACTER CONTRADICTIONS (observed, not forced):'];

  // Summarize frequent contradictions
  const frequent = Object.entries(state.contradictionCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (frequent.length > 0) {
    parts.push('Recurring shifts:');
    for (const [tendency, count] of frequent) {
      parts.push(`- ${tendency.replace(/_/g, ' ')}: contradicted ${count} times — may indicate growth or internal conflict`);
    }
  }

  parts.push('When contradictions occur, acknowledge subtly. Never judge or block the action.');
  parts.push('Contradictions reveal: emotional shifts, character growth, stress responses, or surprise.');

  return parts.join('\n');
}
