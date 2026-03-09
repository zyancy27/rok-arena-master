/**
 * Narrator World Continuity
 *
 * Tracks world changes, NPC movements, environmental evolution,
 * and off-screen events to maintain a living, consistent world.
 * Ensures the narrator never contradicts established facts.
 */

// ── Types ───────────────────────────────────────────────────────

export interface WorldFact {
  id: string;
  /** What happened */
  description: string;
  /** Where it happened */
  zone: string;
  /** When (day count) */
  day: number;
  /** Category of fact */
  category: 'environment' | 'npc' | 'player_action' | 'consequence' | 'discovery';
  /** Is this fact still current or superseded? */
  current: boolean;
}

export interface NpcWorldState {
  npcId: string;
  npcName: string;
  lastKnownZone: string;
  lastSeenDay: number;
  /** NPC's current agenda/activity */
  currentAgenda: string;
  /** Trust level with player */
  trustLevel: number;
  /** Key facts this NPC knows */
  knownFacts: string[];
}

export interface WorldContinuityState {
  /** Important facts about the world */
  facts: WorldFact[];
  /** NPC world states */
  npcStates: Map<string, NpcWorldState>;
  /** Environmental changes by zone */
  zoneChanges: Map<string, string[]>;
  /** Off-screen events that happened between scenes */
  offScreenEvents: string[];
}

// ── Factory ─────────────────────────────────────────────────────

export function createWorldContinuity(): WorldContinuityState {
  return {
    facts: [],
    npcStates: new Map(),
    zoneChanges: new Map(),
    offScreenEvents: [],
  };
}

// ── Fact Recording ──────────────────────────────────────────────

let _factId = 0;

export function recordWorldFact(
  state: WorldContinuityState,
  description: string,
  zone: string,
  day: number,
  category: WorldFact['category'],
): WorldContinuityState {
  const fact: WorldFact = {
    id: `fact_${++_factId}`,
    description,
    zone,
    day,
    category,
    current: true,
  };

  // Keep last 50 facts to avoid unbounded growth
  const facts = [...state.facts, fact].slice(-50);

  return { ...state, facts };
}

export function supersedeFact(state: WorldContinuityState, factId: string): WorldContinuityState {
  return {
    ...state,
    facts: state.facts.map(f => f.id === factId ? { ...f, current: false } : f),
  };
}

// ── NPC Tracking ────────────────────────────────────────────────

export function updateNpcWorldState(
  state: WorldContinuityState,
  npcId: string,
  npcName: string,
  update: Partial<Omit<NpcWorldState, 'npcId' | 'npcName'>>,
): WorldContinuityState {
  const existing = state.npcStates.get(npcId) || {
    npcId,
    npcName,
    lastKnownZone: 'unknown',
    lastSeenDay: 0,
    currentAgenda: '',
    trustLevel: 0,
    knownFacts: [],
  };

  const updated = new Map(state.npcStates);
  updated.set(npcId, { ...existing, ...update });

  return { ...state, npcStates: updated };
}

// ── Zone Changes ────────────────────────────────────────────────

export function recordZoneChange(
  state: WorldContinuityState,
  zone: string,
  change: string,
): WorldContinuityState {
  const existing = state.zoneChanges.get(zone) || [];
  const changes = [...existing, change].slice(-10);

  const updated = new Map(state.zoneChanges);
  updated.set(zone, changes);

  return { ...state, zoneChanges: updated };
}

// ── Off-Screen Events ───────────────────────────────────────────

export function addOffScreenEvent(
  state: WorldContinuityState,
  event: string,
): WorldContinuityState {
  return {
    ...state,
    offScreenEvents: [...state.offScreenEvents, event].slice(-10),
  };
}

export function consumeOffScreenEvents(
  state: WorldContinuityState,
): { events: string[]; state: WorldContinuityState } {
  return {
    events: [...state.offScreenEvents],
    state: { ...state, offScreenEvents: [] },
  };
}

// ── Continuity Context Builder ──────────────────────────────────

export function buildContinuityContext(
  state: WorldContinuityState,
  currentZone: string,
  currentDay: number,
): string {
  const parts: string[] = [];

  // Current zone changes
  const zoneHistory = state.zoneChanges.get(currentZone);
  if (zoneHistory && zoneHistory.length > 0) {
    parts.push(`Zone history (${currentZone}): ${zoneHistory.slice(-3).join('; ')}`);
  }

  // Recent world facts relevant to current zone
  const recentFacts = state.facts
    .filter(f => f.current && (f.zone === currentZone || f.category === 'consequence'))
    .slice(-5);
  if (recentFacts.length > 0) {
    parts.push(`Known facts: ${recentFacts.map(f => f.description).join('; ')}`);
  }

  // NPCs who should be in this zone
  const nearbyNpcs: string[] = [];
  state.npcStates.forEach((npc) => {
    if (npc.lastKnownZone === currentZone) {
      nearbyNpcs.push(`${npc.npcName} (trust: ${npc.trustLevel}, agenda: ${npc.currentAgenda || 'none'})`);
    }
  });
  if (nearbyNpcs.length > 0) {
    parts.push(`NPCs in zone: ${nearbyNpcs.join(', ')}`);
  }

  // Off-screen events
  if (state.offScreenEvents.length > 0) {
    parts.push(`Off-screen developments: ${state.offScreenEvents.join('; ')}`);
  }

  return parts.length > 0
    ? `\nWORLD CONTINUITY:\n${parts.join('\n')}`
    : '';
}
