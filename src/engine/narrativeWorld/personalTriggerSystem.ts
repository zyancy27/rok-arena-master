/**
 * Personal Trigger System
 *
 * Connects character history (Timeline, Story Logs) to present
 * environmental moments. Detects when world elements relate to
 * past experiences and generates subtle emotional resonance.
 *
 * Integrates with: Character Timeline, Lore Consistency Engine,
 * Story Orchestrator, Environment Memory.
 */

// ── Types ───────────────────────────────────────────────────────

export type TriggerCategory =
  | 'location' | 'symbol' | 'sound' | 'smell' | 'object'
  | 'faction' | 'phrase' | 'weather' | 'creature' | 'name';

export interface PersonalTrigger {
  id: string;
  characterId: string;
  category: TriggerCategory;
  /** Keywords that activate this trigger */
  keywords: string[];
  /** The original event this relates to */
  originEvent: string;
  /** Emotional weight of the memory (1-5) */
  emotionalWeight: number;
  /** Whether the memory is positive, negative, or complex */
  valence: 'positive' | 'negative' | 'complex';
  /** A subtle narrator line when triggered */
  resonanceLine: string;
  /** How many times this has been triggered (to avoid repetition) */
  triggerCount: number;
  /** Last turn triggered */
  lastTriggered: number;
}

export interface TriggerMatch {
  trigger: PersonalTrigger;
  matchedKeyword: string;
  /** Context in which the match occurred */
  matchContext: 'narration' | 'environment' | 'npc_dialogue' | 'player_action';
}

export interface PersonalTriggerState {
  characterId: string;
  triggers: PersonalTrigger[];
  /** Matches found this session */
  sessionMatches: TriggerMatch[];
  /** Maximum triggers to surface per session */
  maxPerSession: number;
}

// ── Resonance Line Templates ────────────────────────────────────

const RESONANCE_TEMPLATES: Record<TriggerCategory, Record<string, string[]>> = {
  location: {
    negative: [
      'Something about this place stirs a quiet memory you\'d rather forget.',
      'You\'ve stood somewhere like this before. The feeling is the same.',
    ],
    positive: [
      'This place carries a warmth that reminds you of somewhere safer.',
      'A sense of familiarity settles over you, gentle and unexpected.',
    ],
    complex: [
      'You\'ve been somewhere like this before. The memory doesn\'t simplify.',
      'Recognition and unease arrive together, like old companions.',
    ],
  },
  symbol: {
    negative: ['The symbol catches your eye before you can look away. Old instincts.'],
    positive: ['A familiar mark. It means something only you would understand.'],
    complex: ['You\'ve seen this symbol before. Its meaning has changed since then.'],
  },
  sound: {
    negative: ['A sound reaches you — familiar and unwelcome.'],
    positive: ['A sound from somewhere deep in memory. It brings unexpected comfort.'],
    complex: ['The sound echoes something half-forgotten. You listen longer than you mean to.'],
  },
  smell: {
    negative: ['The smell of smoke carries a strange familiarity.'],
    positive: ['A scent drifts past — something from a better time.'],
    complex: ['The air carries something — a memory, maybe. Hard to place.'],
  },
  object: {
    negative: ['Your eyes find it before your mind does. Recognition without wanting it.'],
    positive: ['An object that brings a quiet smile. No one else would understand why.'],
    complex: ['You\'ve seen something like this before. The context was different then.'],
  },
  faction: {
    negative: ['Their insignia triggers something immediate. Guard goes up.'],
    positive: ['You recognize the markings. Old allies, perhaps. Or at least, not enemies.'],
    complex: ['The faction colors carry weight. History is complicated.'],
  },
  phrase: {
    negative: ['The words land heavier than they should. Someone said that to you once.'],
    positive: ['A phrase that echoes something kind from long ago.'],
    complex: ['Those words. You\'ve heard them before, in a very different context.'],
  },
  weather: {
    negative: ['The weather shifts, and with it, a feeling you haven\'t had in a long time.'],
    positive: ['The sky reminds you of a day that mattered.'],
    complex: ['Something about the air carries a memory.'],
  },
  creature: {
    negative: ['The creature stirs something primal. A memory of survival.'],
    positive: ['A familiar creature. The sight is oddly comforting.'],
    complex: ['You\'ve encountered something like this before. The outcome was complicated.'],
  },
  name: {
    negative: ['That name. It lands like a stone in still water.'],
    positive: ['The name brings a warmth you weren\'t expecting.'],
    complex: ['A name from another life. You\'re not sure how to feel about hearing it.'],
  },
};

// ── Engine Functions ────────────────────────────────────────────

let triggerIdCounter = 0;

export function createTriggerState(characterId: string): PersonalTriggerState {
  return {
    characterId,
    triggers: [],
    sessionMatches: [],
    maxPerSession: 3,
  };
}

/** Build triggers from character timeline events. */
export function buildTriggersFromTimeline(
  state: PersonalTriggerState,
  timelineEvents: { event_title: string; event_description: string; emotional_weight: number; tags: string[] }[],
): PersonalTriggerState {
  const newTriggers: PersonalTrigger[] = [];

  for (const event of timelineEvents) {
    if (event.emotional_weight < 2) continue; // Only significant events

    const keywords = extractKeywords(event.event_title + ' ' + event.event_description);
    if (keywords.length === 0) continue;

    const category = detectCategory(event.tags, event.event_description);
    const valence = event.emotional_weight >= 4 ? 'complex'
      : /loss|death|betrayal|defeat|injury|trauma|fire|destruction/i.test(event.event_description) ? 'negative'
      : /victory|friendship|discovery|love|kindness|rescue|home/i.test(event.event_description) ? 'positive'
      : 'complex';

    const templates = RESONANCE_TEMPLATES[category]?.[valence] || RESONANCE_TEMPLATES[category]?.complex || [];
    const resonanceLine = templates.length > 0
      ? templates[Math.floor(Math.random() * templates.length)]
      : 'Something about this stirs a quiet memory.';

    newTriggers.push({
      id: `trigger_${++triggerIdCounter}`,
      characterId: state.characterId,
      category,
      keywords,
      originEvent: event.event_title,
      emotionalWeight: event.emotional_weight,
      valence,
      resonanceLine,
      triggerCount: 0,
      lastTriggered: 0,
    });
  }

  return {
    ...state,
    triggers: [...state.triggers, ...newTriggers].slice(-30), // cap
  };
}

/** Scan text for trigger matches. */
export function scanForTriggers(
  state: PersonalTriggerState,
  text: string,
  matchContext: TriggerMatch['matchContext'],
  currentTurn: number,
): { state: PersonalTriggerState; matches: TriggerMatch[] } {
  if (state.sessionMatches.length >= state.maxPerSession) {
    return { state, matches: [] };
  }

  const lower = text.toLowerCase();
  const matches: TriggerMatch[] = [];

  for (const trigger of state.triggers) {
    // Cooldown: don't trigger same thing too often
    if (trigger.lastTriggered > 0 && currentTurn - trigger.lastTriggered < 15) continue;
    if (trigger.triggerCount >= 5) continue; // Fade after too many triggers

    for (const keyword of trigger.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        matches.push({ trigger, matchedKeyword: keyword, matchContext });
        trigger.triggerCount++;
        trigger.lastTriggered = currentTurn;
        break;
      }
    }

    if (state.sessionMatches.length + matches.length >= state.maxPerSession) break;
  }

  return {
    state: {
      ...state,
      sessionMatches: [...state.sessionMatches, ...matches],
    },
    matches,
  };
}

/** Build narrator context. */
export function buildTriggerNarratorContext(state: PersonalTriggerState): string {
  if (state.triggers.length === 0) return '';

  const highWeight = state.triggers
    .filter(t => t.emotionalWeight >= 3 && t.triggerCount < 5)
    .slice(0, 5);

  if (highWeight.length === 0) return '';

  const parts: string[] = ['PERSONAL TRIGGERS (character history → present resonance):'];
  for (const t of highWeight) {
    parts.push(`- [${t.category}] keywords: ${t.keywords.slice(0, 3).join(', ')} → from "${t.originEvent}" (weight: ${t.emotionalWeight}/5, ${t.valence})`);
  }
  parts.push('If the current scene naturally contains these elements, weave the emotional resonance subtly.');
  parts.push('Do NOT force trigger moments. Let them arise naturally from the environment.');

  return parts.join('\n');
}

// ── Helpers ─────────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  const stops = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'was', 'is', 'are', 'were', 'been', 'be', 'has', 'had', 'have', 'do', 'does', 'did', 'it', 'its', 'this', 'that', 'from']);
  return text
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stops.has(w.toLowerCase()))
    .map(w => w.toLowerCase())
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 6);
}

function detectCategory(tags: string[], description: string): TriggerCategory {
  const text = (tags.join(' ') + ' ' + description).toLowerCase();
  if (/fire|smoke|burn|flame/i.test(text)) return 'smell';
  if (/temple|ruin|city|town|forest|mountain|cave|battlefield/i.test(text)) return 'location';
  if (/blade|sword|ring|amulet|book|shield/i.test(text)) return 'object';
  if (/faction|guild|order|army|clan/i.test(text)) return 'faction';
  if (/storm|rain|snow|thunder|wind/i.test(text)) return 'weather';
  if (/beast|creature|wolf|dragon|serpent/i.test(text)) return 'creature';
  if (/said|spoke|words|voice|promise|oath/i.test(text)) return 'phrase';
  return 'symbol';
}
