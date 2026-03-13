/**
 * Character Silence Engine
 *
 * Recognizes when silence itself is meaningful — when a player
 * avoids responding, withdraws, or ignores topics/people.
 * The narrator can acknowledge this absence as storytelling.
 *
 * Integrates with: Identity Discovery Engine, Relationship Simulation,
 * Character Psychology Engine, Story Orchestrator.
 */

// ── Types ───────────────────────────────────────────────────────

export interface SilencePattern {
  /** What is being avoided */
  subject: string;
  /** Category of avoidance */
  category: 'topic' | 'person' | 'question' | 'confrontation' | 'emotion' | 'decision';
  /** Number of times this has been avoided */
  avoidanceCount: number;
  /** Turns where avoidance occurred */
  turns: number[];
  /** Whether narrator has acknowledged this */
  acknowledged: boolean;
}

export interface SilenceEvent {
  type: 'no_response' | 'topic_avoidance' | 'person_avoidance' | 'deflection' | 'withdrawal';
  subject: string;
  category: SilencePattern['category'];
  turnNumber: number;
  /** What the character was expected to respond to */
  context: string;
}

export interface SilenceEngineState {
  characterId: string;
  patterns: SilencePattern[];
  /** Total silence events detected */
  totalEvents: number;
  /** Narrator acknowledgements delivered */
  deliveredAcknowledgements: { subject: string; turn: number }[];
  /** Recent actions for detecting deflections */
  recentActionTopics: { topic: string; turn: number }[];
}

// ── Acknowledgement Templates ───────────────────────────────────

const SILENCE_TEMPLATES: Record<SilenceEvent['type'], string[]> = {
  no_response: [
    'You say nothing. The moment stretches just long enough for the others to notice.',
    'Your silence leaves the question hanging in the air.',
    'No words. Sometimes that says everything.',
    'The quiet is louder than any response you could have given.',
  ],
  topic_avoidance: [
    'You steer the conversation elsewhere. The avoided topic lingers unspoken.',
    'There it is again — the thing you never address directly.',
    'Some subjects you circle but never touch. This is one of them.',
  ],
  person_avoidance: [
    'You keep your distance. Whether they notice is their problem.',
    'Another interaction you sidestep. The pattern is becoming familiar.',
    'You find reasons not to be near them. The reasons are starting to feel thin.',
  ],
  deflection: [
    'Deflection. Clean, practiced. You\'ve done this before.',
    'You answer without answering. It\'s almost art.',
    'The redirect is smooth enough that most wouldn\'t notice. But the narrator does.',
  ],
  withdrawal: [
    'You pull back — not physically, but in every way that matters.',
    'Something closes behind your eyes. A wall, maybe. Or a door.',
    'Withdrawal. Quiet, complete, and telling.',
  ],
};

// ── Detection Patterns ──────────────────────────────────────────

const TOPIC_AVOIDANCE_PATTERNS = [
  /\b(change.*subject|don.*t.*want.*talk|not.*discuss|skip|move on|let.*s.*not|rather not)\b/i,
  /\b(doesn.*t matter|not important|forget it|drop it|whatever|anyway)\b/i,
];

const DEFLECTION_PATTERNS = [
  /\b(what about you|you.*first|ask.*someone.*else|why.*you.*ask|nice.*weather)\b/i,
  /\b(let.*s focus|more important|we should|instead)\b/i,
];

const WITHDRAWAL_PATTERNS = [
  /\b(walk away|turn away|leave|step back|pull away|withdraw|retreat|go quiet)\b/i,
  /\b(alone|need.*space|by myself|distance)\b/i,
];

// ── Engine Functions ────────────────────────────────────────────

export function createSilenceState(characterId: string): SilenceEngineState {
  return {
    characterId,
    patterns: [],
    totalEvents: 0,
    deliveredAcknowledgements: [],
    recentActionTopics: [],
  };
}

/** Detect silence events from player action (or lack thereof). */
export function detectSilence(
  state: SilenceEngineState,
  action: string,
  context: string,
  turnNumber: number,
): { state: SilenceEngineState; event: SilenceEvent | null } {
  let event: SilenceEvent | null = null;

  // Check for topic avoidance
  if (TOPIC_AVOIDANCE_PATTERNS.some(p => p.test(action))) {
    const subject = extractAvoidedSubject(context);
    event = { type: 'topic_avoidance', subject, category: 'topic', turnNumber, context };
  }
  // Check for deflection
  else if (DEFLECTION_PATTERNS.some(p => p.test(action))) {
    const subject = extractAvoidedSubject(context);
    event = { type: 'deflection', subject, category: 'question', turnNumber, context };
  }
  // Check for withdrawal
  else if (WITHDRAWAL_PATTERNS.some(p => p.test(action))) {
    const subject = extractAvoidedSubject(context);
    event = { type: 'withdrawal', subject, category: 'confrontation', turnNumber, context };
  }
  // Check for very short responses to deep questions
  else if (action.split(/\s+/).length <= 3 && /\b(why|how.*feel|what.*think|tell.*about)\b/i.test(context)) {
    const subject = extractAvoidedSubject(context);
    event = { type: 'no_response', subject, category: 'emotion', turnNumber, context };
  }

  if (!event) return { state, event: null };

  // Record the pattern
  const patterns = [...state.patterns];
  const existing = patterns.find(p => p.subject === event!.subject && p.category === event!.category);

  if (existing) {
    existing.avoidanceCount++;
    existing.turns = [...existing.turns.slice(-9), turnNumber];
  } else {
    patterns.push({
      subject: event.subject,
      category: event.category,
      avoidanceCount: 1,
      turns: [turnNumber],
      acknowledged: false,
    });
  }

  return {
    state: { ...state, patterns, totalEvents: state.totalEvents + 1 },
    event,
  };
}

/** Check if narrator should acknowledge a silence pattern. */
export function shouldAcknowledgeSilence(
  state: SilenceEngineState,
  event: SilenceEvent,
  currentTurn: number,
): boolean {
  const pattern = state.patterns.find(p => p.subject === event.subject);
  if (!pattern || pattern.avoidanceCount < 2) return false;

  // Don't acknowledge too often
  const recentAcks = state.deliveredAcknowledgements.filter(a => currentTurn - a.turn < 15);
  if (recentAcks.length >= 1) return false;

  return Math.random() < 0.2;
}

/** Generate a narrator acknowledgement of silence. */
export function generateSilenceAcknowledgement(
  state: SilenceEngineState,
  event: SilenceEvent,
): { state: SilenceEngineState; text: string } {
  const templates = SILENCE_TEMPLATES[event.type] || SILENCE_TEMPLATES.no_response;
  const text = templates[Math.floor(Math.random() * templates.length)];

  return {
    state: {
      ...state,
      deliveredAcknowledgements: [
        ...state.deliveredAcknowledgements.slice(-9),
        { subject: event.subject, turn: event.turnNumber },
      ],
    },
    text,
  };
}

/** Build narrator context. */
export function buildSilenceNarratorContext(state: SilenceEngineState): string {
  const significant = state.patterns.filter(p => p.avoidanceCount >= 2);
  if (significant.length === 0) return '';

  const parts: string[] = ['CHARACTER SILENCE PATTERNS (what the character avoids):'];
  for (const p of significant.slice(0, 4)) {
    parts.push(`- Avoids "${p.subject}" (${p.category}): ${p.avoidanceCount} times`);
  }
  parts.push('Silence can communicate as much as dialogue. Acknowledge it rarely but meaningfully.');
  parts.push('Do NOT force the character to address avoided topics. Just notice the pattern.');

  return parts.join('\n');
}

// ── Helpers ─────────────────────────────────────────────────────

function extractAvoidedSubject(context: string): string {
  // Try to extract the core topic from the context
  const match = context.match(/about\s+(.{5,30}?)[\.\?\!]|regarding\s+(.{5,30}?)[\.\?\!]|ask.*?about\s+(.{5,30})/i);
  if (match) return (match[1] || match[2] || match[3]).trim();

  // Fall back to first meaningful phrase
  const words = context.split(/\s+/).slice(0, 5).join(' ');
  return words.length > 3 ? words : 'the topic';
}
