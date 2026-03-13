/**
 * Memory Weight System
 *
 * Determines which past events matter most to the character and
 * the world. Not all memories are equal — some become defining
 * moments, others fade. Weight influences how often and how
 * prominently events are referenced in narration.
 *
 * Integrates with: Character Timeline, Personal Trigger System,
 * Character Psychology Engine, Story Orchestrator, Echo System.
 */

// ── Types ───────────────────────────────────────────────────────

export type MemorySignificance = 'defining' | 'major' | 'notable' | 'minor' | 'fading';

export interface WeightedMemory {
  id: string;
  /** Source event description */
  event: string;
  /** Character or 'world' */
  owner: string;
  /** Calculated weight (0-100) */
  weight: number;
  /** Significance tier */
  significance: MemorySignificance;
  /** What made it significant */
  factors: MemoryFactor[];
  /** How many times the narrator has referenced this */
  referenceCount: number;
  /** Last turn referenced */
  lastReferenced: number;
  /** Turn the memory was formed */
  formedAt: number;
  /** Keywords for matching */
  keywords: string[];
  /** Whether this was a first-time experience */
  isFirstTime: boolean;
  /** Emotional valence */
  valence: 'positive' | 'negative' | 'complex' | 'neutral';
}

export type MemoryFactor =
  | 'emotional_intensity'    // Strong emotions during the event
  | 'first_experience'      // First time encountering something
  | 'relationship_change'   // Changed a key relationship
  | 'identity_revelation'   // Revealed something about the character
  | 'survival_threat'       // Life was at stake
  | 'loss'                  // Something valuable was lost
  | 'victory'               // A significant achievement
  | 'betrayal'              // Trust was broken
  | 'sacrifice'             // Something was given up
  | 'discovery'             // Something new was found/learned
  | 'world_impact'          // Changed the world meaningfully
  | 'moral_choice'          // A difficult ethical decision
  | 'witnessed_death'       // Saw someone die
  | 'promise_made'          // A commitment was made
  | 'fear_confronted';      // Faced something feared

export interface MemoryWeightState {
  characterId: string;
  memories: WeightedMemory[];
  /** Defining moments (top memories that shape the character) */
  definingMoments: string[];
  /** Total memories processed */
  totalProcessed: number;
}

// ── Factor Weights ──────────────────────────────────────────────

const FACTOR_WEIGHTS: Record<MemoryFactor, number> = {
  emotional_intensity: 15,
  first_experience: 20,
  relationship_change: 18,
  identity_revelation: 22,
  survival_threat: 16,
  loss: 20,
  victory: 12,
  betrayal: 25,
  sacrifice: 22,
  discovery: 10,
  world_impact: 14,
  moral_choice: 18,
  witnessed_death: 20,
  promise_made: 15,
  fear_confronted: 18,
};

// ── Factor Detection ────────────────────────────────────────────

const FACTOR_PATTERNS: Record<MemoryFactor, RegExp> = {
  emotional_intensity: /\b(rage|grief|joy|terror|ecstasy|despair|overwhelming|shattered|transformed)\b/i,
  first_experience: /\b(first time|never before|for the first|maiden|debut|initial|virgin)\b/i,
  relationship_change: /\b(betray|friendship|love|enemy|ally|bond|trust.*broken|new.*companion)\b/i,
  identity_revelation: /\b(realize|discover about|true self|who.*really|revelation|understand.*now)\b/i,
  survival_threat: /\b(nearly died|almost killed|barely survived|death.*close|life.*danger)\b/i,
  loss: /\b(lost|death of|gone forever|taken away|destroyed|fell|perished)\b/i,
  victory: /\b(victory|triumph|conquered|defeated|won|overcame|succeeded)\b/i,
  betrayal: /\b(betray|backstab|deceive|lied|false|traitor|turncoat)\b/i,
  sacrifice: /\b(sacrifice|gave up|surrendered|cost.*everything|paid.*price|lost.*to save)\b/i,
  discovery: /\b(discover|found|reveal|uncover|hidden|secret|ancient)\b/i,
  world_impact: /\b(changed.*world|kingdom|city.*fell|war.*began|peace|treaty|destruction)\b/i,
  moral_choice: /\b(choose|decision|dilemma|right.*wrong|moral|ethical|impossible choice)\b/i,
  witnessed_death: /\b(watched.*die|saw.*fall|witnessed.*death|killed before|dying.*eyes)\b/i,
  promise_made: /\b(promise|swear|oath|vow|commitment|pledge|gave.*word)\b/i,
  fear_confronted: /\b(face.*fear|confront|overcome.*terror|stood against|despite.*afraid)\b/i,
};

// ── Engine Functions ────────────────────────────────────────────

let memoryIdCounter = 0;

export function createMemoryWeightState(characterId: string): MemoryWeightState {
  return {
    characterId,
    memories: [],
    definingMoments: [],
    totalProcessed: 0,
  };
}

/** Detect memory factors from an event description. */
export function detectMemoryFactors(eventText: string): MemoryFactor[] {
  const factors: MemoryFactor[] = [];
  for (const [factor, pattern] of Object.entries(FACTOR_PATTERNS) as [MemoryFactor, RegExp][]) {
    if (pattern.test(eventText)) factors.push(factor);
  }
  return factors;
}

/** Calculate weight from factors. */
export function calculateWeight(factors: MemoryFactor[]): number {
  if (factors.length === 0) return 5;
  const raw = factors.reduce((sum, f) => sum + FACTOR_WEIGHTS[f], 0);
  return Math.min(100, raw);
}

/** Determine significance tier. */
export function getSignificance(weight: number): MemorySignificance {
  if (weight >= 70) return 'defining';
  if (weight >= 50) return 'major';
  if (weight >= 30) return 'notable';
  if (weight >= 15) return 'minor';
  return 'fading';
}

/** Record a new memory. */
export function recordMemory(
  state: MemoryWeightState,
  event: string,
  turnNumber: number,
  additionalFactors?: MemoryFactor[],
  valence: WeightedMemory['valence'] = 'neutral',
): MemoryWeightState {
  const autoFactors = detectMemoryFactors(event);
  const allFactors = [...new Set([...autoFactors, ...(additionalFactors || [])])];
  const weight = calculateWeight(allFactors);
  const significance = getSignificance(weight);

  const keywords = event
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 4)
    .map(w => w.toLowerCase())
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 6);

  const memory: WeightedMemory = {
    id: `mem_${++memoryIdCounter}`,
    event: event.slice(0, 200),
    owner: state.characterId,
    weight,
    significance,
    factors: allFactors,
    referenceCount: 0,
    lastReferenced: 0,
    formedAt: turnNumber,
    keywords,
    isFirstTime: allFactors.includes('first_experience'),
    valence,
  };

  const memories = [...state.memories, memory]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 50); // cap

  const definingMoments = memories
    .filter(m => m.significance === 'defining')
    .map(m => m.event)
    .slice(0, 5);

  return {
    ...state,
    memories,
    definingMoments,
    totalProcessed: state.totalProcessed + 1,
  };
}

/** Apply time decay — memories fade unless reinforced. */
export function decayMemories(state: MemoryWeightState, currentTurn: number): MemoryWeightState {
  const memories = state.memories.map(m => {
    const age = currentTurn - m.formedAt;
    // Defining moments barely decay. Minor ones decay faster.
    const decayRate = m.significance === 'defining' ? 0.05
      : m.significance === 'major' ? 0.15
      : m.significance === 'notable' ? 0.3
      : 0.5;

    const decay = Math.floor(age / 20) * decayRate;
    const newWeight = Math.max(m.significance === 'defining' ? 60 : 0, m.weight - decay);

    return { ...m, weight: newWeight, significance: getSignificance(newWeight) };
  }).filter(m => m.weight > 0);

  return { ...state, memories };
}

/** Mark a memory as referenced by the narrator. */
export function referenceMemory(
  state: MemoryWeightState,
  memoryId: string,
  currentTurn: number,
): MemoryWeightState {
  const memories = state.memories.map(m =>
    m.id === memoryId
      ? { ...m, referenceCount: m.referenceCount + 1, lastReferenced: currentTurn, weight: Math.min(100, m.weight + 3) }
      : m,
  );
  return { ...state, memories };
}

/** Find memories relevant to current context. */
export function findRelevantMemories(
  state: MemoryWeightState,
  contextText: string,
  maxResults = 3,
): WeightedMemory[] {
  const lower = contextText.toLowerCase();
  return state.memories
    .filter(m => m.keywords.some(k => lower.includes(k)))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxResults);
}

/** Get defining moments. */
export function getDefiningMoments(state: MemoryWeightState): WeightedMemory[] {
  return state.memories.filter(m => m.significance === 'defining');
}

/** Build narrator context. */
export function buildMemoryWeightContext(state: MemoryWeightState): string {
  if (state.memories.length === 0) return '';

  const parts: string[] = ['MEMORY WEIGHT (which past events matter most):'];

  const defining = state.memories.filter(m => m.significance === 'defining');
  if (defining.length > 0) {
    parts.push('DEFINING MOMENTS (shape everything):');
    for (const m of defining.slice(0, 3)) {
      const factorStr = m.factors.slice(0, 3).map(f => f.replace(/_/g, ' ')).join(', ');
      parts.push(`- "${m.event}" (weight: ${Math.round(m.weight)}, factors: ${factorStr})`);
    }
  }

  const major = state.memories.filter(m => m.significance === 'major');
  if (major.length > 0) {
    parts.push('Major memories:');
    for (const m of major.slice(0, 3)) {
      parts.push(`- "${m.event}" (weight: ${Math.round(m.weight)})`);
    }
  }

  parts.push('Reference defining moments when contextually appropriate. Don\'t force them.');
  parts.push('Heavier memories surface more naturally. Lighter ones fade unless reinforced.');

  return parts.join('\n');
}
