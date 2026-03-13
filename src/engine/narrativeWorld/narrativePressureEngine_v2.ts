/**
 * Narrative Pressure Engine v2 — Tension Classification & Situational Pressure
 *
 * Controls story tension through multi-source pressure analysis.
 * Creates moments that naturally reveal character through difficult,
 * urgent, emotional, or morally meaningful situations.
 *
 * NEVER removes player freedom — only creates meaningful situations
 * that reveal character.
 */

// ── Pressure Sources ────────────────────────────────────────────

export type PressureSourceType =
  | 'enemy_threat'
  | 'environmental_danger'
  | 'time_pressure'
  | 'social_pressure'
  | 'resource_scarcity'
  | 'uncertainty'
  | 'world_instability';

export interface PressureSource {
  type: PressureSourceType;
  intensity: number; // 0–100
  description: string;
  /** Optional zone where this pressure originates */
  zoneId?: string;
}

// ── Tension Levels ──────────────────────────────────────────────

export type TensionLevel =
  | 'low_pressure'
  | 'rising_tension'
  | 'urgent_danger'
  | 'crisis'
  | 'aftermath';

export interface TensionClassification {
  level: TensionLevel;
  overallIntensity: number; // 0–100
  dominantSource: PressureSourceType | null;
  activeSources: PressureSource[];
  /** Narrator guidance for this tension level */
  narratorGuidance: TensionGuidance;
}

export interface TensionGuidance {
  tone: string;
  pacing: string;
  npcUrgency: string;
  environmentEmphasis: string;
  detailFocus: string;
}

// ── State ───────────────────────────────────────────────────────

export interface PressureEngineV2State {
  sources: PressureSource[];
  currentTension: TensionLevel;
  tensionHistory: { level: TensionLevel; turn: number }[];
  peakTension: number;
  turnsAtCurrentLevel: number;
  lastUpdateTurn: number;
}

// ── Constants ───────────────────────────────────────────────────

const TENSION_THRESHOLDS: Record<TensionLevel, [number, number]> = {
  low_pressure:    [0, 20],
  rising_tension:  [21, 45],
  urgent_danger:   [46, 70],
  crisis:          [71, 90],
  aftermath:       [0, 15], // special: only after crisis resolves
};

const GUIDANCE: Record<TensionLevel, TensionGuidance> = {
  low_pressure: {
    tone: 'Calm, reflective. Let the world breathe.',
    pacing: 'Slow and atmospheric. Favor description over action.',
    npcUrgency: 'NPCs are relaxed, going about routine.',
    environmentEmphasis: 'Ambient details, beauty, subtle foreshadowing.',
    detailFocus: 'Character moments, world-building, subtle hooks.',
  },
  rising_tension: {
    tone: 'Uneasy. Something is building beneath the surface.',
    pacing: 'Measured but alert. Shorter sentences mixed with longer ones.',
    npcUrgency: 'NPCs are wary, conversations have edge.',
    environmentEmphasis: 'Environmental signs of change — shifting winds, distant sounds.',
    detailFocus: 'Threats just out of sight. Choices with unclear outcomes.',
  },
  urgent_danger: {
    tone: 'Intense and focused. Every moment matters.',
    pacing: 'Fast. Short sentences. Immediate consequences.',
    npcUrgency: 'NPCs are alarmed, seeking shelter or taking sides.',
    environmentEmphasis: 'Hostile terrain, closing windows of opportunity.',
    detailFocus: 'Immediate threats, tactical options, survival pressure.',
  },
  crisis: {
    tone: 'Maximum intensity. The world is breaking.',
    pacing: 'Urgent, kinetic. No room for contemplation.',
    npcUrgency: 'NPCs are panicking, fleeing, or fighting desperately.',
    environmentEmphasis: 'Active destruction, collapsing structures, shifting terrain.',
    detailFocus: 'Survival. Sacrifice. What the character protects when everything falls apart.',
  },
  aftermath: {
    tone: 'Quiet weight. The storm has passed but the cost remains.',
    pacing: 'Slow, heavy. Let silence speak.',
    npcUrgency: 'NPCs are stunned, grieving, or cautiously hopeful.',
    environmentEmphasis: 'Damage, debris, changed landscape. Signs of what was lost.',
    detailFocus: 'Consequences. Reflection. Who the character is after the storm.',
  },
};

// ── Source Detection ────────────────────────────────────────────

interface PressureDetectionContext {
  activeEnemies: number;
  dangerLevel: number;
  activeHazards: number;
  nearbyNpcs: number;
  knownThreats: number;
  resourcesLow: boolean;
  timeConstraint: boolean;
  unresolvedEvents: number;
  factionConflicts: number;
  environmentalDanger: number;
  recentCombat: boolean;
  recentCrisis: boolean;
}

export function detectPressureSources(ctx: PressureDetectionContext): PressureSource[] {
  const sources: PressureSource[] = [];

  // Enemy threat
  if (ctx.activeEnemies > 0 || ctx.knownThreats > 0) {
    const intensity = Math.min(100, ctx.activeEnemies * 25 + ctx.knownThreats * 15);
    sources.push({
      type: 'enemy_threat',
      intensity,
      description: ctx.activeEnemies > 0
        ? `${ctx.activeEnemies} active enemies nearby`
        : `${ctx.knownThreats} known threats in the region`,
    });
  }

  // Environmental danger
  if (ctx.activeHazards > 0 || ctx.environmentalDanger > 3) {
    const intensity = Math.min(100, ctx.activeHazards * 20 + ctx.environmentalDanger * 10);
    sources.push({
      type: 'environmental_danger',
      intensity,
      description: `${ctx.activeHazards} hazards active, environmental danger at ${ctx.environmentalDanger}/10`,
    });
  }

  // Time pressure
  if (ctx.timeConstraint) {
    sources.push({
      type: 'time_pressure',
      intensity: 60,
      description: 'Time-sensitive situation unfolding',
    });
  }

  // Social pressure
  if (ctx.nearbyNpcs >= 3 || ctx.factionConflicts > 0) {
    const intensity = Math.min(80, ctx.nearbyNpcs * 10 + ctx.factionConflicts * 25);
    sources.push({
      type: 'social_pressure',
      intensity,
      description: ctx.factionConflicts > 0
        ? `${ctx.factionConflicts} faction conflicts creating social tension`
        : `${ctx.nearbyNpcs} NPCs creating social dynamics`,
    });
  }

  // Resource scarcity
  if (ctx.resourcesLow) {
    sources.push({
      type: 'resource_scarcity',
      intensity: 45,
      description: 'Resources running low — supplies, health, or options dwindling',
    });
  }

  // Uncertainty
  if (ctx.unresolvedEvents >= 2) {
    const intensity = Math.min(70, ctx.unresolvedEvents * 15);
    sources.push({
      type: 'uncertainty',
      intensity,
      description: `${ctx.unresolvedEvents} unresolved events creating unknown variables`,
    });
  }

  // World instability
  if (ctx.dangerLevel >= 6 || ctx.factionConflicts >= 2) {
    const intensity = Math.min(90, ctx.dangerLevel * 10 + ctx.factionConflicts * 15);
    sources.push({
      type: 'world_instability',
      intensity,
      description: `Regional instability at danger level ${ctx.dangerLevel}/10`,
    });
  }

  return sources;
}

// ── Classification ──────────────────────────────────────────────

export function classifyTension(
  sources: PressureSource[],
  previousLevel: TensionLevel,
  turnsAtLevel: number,
): TensionClassification {
  if (sources.length === 0) {
    // If we were in crisis and sources cleared → aftermath
    if (previousLevel === 'crisis' && turnsAtLevel >= 2) {
      return buildClassification('aftermath', sources);
    }
    return buildClassification('low_pressure', sources);
  }

  const overallIntensity = calculateOverallIntensity(sources);

  // After crisis, transition to aftermath before returning to low
  if (previousLevel === 'crisis' && overallIntensity < 30) {
    return buildClassification('aftermath', sources);
  }
  if (previousLevel === 'aftermath' && turnsAtLevel < 3 && overallIntensity < 25) {
    return buildClassification('aftermath', sources);
  }

  // Standard classification
  if (overallIntensity >= 71) return buildClassification('crisis', sources);
  if (overallIntensity >= 46) return buildClassification('urgent_danger', sources);
  if (overallIntensity >= 21) return buildClassification('rising_tension', sources);
  return buildClassification('low_pressure', sources);
}

function calculateOverallIntensity(sources: PressureSource[]): number {
  if (sources.length === 0) return 0;
  // Weighted: highest source counts most, others add diminishing returns
  const sorted = [...sources].sort((a, b) => b.intensity - a.intensity);
  let total = sorted[0].intensity;
  for (let i = 1; i < sorted.length; i++) {
    total += sorted[i].intensity * (0.3 / i); // diminishing contribution
  }
  return Math.min(100, total);
}

function buildClassification(level: TensionLevel, sources: PressureSource[]): TensionClassification {
  const sorted = [...sources].sort((a, b) => b.intensity - a.intensity);
  return {
    level,
    overallIntensity: calculateOverallIntensity(sources),
    dominantSource: sorted.length > 0 ? sorted[0].type : null,
    activeSources: sources,
    narratorGuidance: GUIDANCE[level],
  };
}

// ── State Management ────────────────────────────────────────────

export function createPressureEngineV2State(): PressureEngineV2State {
  return {
    sources: [],
    currentTension: 'low_pressure',
    tensionHistory: [],
    peakTension: 0,
    turnsAtCurrentLevel: 0,
    lastUpdateTurn: 0,
  };
}

export function updatePressureEngine(
  state: PressureEngineV2State,
  ctx: PressureDetectionContext,
  turnNumber: number,
): { state: PressureEngineV2State; classification: TensionClassification; levelChanged: boolean } {
  const sources = detectPressureSources(ctx);
  const classification = classifyTension(sources, state.currentTension, state.turnsAtCurrentLevel);
  const levelChanged = classification.level !== state.currentTension;

  const newState: PressureEngineV2State = {
    sources,
    currentTension: classification.level,
    tensionHistory: [
      ...state.tensionHistory.slice(-20),
      { level: classification.level, turn: turnNumber },
    ],
    peakTension: Math.max(state.peakTension, classification.overallIntensity),
    turnsAtCurrentLevel: levelChanged ? 0 : state.turnsAtCurrentLevel + 1,
    lastUpdateTurn: turnNumber,
  };

  return { state: newState, classification, levelChanged };
}

// ── Narrator Context ────────────────────────────────────────────

export function buildPressureV2NarratorContext(classification: TensionClassification): string {
  const parts: string[] = [];
  const g = classification.narratorGuidance;

  parts.push(`TENSION: ${classification.level.replace('_', ' ').toUpperCase()} (intensity: ${Math.round(classification.overallIntensity)}/100)`);
  parts.push(`Tone: ${g.tone}`);
  parts.push(`Pacing: ${g.pacing}`);
  parts.push(`NPC behavior: ${g.npcUrgency}`);
  parts.push(`Environment: ${g.environmentEmphasis}`);
  parts.push(`Focus: ${g.detailFocus}`);

  if (classification.activeSources.length > 0) {
    parts.push('Active pressure sources:');
    for (const s of classification.activeSources.slice(0, 4)) {
      parts.push(`- ${s.type.replace(/_/g, ' ')}: ${s.description} (${s.intensity}%)`);
    }
  }

  return parts.join('\n');
}

/**
 * Build a compact pressure context for the world simulation AI prompt.
 */
export function buildPressureSimulationContext(state: PressureEngineV2State): string {
  if (state.sources.length === 0) return `Current tension: ${state.currentTension}`;
  const sourceList = state.sources.map(s => `${s.type}:${s.intensity}`).join(', ');
  return `Tension: ${state.currentTension} (peak: ${state.peakTension}). Sources: ${sourceList}`;
}
