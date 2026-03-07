/**
 * System 12 — Character Echo System
 *
 * Stores important narrative fragments from gameplay and reintroduces
 * them as contextual memories when relevant situations occur.
 */

import type { BiomeToneTag, SignaturePattern } from './types';

// ── Types ───────────────────────────────────────────────────────

export type EchoType = 'value' | 'memory' | 'decision' | 'emotional_moment' | 'relationship_moment';

export interface EchoFragment {
  id: string;
  characterId: string;
  echoType: EchoType;
  /** The original statement, action, or moment */
  content: string;
  /** Scene/context where it originated */
  originScene: string;
  /** 0–1 weight; higher = more likely to resurface */
  emotionalWeight: number;
  /** Keywords for contextual matching */
  tags: string[];
  timestamp: number;
  /** How many times this echo has surfaced */
  surfaceCount: number;
}

export interface EchoTriggerContext {
  currentZoneId?: string;
  currentBiomeTone?: BiomeToneTag;
  activeSituation?: string;
  dominantPattern?: SignaturePattern;
  /** Free-text of what's happening now */
  narrativeContext: string;
}

export interface EchoSurfaceResult {
  fragment: EchoFragment;
  narratorPrompt: string;
  relevanceScore: number;
}

export interface EchoMemoryState {
  fragments: EchoFragment[];
  /** characterId → fragment IDs */
  characterIndex: Record<string, string[]>;
}

// ── Internals ───────────────────────────────────────────────────

let _echoId = 0;

const ECHO_TYPE_KEYWORDS: Record<EchoType, string[]> = {
  value: ['never', 'always', 'believe', 'promise', 'swear', 'protect', 'refuse', 'will not'],
  memory: ['remember', 'remind', 'once', 'long ago', 'used to', 'childhood', 'home'],
  decision: ['choose', 'decide', 'chose', 'picked', 'went with', 'opted'],
  emotional_moment: ['feel', 'felt', 'tears', 'anger', 'joy', 'fear', 'grief', 'hope', 'scream'],
  relationship_moment: ['friend', 'ally', 'enemy', 'trust', 'betray', 'saved', 'together', 'alone'],
};

function classifyEchoType(content: string): EchoType {
  const lower = content.toLowerCase();
  let best: EchoType = 'memory';
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(ECHO_TYPE_KEYWORDS) as [EchoType, string[]][]) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return best;
}

function computeEmotionalWeight(content: string, echoType: EchoType): number {
  const typeWeights: Record<EchoType, number> = {
    value: 0.8,
    emotional_moment: 0.75,
    relationship_moment: 0.7,
    decision: 0.6,
    memory: 0.5,
  };
  const base = typeWeights[echoType];
  // Longer, more expressive content gets a small boost
  const lengthBonus = Math.min(content.length / 500, 0.15);
  return Math.min(base + lengthBonus, 1);
}

function extractTags(content: string): string[] {
  const lower = content.toLowerCase();
  const allKeywords = Object.values(ECHO_TYPE_KEYWORDS).flat();
  return allKeywords.filter((k) => lower.includes(k));
}

// ── Public API ──────────────────────────────────────────────────

export function createEchoMemory(): EchoMemoryState {
  return { fragments: [], characterIndex: {} };
}

/** Record a new echo fragment from gameplay. */
export function recordEcho(
  state: EchoMemoryState,
  characterId: string,
  content: string,
  originScene: string,
  explicitType?: EchoType,
): EchoMemoryState {
  const echoType = explicitType ?? classifyEchoType(content);
  const fragment: EchoFragment = {
    id: `echo_${++_echoId}`,
    characterId,
    echoType,
    content,
    originScene,
    emotionalWeight: computeEmotionalWeight(content, echoType),
    tags: extractTags(content),
    timestamp: Date.now(),
    surfaceCount: 0,
  };

  const fragments = [...state.fragments, fragment];
  const characterIndex = { ...state.characterIndex };
  characterIndex[characterId] = [...(characterIndex[characterId] ?? []), fragment.id];

  return { fragments, characterIndex };
}

/** Evaluate whether an echo should surface given current context. */
export function findRelevantEcho(
  state: EchoMemoryState,
  characterId: string,
  context: EchoTriggerContext,
): EchoSurfaceResult | null {
  const ids = state.characterIndex[characterId] ?? [];
  if (ids.length === 0) return null;

  const candidates = state.fragments.filter((f) => ids.includes(f.id));
  const contextLower = context.narrativeContext.toLowerCase();

  let bestFragment: EchoFragment | null = null;
  let bestScore = 0;

  for (const frag of candidates) {
    let score = frag.emotionalWeight;

    // Tag overlap with current context
    const tagOverlap = frag.tags.filter((t) => contextLower.includes(t)).length;
    score += tagOverlap * 0.15;

    // Tone affinity
    if (context.currentBiomeTone) {
      const emotionalTones: BiomeToneTag[] = ['desolate', 'desperate', 'sacred', 'mysterious'];
      if (emotionalTones.includes(context.currentBiomeTone)) score += 0.1;
    }

    // Decay: echoes that surface too often lose impact
    score -= frag.surfaceCount * 0.2;

    // Recency penalty: very recent echoes shouldn't resurface immediately
    const ageMs = Date.now() - frag.timestamp;
    if (ageMs < 60_000) score -= 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestFragment = frag;
    }
  }

  if (!bestFragment || bestScore < 0.4) return null;

  return {
    fragment: bestFragment,
    narratorPrompt: buildEchoNarratorPrompt(bestFragment),
    relevanceScore: bestScore,
  };
}

/** Mark an echo as surfaced (increments counter). */
export function markEchoSurfaced(
  state: EchoMemoryState,
  fragmentId: string,
): EchoMemoryState {
  const fragments = state.fragments.map((f) =>
    f.id === fragmentId ? { ...f, surfaceCount: f.surfaceCount + 1 } : f,
  );
  return { ...state, fragments };
}

/** Get all echoes for a character, sorted by emotional weight. */
export function getCharacterEchoes(
  state: EchoMemoryState,
  characterId: string,
): EchoFragment[] {
  const ids = state.characterIndex[characterId] ?? [];
  return state.fragments
    .filter((f) => ids.includes(f.id))
    .sort((a, b) => b.emotionalWeight - a.emotionalWeight);
}

/** Build narrator context summarising a character's echoes. */
export function buildEchoNarratorContext(
  state: EchoMemoryState,
  characterId: string,
): string {
  const echoes = getCharacterEchoes(state, characterId).slice(0, 5);
  if (echoes.length === 0) return '';
  const refs = echoes.map((e) => `"${e.content}" (${e.echoType})`);
  return `Character echoes: ${refs.join('; ')}`;
}

// ── Helpers ─────────────────────────────────────────────────────

function buildEchoNarratorPrompt(fragment: EchoFragment): string {
  switch (fragment.echoType) {
    case 'value':
      return `You remember something you once said: "${fragment.content}"`;
    case 'memory':
      return `A memory stirs — ${fragment.content}`;
    case 'decision':
      return `You recall a choice you made: ${fragment.content}`;
    case 'emotional_moment':
      return `A familiar feeling surfaces — ${fragment.content}`;
    case 'relationship_moment':
      return `You think of someone — ${fragment.content}`;
    default:
      return `Something echoes in your mind: "${fragment.content}"`;
  }
}
