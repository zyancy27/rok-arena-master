/**
 * Emergent Event Engine
 *
 * Generates unscripted but logically grounded events from existing
 * world conditions. Events emerge from the intersection of regional
 * state, faction activity, economy, environment, rumors, and
 * unresolved threats.
 *
 * All events have clear causes, influence regions and NPCs, and
 * feed into the Story Orchestrator.
 */

// ── Types ───────────────────────────────────────────────────────

export type EmergentEventCategory =
  | 'security'        // bandits, patrols, crime
  | 'economy'         // shortages, trade, price shifts
  | 'environment'     // migration, floods, ruins revealed
  | 'social'          // feuds, celebrations, unrest
  | 'discovery'       // hidden locations, artifacts, passages
  | 'faction'         // power shifts, alliances, betrayals
  | 'creature'        // migrations, nesting, territorial disputes
  | 'infrastructure'; // roads, bridges, buildings damaged or built

export type EmergentEventUrgency = 'background' | 'developing' | 'imminent' | 'active';

export interface EmergentEvent {
  id: string;
  category: EmergentEventCategory;
  title: string;
  description: string;
  cause: string;
  urgency: EmergentEventUrgency;
  regionId: string;
  /** Gravity score 1–10 for story priority */
  gravity: number;
  /** NPCs involved or affected */
  affectedNpcs: string[];
  /** Potential consequences if ignored */
  escalation: string;
  /** Tags for narrator context matching */
  tags: string[];
  turnGenerated: number;
  turnsSinceGenerated: number;
  resolved: boolean;
}

export interface EmergentEventEngineState {
  events: EmergentEvent[];
  totalGenerated: number;
  lastGenerationTurn: number;
  /** Minimum turns between new event generation */
  cooldown: number;
}

// ── World Condition Input ───────────────────────────────────────

export interface WorldConditions {
  regionId: string;
  dangerLevel: number;        // 0–10
  factionConflicts: number;
  guardPresence: 'none' | 'low' | 'moderate' | 'high';
  economyStress: number;      // 0–10
  environmentalHazards: number;
  unresolvedThreats: number;
  activeRumors: string[];
  weather: string;
  timeOfDay: string;
  dayCount: number;
  recentEvents: string[];     // recent event titles to avoid duplication
}

// ── Constants ───────────────────────────────────────────────────

const MIN_COOLDOWN = 3;

interface EventTemplate {
  category: EmergentEventCategory;
  /** Conditions that make this event likely */
  conditions: (ctx: WorldConditions) => boolean;
  /** Weight when conditions are met */
  weight: (ctx: WorldConditions) => number;
  generate: (ctx: WorldConditions) => Omit<EmergentEvent, 'id' | 'turnGenerated' | 'turnsSinceGenerated' | 'resolved'>;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  // Security — bandits form when guards are low
  {
    category: 'security',
    conditions: (c) => c.guardPresence === 'none' || c.guardPresence === 'low',
    weight: (c) => c.dangerLevel >= 4 ? 8 : 4,
    generate: (c) => ({
      category: 'security',
      title: 'Bandit activity increasing',
      description: `With guard presence ${c.guardPresence} in the region, opportunistic groups have begun setting up along trade routes.`,
      cause: `Low guard presence combined with danger level ${c.dangerLevel}/10`,
      urgency: c.dangerLevel >= 6 ? 'imminent' : 'developing',
      regionId: c.regionId,
      gravity: Math.min(9, c.dangerLevel + 2),
      affectedNpcs: ['merchants', 'travelers'],
      escalation: 'Bandits will ambush caravans → road becomes unsafe → trade economy collapses',
      tags: ['bandits', 'security', 'trade', 'danger'],
    }),
  },
  // Economy — shortage from unsafe roads
  {
    category: 'economy',
    conditions: (c) => c.economyStress >= 5,
    weight: (c) => c.economyStress >= 7 ? 7 : 4,
    generate: (c) => ({
      category: 'economy',
      title: 'Market shortage developing',
      description: `Supply lines are strained. Prices are rising as goods become scarce.`,
      cause: `Economic stress at ${c.economyStress}/10 — trade routes disrupted or resources depleted`,
      urgency: c.economyStress >= 8 ? 'active' : 'developing',
      regionId: c.regionId,
      gravity: Math.min(8, c.economyStress),
      affectedNpcs: ['merchants', 'townsfolk', 'innkeepers'],
      escalation: 'Prices spike → hoarding begins → desperate people resort to theft',
      tags: ['economy', 'shortage', 'trade', 'prices'],
    }),
  },
  // Environment — creature migration
  {
    category: 'creature',
    conditions: (c) => c.environmentalHazards >= 3 || c.weather === 'storm_approaching',
    weight: (c) => c.environmentalHazards >= 5 ? 6 : 3,
    generate: (c) => ({
      category: 'creature',
      title: 'Creature migration detected',
      description: `Environmental changes are driving creatures from their usual territory into populated areas.`,
      cause: `${c.environmentalHazards} environmental hazards forcing wildlife displacement`,
      urgency: 'developing',
      regionId: c.regionId,
      gravity: 6,
      affectedNpcs: ['hunters', 'farmers', 'guards'],
      escalation: 'Creatures become aggressive near settlements → livestock attacked → bounty posted',
      tags: ['creatures', 'migration', 'environment', 'wildlife'],
    }),
  },
  // Environment — flooding reveals ruins
  {
    category: 'discovery',
    conditions: (c) => c.weather === 'flooding' || c.environmentalHazards >= 4,
    weight: () => 3,
    generate: (c) => ({
      category: 'discovery',
      title: 'Flood reveals ancient structure',
      description: `Shifting terrain has uncovered the entrance to an old ruin, long buried beneath the surface.`,
      cause: `Environmental upheaval in ${c.regionId} region`,
      urgency: 'background',
      regionId: c.regionId,
      gravity: 5,
      affectedNpcs: ['scholars', 'adventurers'],
      escalation: 'Locals begin exploring → some go missing → deeper chambers hold unknown dangers',
      tags: ['discovery', 'ruins', 'exploration', 'ancient'],
    }),
  },
  // Social — local feud escalates
  {
    category: 'social',
    conditions: (c) => c.factionConflicts >= 1,
    weight: (c) => c.factionConflicts >= 2 ? 7 : 4,
    generate: (c) => ({
      category: 'social',
      title: 'Local tensions escalating',
      description: `A dispute between local groups is growing heated. Arguments have turned to threats.`,
      cause: `${c.factionConflicts} faction conflict(s) creating divided loyalties`,
      urgency: c.factionConflicts >= 3 ? 'imminent' : 'developing',
      regionId: c.regionId,
      gravity: Math.min(8, c.factionConflicts * 3 + 2),
      affectedNpcs: ['faction leaders', 'townsfolk', 'guards'],
      escalation: 'Threats become violence → faction war → region destabilized',
      tags: ['social', 'conflict', 'factions', 'tension'],
    }),
  },
  // Faction — power vacuum
  {
    category: 'faction',
    conditions: (c) => c.dangerLevel >= 5 && c.guardPresence !== 'high',
    weight: (c) => c.dangerLevel >= 7 ? 6 : 3,
    generate: (c) => ({
      category: 'faction',
      title: 'Power vacuum forming',
      description: `With authority weakened, rival groups are positioning to fill the gap.`,
      cause: `High danger (${c.dangerLevel}/10) with inadequate security`,
      urgency: 'developing',
      regionId: c.regionId,
      gravity: 7,
      affectedNpcs: ['faction leaders', 'warlords', 'opportunists'],
      escalation: 'Rival factions claim territory → forced loyalty oaths → civilians caught between sides',
      tags: ['faction', 'power', 'politics', 'danger'],
    }),
  },
  // Infrastructure — bridge/road damage
  {
    category: 'infrastructure',
    conditions: (c) => c.environmentalHazards >= 2 || c.dangerLevel >= 6,
    weight: () => 3,
    generate: (c) => ({
      category: 'infrastructure',
      title: 'Infrastructure deteriorating',
      description: `A key route or structure in the region is becoming unsafe to use.`,
      cause: `Sustained damage from hazards (${c.environmentalHazards}) and regional danger (${c.dangerLevel}/10)`,
      urgency: 'background',
      regionId: c.regionId,
      gravity: 4,
      affectedNpcs: ['travelers', 'merchants', 'engineers'],
      escalation: 'Route becomes impassable → detours through dangerous territory → isolation',
      tags: ['infrastructure', 'roads', 'damage', 'travel'],
    }),
  },
  // Rumor-driven event
  {
    category: 'discovery',
    conditions: (c) => c.activeRumors.length >= 2,
    weight: (c) => c.activeRumors.length >= 3 ? 5 : 3,
    generate: (c) => ({
      category: 'discovery',
      title: 'Rumor convergence',
      description: `Multiple rumors point to the same area. Something is happening there that people are talking about.`,
      cause: `${c.activeRumors.length} active rumors converging on a single location`,
      urgency: 'developing',
      regionId: c.regionId,
      gravity: 5,
      affectedNpcs: ['informants', 'curious townsfolk'],
      escalation: 'Rumor becomes confirmed → draws attention from multiple factions → race to investigate',
      tags: ['rumor', 'discovery', 'investigation', 'convergence'],
    }),
  },
];

// ── Engine Functions ────────────────────────────────────────────

let _counter = 0;
function uid(): string {
  return `ee_${Date.now().toString(36)}_${(++_counter).toString(36)}`;
}

export function createEmergentEventState(cooldown = MIN_COOLDOWN): EmergentEventEngineState {
  return {
    events: [],
    totalGenerated: 0,
    lastGenerationTurn: -cooldown,
    cooldown,
  };
}

/** Check if conditions warrant generating a new event. */
export function shouldGenerateEvent(
  state: EmergentEventEngineState,
  turnNumber: number,
): boolean {
  if (turnNumber - state.lastGenerationTurn < state.cooldown) return false;
  // Active unresolved events cap to avoid overwhelming
  const unresolvedCount = state.events.filter(e => !e.resolved).length;
  if (unresolvedCount >= 5) return false;
  return Math.random() < 0.35; // ~35% chance per eligible turn
}

/** Generate an emergent event from world conditions. */
export function generateEmergentEvent(
  state: EmergentEventEngineState,
  conditions: WorldConditions,
  turnNumber: number,
): { state: EmergentEventEngineState; event: EmergentEvent } | null {
  // Find eligible templates
  const eligible = EVENT_TEMPLATES.filter(t => {
    if (!t.conditions(conditions)) return false;
    // Avoid duplicate categories if we already have an active one in the same region
    const existing = state.events.find(
      e => !e.resolved && e.category === t.category && e.regionId === conditions.regionId,
    );
    return !existing;
  });

  if (eligible.length === 0) return null;

  // Weighted random selection
  const totalWeight = eligible.reduce((s, t) => s + t.weight(conditions), 0);
  let roll = Math.random() * totalWeight;
  let selected: EventTemplate | null = null;
  for (const t of eligible) {
    roll -= t.weight(conditions);
    if (roll <= 0) { selected = t; break; }
  }
  if (!selected) selected = eligible[0];

  const base = selected.generate(conditions);
  const event: EmergentEvent = {
    ...base,
    id: uid(),
    turnGenerated: turnNumber,
    turnsSinceGenerated: 0,
    resolved: false,
  };

  return {
    state: {
      ...state,
      events: [...state.events, event],
      totalGenerated: state.totalGenerated + 1,
      lastGenerationTurn: turnNumber,
    },
    event,
  };
}

/** Evolve existing events — increase urgency of ignored events. */
export function evolveEmergentEvents(
  state: EmergentEventEngineState,
  turnNumber: number,
): EmergentEventEngineState {
  const URGENCY_ORDER: EmergentEventUrgency[] = ['background', 'developing', 'imminent', 'active'];

  const events = state.events.map(e => {
    if (e.resolved) return e;

    const age = turnNumber - e.turnGenerated;
    const updated = { ...e, turnsSinceGenerated: age };

    // Escalate urgency every 5 turns of being unresolved
    if (age > 0 && age % 5 === 0) {
      const currentIdx = URGENCY_ORDER.indexOf(e.urgency);
      if (currentIdx < URGENCY_ORDER.length - 1) {
        updated.urgency = URGENCY_ORDER[currentIdx + 1];
        updated.gravity = Math.min(10, e.gravity + 1);
      }
    }

    return updated;
  });

  return { ...state, events };
}

/** Resolve an event (player dealt with it or it naturally concluded). */
export function resolveEmergentEvent(
  state: EmergentEventEngineState,
  eventId: string,
): EmergentEventEngineState {
  return {
    ...state,
    events: state.events.map(e =>
      e.id === eventId ? { ...e, resolved: true } : e,
    ),
  };
}

/** Get unresolved events sorted by gravity. */
export function getActiveEmergentEvents(state: EmergentEventEngineState): EmergentEvent[] {
  return state.events
    .filter(e => !e.resolved)
    .sort((a, b) => b.gravity - a.gravity);
}

/** Build narrator context from active emergent events. */
export function buildEmergentEventNarratorContext(state: EmergentEventEngineState): string {
  const active = getActiveEmergentEvents(state);
  if (active.length === 0) return '';

  const parts: string[] = ['EMERGENT WORLD EVENTS (arose from world conditions):'];
  for (const e of active.slice(0, 4)) {
    parts.push(`- [${e.category}] "${e.title}" (gravity: ${e.gravity}/10, ${e.urgency}): ${e.description}`);
    parts.push(`  Cause: ${e.cause}`);
    if (e.urgency === 'imminent' || e.urgency === 'active') {
      parts.push(`  If ignored: ${e.escalation}`);
    }
  }
  parts.push('Reference these events naturally. They arise from world conditions, not script.');
  return parts.join('\n');
}

/** Build compact context for world simulation AI prompt. */
export function buildEmergentSimulationContext(state: EmergentEventEngineState): string {
  const active = getActiveEmergentEvents(state);
  if (active.length === 0) return 'No active emergent events.';
  return `Active emergent events: ${active.map(e => `${e.title}(${e.urgency})`).join(', ')}`;
}
