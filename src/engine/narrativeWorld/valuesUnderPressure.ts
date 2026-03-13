/**
 * Values Under Pressure System
 *
 * Detects what a character protects when situations become intense.
 * Tracks repeated patterns to reveal what truly matters to the character.
 *
 * Integrates with: Narrative Pressure Engine, Identity Discovery Engine,
 * Character Psychology Engine, Story Orchestrator.
 */

// ── Types ───────────────────────────────────────────────────────

export type CoreValue =
  | 'survival' | 'loyalty' | 'honor' | 'truth' | 'mercy'
  | 'power' | 'freedom' | 'duty' | 'justice' | 'curiosity'
  | 'family' | 'knowledge' | 'pride' | 'compassion' | 'order';

export interface ValueSignal {
  value: CoreValue;
  action: string;
  pressureLevel: number; // 0-100
  turnNumber: number;
  context: string;
}

export interface ValueProfile {
  value: CoreValue;
  /** How many times this value was chosen under pressure */
  choiceCount: number;
  /** Average pressure level when chosen (higher = more meaningful) */
  avgPressure: number;
  /** Most recent turn observed */
  lastObserved: number;
  /** First turn observed */
  firstObserved: number;
  /** What it was chosen OVER (competing values) */
  chosenOver: CoreValue[];
}

export interface ValuesUnderPressureState {
  characterId: string;
  profiles: ValueProfile[];
  /** Completed dilemmas where a clear value choice was made */
  resolvedDilemmas: {
    chosen: CoreValue;
    rejected: CoreValue;
    turn: number;
    context: string;
  }[];
  /** Narrator reflections already delivered */
  deliveredReflections: { value: CoreValue; turn: number }[];
  totalSignals: number;
}

// ── Detection Patterns ──────────────────────────────────────────

const VALUE_PATTERNS: Record<CoreValue, RegExp[]> = {
  survival: [/\b(survive|escape|flee|run|hide|save myself|stay alive)\b/i],
  loyalty: [/\b(stay with|protect.*ally|never leave|follow.*friend|loyal|oath)\b/i],
  honor: [/\b(honor|fair fight|give them a chance|honorable|right thing)\b/i],
  truth: [/\b(tell the truth|honest|reveal|confess|admit|cannot lie)\b/i],
  mercy: [/\b(spare|mercy|forgive|let.*go|second chance|don.*t kill)\b/i],
  power: [/\b(take.*power|control|dominate|strength|rule|seize)\b/i],
  freedom: [/\b(free|liberate|escape|break.*chains|independence|no master)\b/i],
  duty: [/\b(duty|obligation|mission|orders|task|responsibility|must)\b/i],
  justice: [/\b(justice|punish|deserve|pay for|accountable|wrong must)\b/i],
  curiosity: [/\b(investigate|learn|understand|know.*why|discover|find out)\b/i],
  family: [/\b(family|brother|sister|parent|child|home|protect.*kin)\b/i],
  knowledge: [/\b(knowledge|study|research|wisdom|learn|teach|understand)\b/i],
  pride: [/\b(pride|reputation|prove.*worth|not.*weak|stand tall|dignity)\b/i],
  compassion: [/\b(help|care|comfort|heal|share|gentle|kind)\b/i],
  order: [/\b(order|law|structure|rules|stability|system|peace)\b/i],
};

// ── Reflection Templates ────────────────────────────────────────

const VALUE_REFLECTIONS: Record<CoreValue, string[]> = {
  survival: [
    'When things become difficult, survival always wins.',
    'You choose to live. That is not weakness — it is clarity.',
  ],
  loyalty: [
    'When things become difficult, you always seem to choose loyalty over safety.',
    'The people you care about come first. Always. That says everything.',
  ],
  honor: [
    'Even in the worst moments, you reach for the right thing.',
    'Honor is expensive. You keep paying the price anyway.',
  ],
  truth: [
    'You cannot bring yourself to lie, even when it would be easier.',
    'Truth is your anchor, even in the storm.',
  ],
  mercy: [
    'You keep choosing mercy when the world expects violence.',
    'Sparing lives costs you something every time. You keep choosing it anyway.',
  ],
  power: [
    'When pushed, you reach for control. It is instinct now.',
    'Power is your answer to uncertainty. It always has been.',
  ],
  freedom: [
    'Freedom matters more to you than safety. That is becoming clear.',
    'You will not be controlled. Not by anyone. Not ever.',
  ],
  duty: [
    'Duty pulls you forward even when everything screams to stop.',
    'You do what must be done. It is not heroism — it is who you are.',
  ],
  justice: [
    'You cannot let wrong stand uncorrected. It burns inside you.',
    'Justice drives you more than survival sometimes. That is dangerous and beautiful.',
  ],
  curiosity: [
    'There is a pattern forming in your decisions — curiosity keeps winning.',
    'You choose understanding over caution, every time.',
  ],
  family: [
    'Family is the one thing you will never compromise.',
    'When everything falls away, it is always about the people closest to you.',
  ],
  knowledge: [
    'Knowledge is your shield. You would rather understand than fight.',
    'You gather truth like others gather weapons.',
  ],
  pride: [
    'Your pride keeps you standing when wisdom says to kneel.',
    'You will not bend. Not for anyone. That costs you sometimes.',
  ],
  compassion: [
    'Compassion is your first instinct, even when it is dangerous.',
    'You keep choosing kindness in a world that punishes it.',
  ],
  order: [
    'Chaos is your enemy. You seek structure even in destruction.',
    'Order gives you strength. Without it, you feel untethered.',
  ],
};

// ── Engine Functions ────────────────────────────────────────────

export function createValuesState(characterId: string): ValuesUnderPressureState {
  return {
    characterId,
    profiles: [],
    resolvedDilemmas: [],
    deliveredReflections: [],
    totalSignals: 0,
  };
}

/** Detect value signals from an action taken under pressure. */
export function detectValueSignal(
  action: string,
  pressureLevel: number,
  context: string,
  turnNumber: number,
): ValueSignal[] {
  if (pressureLevel < 20) return []; // Only track under meaningful pressure

  const signals: ValueSignal[] = [];
  for (const [value, patterns] of Object.entries(VALUE_PATTERNS) as [CoreValue, RegExp[]][]) {
    if (patterns.some(p => p.test(action))) {
      signals.push({ value, action: action.slice(0, 100), pressureLevel, turnNumber, context });
    }
  }
  return signals;
}

/** Record a value signal into the state. */
export function recordValueSignal(
  state: ValuesUnderPressureState,
  signal: ValueSignal,
): ValuesUnderPressureState {
  const profiles = [...state.profiles];
  const existing = profiles.find(p => p.value === signal.value);

  if (existing) {
    existing.choiceCount += 1;
    existing.avgPressure = (existing.avgPressure * (existing.choiceCount - 1) + signal.pressureLevel) / existing.choiceCount;
    existing.lastObserved = signal.turnNumber;
  } else {
    profiles.push({
      value: signal.value,
      choiceCount: 1,
      avgPressure: signal.pressureLevel,
      lastObserved: signal.turnNumber,
      firstObserved: signal.turnNumber,
      chosenOver: [],
    });
  }

  return { ...state, profiles, totalSignals: state.totalSignals + 1 };
}

/** Record a dilemma where one value was chosen over another. */
export function recordDilemma(
  state: ValuesUnderPressureState,
  chosen: CoreValue,
  rejected: CoreValue,
  turn: number,
  context: string,
): ValuesUnderPressureState {
  const profiles = [...state.profiles];
  const chosenProfile = profiles.find(p => p.value === chosen);
  if (chosenProfile && !chosenProfile.chosenOver.includes(rejected)) {
    chosenProfile.chosenOver = [...chosenProfile.chosenOver, rejected].slice(-5);
  }

  return {
    ...state,
    profiles,
    resolvedDilemmas: [...state.resolvedDilemmas.slice(-19), { chosen, rejected, turn, context }],
  };
}

/** Get the character's top values. */
export function getTopValues(state: ValuesUnderPressureState, count = 3): ValueProfile[] {
  return [...state.profiles]
    .sort((a, b) => {
      // Weight by choice count * average pressure
      const scoreA = a.choiceCount * (a.avgPressure / 50);
      const scoreB = b.choiceCount * (b.avgPressure / 50);
      return scoreB - scoreA;
    })
    .slice(0, count);
}

/** Check if narrator should reflect on values. */
export function shouldReflectValues(
  state: ValuesUnderPressureState,
  currentTurn: number,
): boolean {
  const topValues = getTopValues(state, 1);
  if (topValues.length === 0 || topValues[0].choiceCount < 3) return false;

  const recent = state.deliveredReflections.filter(r => currentTurn - r.turn < 20);
  if (recent.length >= 1) return false;

  return Math.random() < 0.1;
}

/** Generate a narrator reflection about character values. */
export function generateValueReflection(
  state: ValuesUnderPressureState,
  currentTurn: number,
): { state: ValuesUnderPressureState; text: string; value: CoreValue } | null {
  const topValues = getTopValues(state, 2);
  if (topValues.length === 0) return null;

  // Pick a value that hasn't been reflected recently
  for (const vp of topValues) {
    const lastDelivered = state.deliveredReflections.find(r => r.value === vp.value);
    if (lastDelivered && currentTurn - lastDelivered.turn < 30) continue;

    const templates = VALUE_REFLECTIONS[vp.value] || [];
    if (templates.length === 0) continue;

    const text = templates[Math.floor(Math.random() * templates.length)];
    return {
      state: {
        ...state,
        deliveredReflections: [
          ...state.deliveredReflections.filter(r => currentTurn - r.turn < 60),
          { value: vp.value, turn: currentTurn },
        ],
      },
      text,
      value: vp.value,
    };
  }
  return null;
}

/** Build narrator context. */
export function buildValuesNarratorContext(state: ValuesUnderPressureState): string {
  if (state.totalSignals < 3) return '';

  const topValues = getTopValues(state, 3);
  if (topValues.length === 0) return '';

  const parts: string[] = ['VALUES UNDER PRESSURE (what the character protects when it matters):'];
  for (const vp of topValues) {
    const overStr = vp.chosenOver.length > 0 ? ` (chosen over: ${vp.chosenOver.join(', ')})` : '';
    parts.push(`- ${vp.value}: chosen ${vp.choiceCount} times, avg pressure: ${Math.round(vp.avgPressure)}%${overStr}`);
  }
  parts.push('These reveal core character. Reflect subtly. Never announce directly.');

  return parts.join('\n');
}
