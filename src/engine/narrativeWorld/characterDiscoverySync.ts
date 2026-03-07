/**
 * System 11 — Character Discovery Sync
 *
 * When narrative events reveal new aspects of a character (personality traits,
 * backstory details, abilities, mentality patterns), this system classifies
 * those discoveries and maps them to the appropriate character sheet fields
 * so they can be persisted back to the character's creation/edit form.
 *
 * Integrates with:
 * • Narrative Pressure Engine (acknowledged pressure events)
 * • Character Signature Interactions (behavioral patterns)
 * • Discovery Moments (rare finds → lore/abilities)
 * • Character Discovery Prompts (player responses)
 * • Environment Memory (contextual backstory)
 */

import type {
  SignaturePattern,
  CharacterSignatureProfile,
  DiscoveryMoment,
  NarrativePressureType,
} from './types';

// ── Types ───────────────────────────────────────────────────────

/** Character sheet fields that can receive discovered content */
export type DiscoverableField =
  | 'personality'
  | 'mentality'
  | 'lore'
  | 'abilities'
  | 'powers'
  | 'weapons_items';

export interface CharacterDiscovery {
  id: string;
  characterId: string;
  /** Which character sheet field this maps to */
  targetField: DiscoverableField;
  /** The discovered content to append */
  content: string;
  /** Source system that produced this discovery */
  source: DiscoverySource;
  /** Context about when/where this was discovered */
  context: string;
  /** Timestamp of discovery */
  discoveredAt: string;
  /** Whether this has been synced to the character sheet */
  synced: boolean;
}

export type DiscoverySource =
  | 'pressure_response'    // Player responded to a narrative pressure event
  | 'signature_pattern'    // Behavioral pattern became dominant
  | 'discovery_moment'     // Rare discovery yielded lore/item info
  | 'player_dialogue'      // Player wrote something revealing
  | 'prompt_response'      // Player responded to a discovery prompt
  | 'environment_reaction'; // Player reacted to environment in character

export interface DiscoverySyncState {
  discoveries: CharacterDiscovery[];
  pendingSync: CharacterDiscovery[];
  totalDiscovered: number;
}

// ── Field Classification ────────────────────────────────────────

/** Maps narrative pressure types to the most appropriate character field */
const PRESSURE_FIELD_MAP: Record<NarrativePressureType, DiscoverableField> = {
  moral: 'personality',
  risk: 'mentality',
  curiosity: 'personality',
  emotional: 'lore',
  identity: 'mentality',
};

/** Maps signature patterns to character fields */
const PATTERN_FIELD_MAP: Record<SignaturePattern, DiscoverableField> = {
  stealth: 'mentality',
  investigation: 'personality',
  aggression: 'mentality',
  protection: 'personality',
  diplomacy: 'personality',
  exploration: 'personality',
  destruction: 'mentality',
};

/** Keywords that indicate specific field relevance in player text */
const FIELD_KEYWORDS: Record<DiscoverableField, RegExp> = {
  personality: /kind|gentle|ruthless|cold|warm|friendly|reserved|curious|brave|coward|loyal|betray|trust|care|love|hate|fear|proud|humble/i,
  mentality: /strategy|tactical|reckless|careful|patient|impulsive|calculating|focused|aggressive|defensive|cautious|bold|methodical|instinct/i,
  lore: /remember|past|home|family|origin|childhood|trained|learned|village|kingdom|mentor|father|mother|born|grew up|once was|long ago|before/i,
  abilities: /ability|technique|power|skill|move|learned to|can now|discovered|mastered|awakened|unlocked/i,
  powers: /energy|force|element|magic|aura|transform|channel|summon|manifest|wield/i,
  weapons_items: /weapon|sword|blade|shield|armor|tool|device|artifact|relic|found|carries|wields|equipped/i,
};

// ── State Management ────────────────────────────────────────────

let _discoveryId = 0;
function uid(): string {
  return `disc_${Date.now().toString(36)}_${(++_discoveryId).toString(36)}`;
}

export function createDiscoverySyncState(): DiscoverySyncState {
  return {
    discoveries: [],
    pendingSync: [],
    totalDiscovered: 0,
  };
}

// ── Classification Engine ───────────────────────────────────────

/**
 * Classify which character sheet field a piece of text best belongs to.
 * Returns the field with the strongest keyword match, or a fallback.
 */
export function classifyField(
  text: string,
  fallback: DiscoverableField = 'personality',
): DiscoverableField {
  let bestField = fallback;
  let bestScore = 0;

  for (const [field, regex] of Object.entries(FIELD_KEYWORDS) as [DiscoverableField, RegExp][]) {
    const matches = text.match(new RegExp(regex.source, 'gi'));
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestField = field;
    }
  }

  return bestField;
}

/**
 * Format a discovery entry to be appended to a character field.
 * Adds a date tag and source context for traceability.
 */
export function formatDiscoveryEntry(discovery: CharacterDiscovery): string {
  const date = new Date(discovery.discoveredAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `[Discovered ${date}] ${discovery.content}`;
}

// ── Discovery Generators ────────────────────────────────────────

/**
 * Generate a discovery from a player's response to a narrative pressure event.
 */
export function discoverFromPressureResponse(
  state: DiscoverySyncState,
  characterId: string,
  pressureType: NarrativePressureType,
  playerResponse: string,
  context: string,
): { state: DiscoverySyncState; discovery: CharacterDiscovery } {
  const targetField = classifyField(playerResponse, PRESSURE_FIELD_MAP[pressureType]);

  const discovery: CharacterDiscovery = {
    id: uid(),
    characterId,
    targetField,
    content: extractDiscoveryContent(playerResponse, pressureType),
    source: 'pressure_response',
    context,
    discoveredAt: new Date().toISOString(),
    synced: false,
  };

  return addDiscovery(state, discovery);
}

/**
 * Generate a discovery when a behavioral pattern becomes dominant.
 */
export function discoverFromSignaturePattern(
  state: DiscoverySyncState,
  profile: CharacterSignatureProfile,
  threshold = 5,
): { state: DiscoverySyncState; discovery: CharacterDiscovery } | null {
  // Only trigger when a pattern crosses the threshold
  const dominantCount = profile.patterns[profile.dominantPattern];
  if (dominantCount < threshold) return null;

  // Check we haven't already discovered this pattern
  const alreadyDiscovered = state.discoveries.some(
    d => d.characterId === profile.characterId
      && d.source === 'signature_pattern'
      && d.content.includes(profile.dominantPattern),
  );
  if (alreadyDiscovered) return null;

  const targetField = PATTERN_FIELD_MAP[profile.dominantPattern];
  const content = buildPatternDiscovery(profile.dominantPattern, dominantCount);

  const discovery: CharacterDiscovery = {
    id: uid(),
    characterId: profile.characterId,
    targetField,
    content,
    source: 'signature_pattern',
    context: `Behavioral pattern "${profile.dominantPattern}" observed ${dominantCount} times`,
    discoveredAt: new Date().toISOString(),
    synced: false,
  };

  return addDiscovery(state, discovery);
}

/**
 * Generate a discovery from a rare discovery moment (System 8).
 */
export function discoverFromMoment(
  state: DiscoverySyncState,
  characterId: string,
  moment: DiscoveryMoment,
): { state: DiscoverySyncState; discovery: CharacterDiscovery } {
  // Map moment types to fields
  const fieldMap: Record<string, DiscoverableField> = {
    hidden_entrance: 'lore',
    forgotten_item: 'weapons_items',
    secret_path: 'lore',
    ancient_relic: 'weapons_items',
    hidden_message: 'lore',
    buried_cache: 'weapons_items',
  };

  const targetField = fieldMap[moment.type] ?? 'lore';

  const discovery: CharacterDiscovery = {
    id: uid(),
    characterId,
    targetField,
    content: `${moment.name}: ${moment.description}`,
    source: 'discovery_moment',
    context: `${moment.rarity} discovery in ${moment.zoneId ?? 'unknown zone'}`,
    discoveredAt: new Date().toISOString(),
    synced: false,
  };

  return addDiscovery(state, discovery);
}

/**
 * Analyze free-form player dialogue and extract character-relevant discoveries.
 */
export function discoverFromDialogue(
  state: DiscoverySyncState,
  characterId: string,
  playerText: string,
  zoneContext: string,
): { state: DiscoverySyncState; discovery: CharacterDiscovery } | null {
  // Only extract discoveries from substantial text with clear character signals
  if (playerText.length < 30) return null;

  const field = classifyField(playerText);
  const content = extractDialogueDiscovery(playerText, field);
  if (!content) return null;

  const discovery: CharacterDiscovery = {
    id: uid(),
    characterId,
    targetField: field,
    content,
    source: 'player_dialogue',
    context: zoneContext,
    discoveredAt: new Date().toISOString(),
    synced: false,
  };

  return addDiscovery(state, discovery);
}

// ── Sync Helpers ────────────────────────────────────────────────

/**
 * Get all pending (unsynced) discoveries for a character, grouped by field.
 */
export function getPendingDiscoveries(
  state: DiscoverySyncState,
  characterId: string,
): Record<DiscoverableField, CharacterDiscovery[]> {
  const result: Record<DiscoverableField, CharacterDiscovery[]> = {
    personality: [],
    mentality: [],
    lore: [],
    abilities: [],
    powers: [],
    weapons_items: [],
  };

  for (const d of state.pendingSync) {
    if (d.characterId === characterId) {
      result[d.targetField].push(d);
    }
  }

  return result;
}

/**
 * Build the update payload to append discoveries to existing character fields.
 * Returns a partial record of field → new appended value.
 */
export function buildFieldUpdates(
  pendingByField: Record<DiscoverableField, CharacterDiscovery[]>,
  currentFields: Partial<Record<DiscoverableField, string | null>>,
): Partial<Record<DiscoverableField, string>> {
  const updates: Partial<Record<DiscoverableField, string>> = {};

  for (const [field, discoveries] of Object.entries(pendingByField) as [DiscoverableField, CharacterDiscovery[]][]) {
    if (discoveries.length === 0) continue;

    const existingValue = currentFields[field] ?? '';
    const newEntries = discoveries.map(formatDiscoveryEntry).join('\n');
    const separator = existingValue.trim() ? '\n\n' : '';

    updates[field] = `${existingValue}${separator}${newEntries}`;
  }

  return updates;
}

/**
 * Mark discoveries as synced after successful database update.
 */
export function markSynced(
  state: DiscoverySyncState,
  discoveryIds: string[],
): DiscoverySyncState {
  const idSet = new Set(discoveryIds);
  return {
    ...state,
    discoveries: state.discoveries.map(d =>
      idSet.has(d.id) ? { ...d, synced: true } : d,
    ),
    pendingSync: state.pendingSync.filter(d => !idSet.has(d.id)),
  };
}

// ── Internal Helpers ────────────────────────────────────────────

function addDiscovery(
  state: DiscoverySyncState,
  discovery: CharacterDiscovery,
): { state: DiscoverySyncState; discovery: CharacterDiscovery } {
  return {
    state: {
      discoveries: [...state.discoveries, discovery],
      pendingSync: [...state.pendingSync, discovery],
      totalDiscovered: state.totalDiscovered + 1,
    },
    discovery,
  };
}

function extractDiscoveryContent(
  playerResponse: string,
  pressureType: NarrativePressureType,
): string {
  // Build a concise trait description from the player's response
  const prefixes: Record<NarrativePressureType, string> = {
    moral: 'Showed moral instinct:',
    risk: 'Under pressure, chose to:',
    curiosity: 'Driven by curiosity:',
    emotional: 'Revealed emotional depth:',
    identity: 'Expressed core identity:',
  };

  // Take the first meaningful sentence from the response
  const sentences = playerResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const summary = sentences.length > 0
    ? sentences[0].trim().slice(0, 120)
    : playerResponse.trim().slice(0, 120);

  return `${prefixes[pressureType]} ${summary}`;
}

function buildPatternDiscovery(pattern: SignaturePattern, count: number): string {
  const descriptions: Record<SignaturePattern, string> = {
    stealth: 'Prefers operating from the shadows; avoids direct confrontation when possible.',
    investigation: 'Naturally curious; tends to examine surroundings and investigate details before acting.',
    aggression: 'Favors direct, forceful action; engages threats head-on without hesitation.',
    protection: 'Instinctively shields others; prioritizes the safety of allies and innocents.',
    diplomacy: 'Seeks dialogue and resolution; prefers words over violence when the option exists.',
    exploration: 'Drawn to uncharted paths; explores freely and embraces the unknown.',
    destruction: 'Tends toward environmental impact; breaks through obstacles rather than navigating around them.',
  };

  return `${descriptions[pattern]} (Observed across ${count} interactions)`;
}

function extractDialogueDiscovery(
  text: string,
  field: DiscoverableField,
): string | null {
  // Look for first-person narrative statements that reveal character traits
  const firstPersonPatterns = [
    /I (?:always|never|used to|once|remember|believe|refuse|can't|won't|choose to)\b[^.!?]{10,80}/i,
    /my (?:family|home|people|village|training|past|mentor|father|mother)\b[^.!?]{10,80}/i,
    /where I (?:come from|grew up|was born|learned|trained)\b[^.!?]{10,80}/i,
  ];

  for (const pattern of firstPersonPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  // For non-first-person, only extract if we have strong keyword confidence
  const keywords = FIELD_KEYWORDS[field];
  const matches = text.match(new RegExp(keywords.source, 'gi'));
  if (matches && matches.length >= 2) {
    // Extract the sentence containing the most keyword hits
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    let bestSentence = '';
    let bestCount = 0;
    for (const sentence of sentences) {
      const count = (sentence.match(new RegExp(keywords.source, 'gi')) || []).length;
      if (count > bestCount) {
        bestCount = count;
        bestSentence = sentence.trim();
      }
    }
    if (bestSentence) return bestSentence.slice(0, 150);
  }

  return null;
}
