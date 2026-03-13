/**
 * Character Psychology Engine
 *
 * Simulates internal character motivations, emotional states,
 * and psychological values. These change based on narrative events
 * and influence how the narrator describes character actions.
 *
 * Ties into the Character Timeline and Identity Engine.
 */

// ── Types ───────────────────────────────────────────────────────

export interface PsychologicalProfile {
  characterId: string;
  // Core values (0–100)
  values: {
    aggression: number;
    compassion: number;
    caution: number;
    bravery: number;
    deception: number;
    leadership: number;
    loyalty: number;
    morality: number;
  };
  // Goals and motivations
  goals: string[];
  fears: string[];
  motivations: string[];
  // Emotional state (0–100)
  emotions: {
    fear: number;
    confidence: number;
    anger: number;
    determination: number;
    panic: number;
    hope: number;
    trust: number;
    grief: number;
  };
  // Trauma log
  traumaEvents: TraumaEntry[];
  // History
  valueChanges: ValueChangeEntry[];
  lastUpdate: number;
}

export interface TraumaEntry {
  description: string;
  day: number;
  severity: number; // 1–10
  affecting: (keyof PsychologicalProfile['values'] | keyof PsychologicalProfile['emotions'])[];
}

export interface ValueChangeEntry {
  field: string;
  oldValue: number;
  newValue: number;
  cause: string;
  day: number;
}

export interface PsychologicalEvent {
  type: 'combat_damage' | 'ally_support' | 'betrayal' | 'victory' | 'defeat'
    | 'death_witnessed' | 'rescue' | 'discovery' | 'threat' | 'kindness'
    | 'insult' | 'loss' | 'reunion' | 'isolation' | 'leadership_moment';
  severity: number; // 1–10
  description: string;
  day: number;
}

// ── Factory ─────────────────────────────────────────────────────

export function createPsychologicalProfile(characterId: string): PsychologicalProfile {
  return {
    characterId,
    values: {
      aggression: 50,
      compassion: 50,
      caution: 50,
      bravery: 50,
      deception: 30,
      leadership: 40,
      loyalty: 60,
      morality: 60,
    },
    goals: [],
    fears: [],
    motivations: [],
    emotions: {
      fear: 10,
      confidence: 60,
      anger: 10,
      determination: 50,
      panic: 0,
      hope: 50,
      trust: 50,
      grief: 0,
    },
    traumaEvents: [],
    valueChanges: [],
    lastUpdate: 0,
  };
}

// ── Event Processing ────────────────────────────────────────────

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/**
 * Apply a psychological event to the character's profile.
 * Returns updated profile with tracked changes.
 */
export function applyPsychologicalEvent(
  profile: PsychologicalProfile,
  event: PsychologicalEvent,
): PsychologicalProfile {
  const changes: ValueChangeEntry[] = [];
  const v = { ...profile.values };
  const e = { ...profile.emotions };
  const s = event.severity;

  const track = (field: string, oldVal: number, newVal: number) => {
    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal, cause: event.type, day: event.day });
    }
  };

  switch (event.type) {
    case 'combat_damage': {
      const oldFear = e.fear;
      e.fear = clamp(e.fear + s * 3);
      e.confidence = clamp(e.confidence - s * 2);
      v.caution = clamp(v.caution + s);
      track('fear', oldFear, e.fear);
      break;
    }
    case 'ally_support': {
      const oldConf = e.confidence;
      e.confidence = clamp(e.confidence + s * 2);
      e.hope = clamp(e.hope + s * 2);
      e.trust = clamp(e.trust + s);
      v.loyalty = clamp(v.loyalty + s);
      track('confidence', oldConf, e.confidence);
      break;
    }
    case 'betrayal': {
      const oldTrust = e.trust;
      e.trust = clamp(e.trust - s * 4);
      e.anger = clamp(e.anger + s * 3);
      v.caution = clamp(v.caution + s * 2);
      v.loyalty = clamp(v.loyalty - s * 2);
      track('trust', oldTrust, e.trust);
      break;
    }
    case 'victory':
      e.confidence = clamp(e.confidence + s * 3);
      e.determination = clamp(e.determination + s * 2);
      e.fear = clamp(e.fear - s * 2);
      v.bravery = clamp(v.bravery + s);
      break;
    case 'defeat':
      e.confidence = clamp(e.confidence - s * 3);
      e.fear = clamp(e.fear + s * 2);
      e.determination = clamp(e.determination - s);
      v.caution = clamp(v.caution + s * 2);
      break;
    case 'death_witnessed':
      e.fear = clamp(e.fear + s * 2);
      e.grief = clamp(e.grief + s * 3);
      v.morality = clamp(v.morality + s);
      break;
    case 'rescue':
      e.hope = clamp(e.hope + s * 3);
      v.compassion = clamp(v.compassion + s * 2);
      e.trust = clamp(e.trust + s);
      break;
    case 'threat':
      e.fear = clamp(e.fear + s * 2);
      e.panic = clamp(e.panic + s);
      v.aggression = clamp(v.aggression + s);
      break;
    case 'kindness':
      v.compassion = clamp(v.compassion + s * 2);
      e.trust = clamp(e.trust + s);
      e.hope = clamp(e.hope + s);
      break;
    case 'insult':
      e.anger = clamp(e.anger + s * 2);
      v.aggression = clamp(v.aggression + s);
      break;
    case 'loss':
      e.grief = clamp(e.grief + s * 3);
      e.hope = clamp(e.hope - s * 2);
      break;
    case 'leadership_moment':
      v.leadership = clamp(v.leadership + s * 2);
      e.confidence = clamp(e.confidence + s);
      break;
    case 'isolation':
      e.trust = clamp(e.trust - s);
      e.fear = clamp(e.fear + s);
      v.caution = clamp(v.caution + s);
      break;
    case 'discovery':
      e.hope = clamp(e.hope + s);
      e.confidence = clamp(e.confidence + s);
      break;
    case 'reunion':
      e.hope = clamp(e.hope + s * 2);
      e.trust = clamp(e.trust + s * 2);
      e.grief = clamp(e.grief - s * 2);
      break;
  }

  // Add trauma for severe events
  const traumaEvents = [...profile.traumaEvents];
  if (s >= 7) {
    traumaEvents.push({
      description: event.description,
      day: event.day,
      severity: s,
      affecting: getAffectedFields(event.type),
    });
  }

  return {
    ...profile,
    values: v,
    emotions: e,
    traumaEvents: traumaEvents.slice(-20),
    valueChanges: [...profile.valueChanges, ...changes].slice(-50),
    lastUpdate: Date.now(),
  };
}

function getAffectedFields(eventType: PsychologicalEvent['type']): (keyof PsychologicalProfile['values'] | keyof PsychologicalProfile['emotions'])[] {
  const map: Record<string, any[]> = {
    combat_damage: ['fear', 'confidence', 'caution'],
    betrayal: ['trust', 'anger', 'loyalty'],
    defeat: ['confidence', 'fear', 'caution'],
    death_witnessed: ['fear', 'grief', 'morality'],
    loss: ['grief', 'hope'],
  };
  return map[eventType] || [];
}

/**
 * Apply passive emotional decay (emotions drift toward baseline).
 */
export function decayEmotions(profile: PsychologicalProfile): PsychologicalProfile {
  const baseline: Record<keyof PsychologicalProfile['emotions'], number> = {
    fear: 10, confidence: 60, anger: 10, determination: 50,
    panic: 0, hope: 50, trust: 50, grief: 0,
  };

  const emotions = { ...profile.emotions };
  for (const [key, target] of Object.entries(baseline) as [keyof typeof baseline, number][]) {
    const current = emotions[key];
    const diff = target - current;
    emotions[key] = current + diff * 0.1; // 10% drift per cycle
  }

  return { ...profile, emotions };
}

/**
 * Detect dominant emotional state.
 */
export function getDominantEmotion(profile: PsychologicalProfile): string {
  const entries = Object.entries(profile.emotions) as [string, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (top[1] < 30) return 'calm';
  return top[0];
}

/**
 * Build narrator context from psychological profile.
 */
export function buildPsychologyNarratorContext(profile: PsychologicalProfile): string {
  const parts: string[] = [];
  const emotion = getDominantEmotion(profile);

  parts.push(`CHARACTER PSYCHOLOGY:`);
  parts.push(`Dominant emotion: ${emotion}`);

  // High values
  const highValues = Object.entries(profile.values)
    .filter(([, v]) => v >= 70)
    .map(([k]) => k);
  if (highValues.length > 0) {
    parts.push(`Strong traits: ${highValues.join(', ')}`);
  }

  // Low values (also significant)
  const lowValues = Object.entries(profile.values)
    .filter(([, v]) => v <= 25)
    .map(([k]) => k);
  if (lowValues.length > 0) {
    parts.push(`Weak traits: ${lowValues.join(', ')}`);
  }

  // Emotional extremes
  const extremeEmotions = Object.entries(profile.emotions)
    .filter(([, v]) => v >= 70 || v <= 10)
    .map(([k, v]) => `${k}: ${v >= 70 ? 'HIGH' : 'LOW'}`)
    .join(', ');
  if (extremeEmotions) {
    parts.push(`Emotional state: ${extremeEmotions}`);
  }

  // Recent trauma
  const recentTrauma = profile.traumaEvents.slice(-2);
  if (recentTrauma.length > 0) {
    parts.push(`Recent trauma: ${recentTrauma.map(t => t.description).join('; ')}`);
    parts.push('Narrator should subtly reflect psychological impact in character behavior.');
  }

  if (profile.goals.length > 0) {
    parts.push(`Active goals: ${profile.goals.slice(0, 3).join(', ')}`);
  }
  if (profile.fears.length > 0) {
    parts.push(`Fears: ${profile.fears.slice(0, 2).join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Build a compact summary for timeline integration.
 */
export function buildPsychologySummary(profile: PsychologicalProfile): string {
  const emotion = getDominantEmotion(profile);
  const topValues = Object.entries(profile.values)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, v]) => `${k}:${Math.round(v)}`);
  return `Psychology: ${emotion} | ${topValues.join(', ')} | trauma:${profile.traumaEvents.length}`;
}
