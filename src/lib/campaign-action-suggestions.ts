/**
 * Campaign Action Suggestions
 *
 * Generates contextual suggestion chips for campaign chat input.
 * Derived from scene context, character identity, and campaign state.
 * Does NOT replace free-text input — purely optional assistive layer.
 */

export interface ActionSuggestion {
  id: string;
  label: string;
  /** Full text to insert or use as prompt */
  fullText: string;
  /** Category for styling */
  category: 'combat' | 'social' | 'explore' | 'stealth' | 'utility' | 'move' | 'observe';
  /** Priority for ordering (higher = more relevant) */
  priority: number;
}

// ─── Context Shape ──────────────────────────────────────────────

interface SuggestionContext {
  currentZone?: string;
  timeOfDay?: string;
  dayCount?: number;
  characterName?: string;
  characterPowers?: string | null;
  characterWeapons?: string | null;
  partyMembers?: string[];
  nearbyNpcs?: string[];
  campaignStatus?: string;
  environmentTags?: string[];
  recentMessages?: string[];
  hasCombatTarget?: boolean;
  isInDanger?: boolean;
  currentPressure?: string | null;
}

// ─── Suggestion Generation ──────────────────────────────────────

const BASE_EXPLORE_SUGGESTIONS: Omit<ActionSuggestion, 'id'>[] = [
  { label: '👀 Look around', fullText: 'I look around carefully, taking in my surroundings.', category: 'observe', priority: 5 },
  { label: '🗣️ Talk to someone', fullText: 'I approach the nearest person and try to start a conversation.', category: 'social', priority: 4 },
  { label: '🔍 Search the area', fullText: 'I search the area thoroughly for anything useful or hidden.', category: 'explore', priority: 4 },
  { label: '🚶 Move on', fullText: 'I continue moving forward, staying alert.', category: 'move', priority: 3 },
];

const COMBAT_SUGGESTIONS: Omit<ActionSuggestion, 'id'>[] = [
  { label: '⚔️ Attack', fullText: 'I attack the nearest threat with everything I have.', category: 'combat', priority: 8 },
  { label: '🛡️ Defend', fullText: 'I take a defensive stance and brace for the incoming attack.', category: 'combat', priority: 7 },
  { label: '💨 Dodge', fullText: 'I try to dodge out of the way.', category: 'combat', priority: 6 },
  { label: '🏃 Reposition', fullText: 'I quickly reposition to gain a tactical advantage.', category: 'move', priority: 5 },
];

const DANGER_SUGGESTIONS: Omit<ActionSuggestion, 'id'>[] = [
  { label: '⚡ Stay alert', fullText: 'I stay alert, scanning for threats and keeping my guard up.', category: 'observe', priority: 7 },
  { label: '🤫 Hide', fullText: 'I try to find cover and stay hidden.', category: 'stealth', priority: 6 },
  { label: '🏃 Fall back', fullText: 'I carefully retreat to a safer position.', category: 'move', priority: 5 },
];

const SOCIAL_SUGGESTIONS: Omit<ActionSuggestion, 'id'>[] = [
  { label: '🤝 Negotiate', fullText: 'I try to negotiate a deal that works for both sides.', category: 'social', priority: 6 },
  { label: '😤 Intimidate', fullText: 'I lean in and let them know I\'m not someone to cross.', category: 'social', priority: 5 },
  { label: '🎭 Deceive', fullText: 'I craft a believable story to get what I need.', category: 'social', priority: 4 },
  { label: '😊 Charm', fullText: 'I put on my most charming face and try to win them over.', category: 'social', priority: 4 },
];

const NIGHT_SUGGESTIONS: Omit<ActionSuggestion, 'id'>[] = [
  { label: '🏕️ Make camp', fullText: 'I find a suitable spot and set up camp for the night.', category: 'utility', priority: 6 },
  { label: '👁️ Keep watch', fullText: 'I stay awake and keep watch while others rest.', category: 'observe', priority: 5 },
  { label: '🤫 Move quietly', fullText: 'I move carefully through the darkness, staying quiet.', category: 'stealth', priority: 5 },
];

/**
 * Generate contextual action suggestions based on current campaign state.
 * Returns 3-5 most relevant suggestions.
 */
export function generateActionSuggestions(ctx: SuggestionContext): ActionSuggestion[] {
  const pool: Omit<ActionSuggestion, 'id'>[] = [];

  // Always include basic explore options
  pool.push(...BASE_EXPLORE_SUGGESTIONS);

  // Combat context
  if (ctx.hasCombatTarget) {
    pool.push(...COMBAT_SUGGESTIONS);
  }

  // Danger context
  if (ctx.isInDanger || ctx.currentPressure === 'critical' || ctx.currentPressure === 'high') {
    pool.push(...DANGER_SUGGESTIONS);
  }

  // Social context (NPCs nearby)
  if (ctx.nearbyNpcs && ctx.nearbyNpcs.length > 0) {
    pool.push(...SOCIAL_SUGGESTIONS.map(s => ({
      ...s,
      priority: s.priority + 1, // Boost social when NPCs are present
    })));
  }

  // Night time
  if (ctx.timeOfDay === 'night' || ctx.timeOfDay === 'late_night') {
    pool.push(...NIGHT_SUGGESTIONS);
  }

  // Environment-specific
  if (ctx.environmentTags?.some(t => /forest|jungle|wild/i.test(t))) {
    pool.push({
      label: '🌿 Forage',
      fullText: 'I search the area for useful plants, herbs, or natural resources.',
      category: 'explore',
      priority: 4,
    });
  }
  if (ctx.environmentTags?.some(t => /ruin|dungeon|cave|temple/i.test(t))) {
    pool.push({
      label: '🔦 Investigate deeper',
      fullText: 'I carefully explore deeper into the structure, watching for traps.',
      category: 'explore',
      priority: 5,
    });
  }

  // Character power references
  if (ctx.characterPowers) {
    pool.push({
      label: '✨ Use my power',
      fullText: 'I channel my abilities to deal with the situation.',
      category: 'utility',
      priority: 5,
    });
  }

  // Weapon references
  if (ctx.characterWeapons) {
    pool.push({
      label: '🗡️ Draw weapon',
      fullText: 'I ready my weapon and prepare for action.',
      category: 'combat',
      priority: 4,
    });
  }

  // Sort by priority, deduplicate by label, take top 5
  const sorted = pool
    .sort((a, b) => b.priority - a.priority)
    .filter((s, i, arr) => arr.findIndex(x => x.label === s.label) === i)
    .slice(0, 5);

  return sorted.map((s, i) => ({
    ...s,
    id: `suggestion-${i}-${Date.now()}`,
  }));
}

// ─── "Help me phrase this" support ──────────────────────────────

/**
 * Takes a rough/unclear player input and returns a cleaner phrased version.
 * This is a client-side heuristic helper — not AI-powered.
 */
export function helpPhraseAction(roughInput: string, characterName?: string): string | null {
  const lower = roughInput.trim().toLowerCase();
  if (!lower || lower.length > 200) return null;

  // If already well-formed (starts with "I" + verb or is a quoted speech), skip
  if (/^i\s+(try|attempt|go|move|attack|look|search|say|tell|ask|grab|run)/i.test(lower)) return null;
  if (/^["']/.test(lower)) return null;

  // Bare verb — prefix with "I"
  if (/^(look|search|attack|hit|run|hide|talk|walk|move|climb|jump|dodge|block|push|pull|open|close|listen|wait|rest|eat|drink)/i.test(lower)) {
    return `I ${roughInput.trim().toLowerCase()}.`;
  }

  // Single word or fragment — wrap as action attempt
  if (lower.split(/\s+/).length <= 3 && !/[.!?]$/.test(lower)) {
    return `I try to ${roughInput.trim().toLowerCase()}.`;
  }

  return null;
}
