/**
 * Reputation vs Identity System
 *
 * Tracks two separate perceptions of the character:
 * - External Reputation: how the world sees them
 * - Internal Identity: what the Identity Discovery Engine observes
 *
 * When these diverge, creates narrative tension.
 *
 * Integrates with: Identity Discovery Engine, Relationship Simulation,
 * NPC Memory, Story Orchestrator, Character Psychology Engine.
 */

import type { CharacterTendency } from './characterIdentityDiscoveryEngine';

// ── Types ───────────────────────────────────────────────────────

export type ReputationTrait =
  | 'dangerous' | 'heroic' | 'reckless' | 'honorable' | 'unpredictable'
  | 'merciless' | 'wise' | 'cowardly' | 'mysterious' | 'trustworthy'
  | 'cunning' | 'generous' | 'ruthless' | 'kind' | 'feared'
  | 'respected' | 'unknown';

export interface ReputationEntry {
  trait: ReputationTrait;
  /** How widely known (0-100) */
  spread: number;
  /** How strongly held (0-100) */
  strength: number;
  /** Source of the reputation */
  source: string;
  /** Region or 'global' */
  region: string;
}

export interface IdentityConflict {
  /** External reputation */
  reputation: ReputationTrait;
  /** Internal tendency */
  identity: CharacterTendency;
  /** How much they diverge (0-100) */
  divergence: number;
  /** Whether narrator has acknowledged this */
  acknowledged: boolean;
}

export interface ReputationIdentityState {
  characterId: string;
  /** External reputation entries */
  reputation: ReputationEntry[];
  /** Detected conflicts between reputation and identity */
  conflicts: IdentityConflict[];
  /** Narrator acknowledgements */
  deliveredReflections: { turn: number; type: string }[];
}

// ── Reputation ↔ Identity Mapping ───────────────────────────────

const REPUTATION_IDENTITY_OPPOSITES: Record<ReputationTrait, CharacterTendency[]> = {
  dangerous: ['compassionate', 'diplomatic', 'protective', 'self_sacrificing'],
  heroic: ['cold', 'opportunistic', 'cautious'],
  reckless: ['cautious', 'analytical'],
  honorable: ['opportunistic', 'cold'],
  unpredictable: ['analytical', 'cautious'],
  merciless: ['compassionate', 'self_sacrificing', 'protective'],
  wise: ['reckless', 'instinctive'],
  cowardly: ['defiant', 'protective', 'self_sacrificing'],
  mysterious: ['diplomatic'],
  trustworthy: ['opportunistic', 'cold'],
  cunning: ['loyal', 'compassionate'],
  generous: ['cold', 'opportunistic'],
  ruthless: ['compassionate', 'diplomatic', 'protective'],
  kind: ['cold', 'opportunistic'],
  feared: ['compassionate', 'diplomatic', 'self_sacrificing'],
  respected: [],
  unknown: [],
};

// ── Reflection Templates ────────────────────────────────────────

const CONFLICT_TEMPLATES: Record<string, string[]> = {
  'dangerous↔compassionate': [
    'Most people see you as dangerous. But your actions today tell a different story.',
    'They flinch when you move. They don\'t see the kindness you carry underneath.',
  ],
  'merciless↔protective': [
    'The stories paint you as merciless. The people you\'ve quietly protected know better.',
    'Reputation says one thing. The lives you\'ve saved say another.',
  ],
  'feared↔compassionate': [
    'The town watches you with suspicion, unaware of the quiet choices you\'ve been making.',
    'Fear follows your name. Compassion follows your actions. The world hasn\'t noticed the difference.',
  ],
  'cowardly↔defiant': [
    'They call you a coward. But you keep standing up when it matters.',
    'The reputation doesn\'t match the person. Not anymore.',
  ],
  'heroic↔cold': [
    'They call you a hero. You know the truth is more complicated than that.',
    'The stories make you sound warmer than you are. You let them believe it.',
  ],
};

const GENERIC_CONFLICT_TEMPLATES: string[] = [
  'The world sees one version of you. Your actions reveal another.',
  'Reputation is a mirror that only shows what others expect to see.',
  'What they think they know about you — and what is true — are drifting apart.',
  'Your name carries a weight you didn\'t choose. Your choices carry a different one.',
];

// ── Engine Functions ────────────────────────────────────────────

export function createReputationIdentityState(characterId: string): ReputationIdentityState {
  return {
    characterId,
    reputation: [],
    conflicts: [],
    deliveredReflections: [],
  };
}

/** Record a reputation event (NPC gossip, world reaction, etc.). */
export function recordReputation(
  state: ReputationIdentityState,
  trait: ReputationTrait,
  source: string,
  region: string,
  strength = 30,
): ReputationIdentityState {
  const reputation = [...state.reputation];
  const existing = reputation.find(r => r.trait === trait && r.region === region);

  if (existing) {
    existing.strength = Math.min(100, existing.strength + strength * 0.3);
    existing.spread = Math.min(100, existing.spread + 5);
  } else {
    reputation.push({ trait, spread: 20, strength, source, region });
  }

  return { ...state, reputation };
}

/** Detect conflicts between reputation and observed identity. */
export function detectConflicts(
  state: ReputationIdentityState,
  emergingIdentity: CharacterTendency[],
): ReputationIdentityState {
  const conflicts: IdentityConflict[] = [];

  for (const rep of state.reputation) {
    if (rep.strength < 25) continue;
    const opposites = REPUTATION_IDENTITY_OPPOSITES[rep.trait] || [];

    for (const identity of emergingIdentity) {
      if (opposites.includes(identity)) {
        const existing = state.conflicts.find(c => c.reputation === rep.trait && c.identity === identity);
        conflicts.push({
          reputation: rep.trait,
          identity,
          divergence: Math.min(100, rep.strength * 0.7 + 30),
          acknowledged: existing?.acknowledged || false,
        });
      }
    }
  }

  return { ...state, conflicts };
}

/** Get the strongest reputation trait. */
export function getDominantReputation(state: ReputationIdentityState): ReputationEntry | null {
  if (state.reputation.length === 0) return null;
  return [...state.reputation].sort((a, b) => b.strength * b.spread - a.strength * a.spread)[0];
}

/** Check if narrator should reflect on reputation/identity conflict. */
export function shouldReflectConflict(
  state: ReputationIdentityState,
  currentTurn: number,
): boolean {
  const unacknowledged = state.conflicts.filter(c => !c.acknowledged && c.divergence >= 40);
  if (unacknowledged.length === 0) return false;

  const recentReflections = state.deliveredReflections.filter(r => currentTurn - r.turn < 25);
  if (recentReflections.length >= 1) return false;

  return Math.random() < 0.08;
}

/** Generate a reflection about reputation vs identity divergence. */
export function generateConflictReflection(
  state: ReputationIdentityState,
  currentTurn: number,
): { state: ReputationIdentityState; text: string } | null {
  const conflict = state.conflicts
    .filter(c => !c.acknowledged && c.divergence >= 40)
    .sort((a, b) => b.divergence - a.divergence)[0];

  if (!conflict) return null;

  const key = `${conflict.reputation}↔${conflict.identity}`;
  const templates = CONFLICT_TEMPLATES[key] || GENERIC_CONFLICT_TEMPLATES;
  const text = templates[Math.floor(Math.random() * templates.length)];

  const updatedConflicts = state.conflicts.map(c =>
    c === conflict ? { ...c, acknowledged: true } : c,
  );

  return {
    state: {
      ...state,
      conflicts: updatedConflicts,
      deliveredReflections: [
        ...state.deliveredReflections.slice(-9),
        { turn: currentTurn, type: key },
      ],
    },
    text,
  };
}

/** Build narrator context. */
export function buildReputationIdentityContext(state: ReputationIdentityState): string {
  const parts: string[] = [];

  // External reputation
  const strongRep = state.reputation.filter(r => r.strength >= 30).sort((a, b) => b.strength - a.strength);
  if (strongRep.length > 0) {
    parts.push('EXTERNAL REPUTATION (how the world sees this character):');
    for (const r of strongRep.slice(0, 4)) {
      parts.push(`- ${r.trait} (strength: ${Math.round(r.strength)}%, spread: ${r.region})`);
    }
  }

  // Active conflicts
  const activeConflicts = state.conflicts.filter(c => c.divergence >= 30);
  if (activeConflicts.length > 0) {
    parts.push('REPUTATION vs IDENTITY CONFLICTS:');
    for (const c of activeConflicts.slice(0, 3)) {
      parts.push(`- World sees "${c.reputation}" but character acts "${c.identity}" (divergence: ${Math.round(c.divergence)}%)`);
    }
    parts.push('NPCs should react based on REPUTATION. Narration can note the gap subtly.');
  }

  return parts.join('\n');
}
