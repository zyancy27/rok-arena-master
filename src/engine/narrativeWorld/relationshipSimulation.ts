/**
 * Relationship Simulation System
 *
 * Extends the existing RelationshipWeb in narrativeSystems.ts with
 * deeper simulation: tracks trust, respect, fear, loyalty, rivalry,
 * affection between ALL characters (PC↔NPC, NPC↔NPC). Values
 * influence dialogue tone, combat cooperation, and story outcomes.
 */

// ── Types ───────────────────────────────────────────────────────

export interface RelationshipMetrics {
  trust: number;      // 0–100
  respect: number;    // 0–100
  fear: number;       // 0–100
  loyalty: number;    // 0–100
  rivalry: number;    // 0–100
  affection: number;  // 0–100
  suspicion: number;  // 0–100
  debt: number;       // -100 to 100 (positive = they owe you)
}

export interface CharacterRelationship {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  metrics: RelationshipMetrics;
  history: RelationshipEvent[];
  lastInteraction: number;
}

export interface RelationshipEvent {
  type: 'help' | 'trade' | 'insult' | 'violence' | 'betrayal' | 'kindness'
    | 'gift' | 'threat' | 'rescue' | 'cooperation' | 'competition' | 'deception';
  description: string;
  day: number;
  impact: number; // -10 to +10
}

export interface RelationshipNetwork {
  relationships: CharacterRelationship[];
}

// ── Factory ─────────────────────────────────────────────────────

export function createRelationshipNetwork(): RelationshipNetwork {
  return { relationships: [] };
}

function defaultMetrics(): RelationshipMetrics {
  return { trust: 50, respect: 50, fear: 10, loyalty: 30, rivalry: 10, affection: 30, suspicion: 20, debt: 0 };
}

// ── Operations ──────────────────────────────────────────────────

/**
 * Get or create a relationship between two characters.
 */
export function getRelationshipSim(
  network: RelationshipNetwork,
  sourceId: string,
  sourceName: string,
  targetId: string,
  targetName: string,
): CharacterRelationship {
  const existing = network.relationships.find(
    r => r.sourceId === sourceId && r.targetId === targetId,
  );
  if (existing) return existing;

  return {
    sourceId, sourceName, targetId, targetName,
    metrics: defaultMetrics(),
    history: [],
    lastInteraction: 0,
  };
}

/**
 * Record a relationship event and update metrics.
 */
export function recordRelationshipEvent(
  network: RelationshipNetwork,
  sourceId: string,
  sourceName: string,
  targetId: string,
  targetName: string,
  event: RelationshipEvent,
): RelationshipNetwork {
  const relationships = [...network.relationships];
  let idx = relationships.findIndex(r => r.sourceId === sourceId && r.targetId === targetId);

  if (idx === -1) {
    relationships.push({
      sourceId, sourceName, targetId, targetName,
      metrics: defaultMetrics(),
      history: [],
      lastInteraction: 0,
    });
    idx = relationships.length - 1;
  }

  const rel = { ...relationships[idx] };
  const m = { ...rel.metrics };
  const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
  const clampDebt = (v: number) => Math.max(-100, Math.min(100, v));
  const s = Math.abs(event.impact);

  switch (event.type) {
    case 'help':
    case 'rescue':
      m.trust = clamp(m.trust + s * 3);
      m.respect = clamp(m.respect + s * 2);
      m.affection = clamp(m.affection + s * 2);
      m.debt = clampDebt(m.debt + s * 2);
      m.fear = clamp(m.fear - s);
      break;
    case 'kindness':
    case 'gift':
      m.affection = clamp(m.affection + s * 3);
      m.trust = clamp(m.trust + s);
      m.suspicion = clamp(m.suspicion - s);
      break;
    case 'trade':
    case 'cooperation':
      m.trust = clamp(m.trust + s);
      m.respect = clamp(m.respect + s);
      break;
    case 'insult':
      m.respect = clamp(m.respect - s * 3);
      m.rivalry = clamp(m.rivalry + s * 2);
      m.affection = clamp(m.affection - s * 2);
      break;
    case 'violence':
      m.fear = clamp(m.fear + s * 4);
      m.trust = clamp(m.trust - s * 3);
      m.rivalry = clamp(m.rivalry + s * 2);
      m.affection = clamp(m.affection - s * 3);
      break;
    case 'betrayal':
      m.trust = clamp(m.trust - s * 5);
      m.loyalty = clamp(m.loyalty - s * 4);
      m.rivalry = clamp(m.rivalry + s * 3);
      m.suspicion = clamp(m.suspicion + s * 4);
      m.affection = clamp(m.affection - s * 3);
      break;
    case 'threat':
      m.fear = clamp(m.fear + s * 3);
      m.trust = clamp(m.trust - s * 2);
      m.suspicion = clamp(m.suspicion + s * 2);
      break;
    case 'competition':
      m.rivalry = clamp(m.rivalry + s * 2);
      m.respect = clamp(m.respect + s); // competition can breed respect
      break;
    case 'deception':
      m.suspicion = clamp(m.suspicion + s * 3);
      m.trust = clamp(m.trust - s * 2);
      break;
  }

  rel.metrics = m;
  rel.history = [...rel.history, event].slice(-30);
  rel.lastInteraction = Date.now();
  relationships[idx] = rel;

  return { relationships };
}

/**
 * Get the dominant relationship tone for narrator guidance.
 */
export function getRelationshipTone(metrics: RelationshipMetrics): string {
  if (metrics.fear >= 70) return 'fearful';
  if (metrics.rivalry >= 70) return 'hostile';
  if (metrics.affection >= 70 && metrics.trust >= 60) return 'devoted';
  if (metrics.trust >= 70 && metrics.respect >= 60) return 'respectful ally';
  if (metrics.suspicion >= 60) return 'suspicious';
  if (metrics.loyalty >= 70) return 'loyal';
  if (metrics.respect >= 60) return 'respectful';
  if (metrics.affection >= 50) return 'friendly';
  if (metrics.rivalry >= 40) return 'competitive';
  return 'neutral';
}

/**
 * Build narrator context for a specific relationship.
 */
export function buildRelationshipSimContext(rel: CharacterRelationship): string {
  const tone = getRelationshipTone(rel.metrics);
  const recentHistory = rel.history.slice(-3).map(h => h.description).join('; ');

  const parts: string[] = [];
  parts.push(`${rel.sourceName} → ${rel.targetName}: ${tone}`);
  parts.push(`trust:${Math.round(rel.metrics.trust)} respect:${Math.round(rel.metrics.respect)} fear:${Math.round(rel.metrics.fear)} loyalty:${Math.round(rel.metrics.loyalty)}`);
  if (recentHistory) parts.push(`Recent: ${recentHistory}`);

  return parts.join(' | ');
}

/**
 * Build full network context for the narrator.
 */
export function buildNetworkNarratorContext(network: RelationshipNetwork): string {
  if (network.relationships.length === 0) return '';

  const significant = network.relationships.filter(r => {
    const m = r.metrics;
    return m.trust > 70 || m.trust < 30 || m.fear > 60 || m.rivalry > 60 || m.affection > 60;
  });

  if (significant.length === 0) return '';

  const parts: string[] = ['CHARACTER RELATIONSHIPS:'];
  for (const rel of significant.slice(0, 8)) {
    parts.push(`- ${buildRelationshipSimContext(rel)}`);
  }

  return parts.join('\n');
}
