/**
 * Narrative Thread Engine
 *
 * Tracks unresolved story tensions so the narrator can build
 * coherent arcs across scenes. Threads grow from seeds through
 * escalation to climax and resolution based on player actions.
 */

// ── Types ───────────────────────────────────────────────────────

export type ThreadType = 'mystery' | 'threat' | 'character' | 'world' | 'moral';
export type ThreadStatus = 'seed' | 'active' | 'escalating' | 'climax' | 'resolved';

export interface NarrativeThread {
  threadId: string;
  title: string;
  type: ThreadType;
  status: ThreadStatus;
  importance: number; // 1-10
  tags: string[];
  introducedScene: number;
  lastUpdatedScene: number;
  escalationLevel: number; // 0-4 maps to status progression
  escalationNotes: string[]; // breadcrumb descriptions per level
  relatedCharacterIds: string[];
}

export interface ThreadEngineState {
  threads: NarrativeThread[];
  currentScene: number;
  resolvedCount: number;
}

export interface ThreadDetectionContext {
  playerAction: string;
  environmentTags: string[];
  activeHazards: string[];
  npcPresent: string[];
  currentZone: string;
  characterTags: string[];
}

// ── State Factory ───────────────────────────────────────────────

export function createThreadEngineState(startScene = 1): ThreadEngineState {
  return { threads: [], currentScene: startScene, resolvedCount: 0 };
}

// ── Core Operations ─────────────────────────────────────────────

let _nextId = 1;

export function seedThread(
  state: ThreadEngineState,
  title: string,
  type: ThreadType,
  tags: string[],
  importance = 5,
  characterIds: string[] = [],
): NarrativeThread {
  const thread: NarrativeThread = {
    threadId: `thread_${Date.now()}_${_nextId++}`,
    title,
    type,
    status: 'seed',
    importance,
    tags,
    introducedScene: state.currentScene,
    lastUpdatedScene: state.currentScene,
    escalationLevel: 0,
    escalationNotes: [title],
    relatedCharacterIds: characterIds,
  };
  state.threads.push(thread);
  return thread;
}

export function escalateThread(
  state: ThreadEngineState,
  threadId: string,
  note: string,
  importanceBoost = 1,
): NarrativeThread | null {
  const thread = state.threads.find(t => t.threadId === threadId);
  if (!thread || thread.status === 'resolved') return null;

  thread.escalationLevel = Math.min(thread.escalationLevel + 1, 4);
  thread.escalationNotes.push(note);
  thread.importance = Math.min(thread.importance + importanceBoost, 10);
  thread.lastUpdatedScene = state.currentScene;

  const statusMap: ThreadStatus[] = ['seed', 'active', 'escalating', 'climax', 'resolved'];
  thread.status = statusMap[Math.min(thread.escalationLevel, 4)];

  if (thread.status === 'resolved') {
    state.resolvedCount++;
  }

  return thread;
}

export function resolveThread(
  state: ThreadEngineState,
  threadId: string,
  resolutionNote: string,
): NarrativeThread | null {
  const thread = state.threads.find(t => t.threadId === threadId);
  if (!thread || thread.status === 'resolved') return null;

  thread.status = 'resolved';
  thread.escalationLevel = 4;
  thread.escalationNotes.push(resolutionNote);
  thread.lastUpdatedScene = state.currentScene;
  state.resolvedCount++;
  return thread;
}

export function advanceScene(state: ThreadEngineState): void {
  state.currentScene++;
}

// ── Queries ─────────────────────────────────────────────────────

export function getActiveThreads(state: ThreadEngineState): NarrativeThread[] {
  return state.threads.filter(t => t.status !== 'resolved');
}

export function getEscalatingThreads(state: ThreadEngineState): NarrativeThread[] {
  return state.threads.filter(t => t.status === 'escalating' || t.status === 'climax');
}

export function getStaleThreads(state: ThreadEngineState, sceneStaleness = 5): NarrativeThread[] {
  return state.threads.filter(
    t => t.status !== 'resolved' && (state.currentScene - t.lastUpdatedScene) >= sceneStaleness,
  );
}

export function getThreadsByType(state: ThreadEngineState, type: ThreadType): NarrativeThread[] {
  return state.threads.filter(t => t.type === type && t.status !== 'resolved');
}

export function getThreadsByTag(state: ThreadEngineState, tag: string): NarrativeThread[] {
  return state.threads.filter(t => t.tags.includes(tag) && t.status !== 'resolved');
}

// ── Thread Detection Heuristics ─────────────────────────────────

const THREAD_HINTS: { keywords: string[]; type: ThreadType; titleTemplate: string }[] = [
  { keywords: ['strange', 'mysterious', 'unknown', 'hidden', 'secret'], type: 'mystery', titleTemplate: 'Mysterious {0}' },
  { keywords: ['danger', 'attack', 'enemy', 'threat', 'hostile', 'dark'], type: 'threat', titleTemplate: 'Emerging threat: {0}' },
  { keywords: ['corrupt', 'decay', 'poison', 'blight', 'disease'], type: 'world', titleTemplate: 'World affliction: {0}' },
  { keywords: ['betray', 'trust', 'loyalty', 'oath', 'promise'], type: 'moral', titleTemplate: 'Moral tension: {0}' },
  { keywords: ['memory', 'past', 'regret', 'loss', 'family'], type: 'character', titleTemplate: 'Personal thread: {0}' },
];

export function detectPossibleThreads(
  ctx: ThreadDetectionContext,
  existingTags: string[],
): { title: string; type: ThreadType; tags: string[] }[] {
  const combined = [ctx.playerAction, ...ctx.environmentTags, ...ctx.activeHazards, ...ctx.characterTags]
    .join(' ')
    .toLowerCase();

  const suggestions: { title: string; type: ThreadType; tags: string[] }[] = [];

  for (const hint of THREAD_HINTS) {
    const matched = hint.keywords.filter(k => combined.includes(k));
    if (matched.length > 0 && !existingTags.some(t => matched.includes(t))) {
      suggestions.push({
        title: hint.titleTemplate.replace('{0}', ctx.currentZone),
        type: hint.type,
        tags: matched,
      });
    }
  }

  return suggestions;
}

// ── Narrator Context Builder ────────────────────────────────────

export function buildThreadNarratorContext(state: ThreadEngineState): string {
  const active = getActiveThreads(state);
  if (active.length === 0) return '';

  const sorted = [...active].sort((a, b) => b.importance - a.importance);
  const lines: string[] = ['Active narrative threads:'];

  for (const t of sorted.slice(0, 6)) {
    const stale = state.currentScene - t.lastUpdatedScene >= 3;
    const staleTag = stale ? ' [STALE — needs attention]' : '';
    const latest = t.escalationNotes[t.escalationNotes.length - 1];
    lines.push(
      `• "${t.title}" (${t.type}, ${t.status}, importance ${t.importance}/10)${staleTag} — latest: ${latest}`,
    );
  }

  const escalating = getEscalatingThreads(state);
  if (escalating.length > 0) {
    lines.push(`\nEscalating threads requiring narrative focus: ${escalating.map(t => `"${t.title}"`).join(', ')}`);
  }

  const stale = getStaleThreads(state);
  if (stale.length > 0) {
    lines.push(`\nStale threads to reference or advance: ${stale.map(t => `"${t.title}"`).join(', ')}`);
  }

  lines.push('\nGuidance: Weave thread references into descriptions, NPC dialogue, hazards, and world reactions. Escalate naturally based on player choices — never force resolution.');

  return lines.join('\n');
}

// ── Integration Helpers ─────────────────────────────────────────

/** Tags that influence Story Gravity themes */
export function getThreadGravityTags(state: ThreadEngineState): string[] {
  return getActiveThreads(state).flatMap(t => t.tags);
}

/** High-importance threads generate narrative pressure */
export function getThreadPressureLevel(state: ThreadEngineState): number {
  const active = getActiveThreads(state);
  if (active.length === 0) return 0;
  const maxImportance = Math.max(...active.map(t => t.importance));
  const escalatingCount = getEscalatingThreads(state).length;
  return Math.min(10, maxImportance + escalatingCount);
}

/** Environment influence tags from active threads */
export function getThreadEnvironmentTags(state: ThreadEngineState): string[] {
  return getActiveThreads(state)
    .filter(t => t.type === 'world' || t.type === 'threat')
    .flatMap(t => t.tags);
}

/** Threads relevant to a specific character */
export function getCharacterThreads(state: ThreadEngineState, characterId: string): NarrativeThread[] {
  return getActiveThreads(state).filter(t => t.relatedCharacterIds.includes(characterId));
}
