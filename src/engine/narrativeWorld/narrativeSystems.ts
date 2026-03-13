/**
 * Unified Narrative Systems — Integrated DM Intelligence Layer
 *
 * Defines and orchestrates all 22 narrative systems that work together
 * through the Story Brain / Narrative Orchestrator. Each system is a
 * lightweight reasoning module that produces context strings for the
 * AI narrator rather than replacing it.
 *
 * Systems are designed to EXTEND existing engines, not replace them.
 */

// ── 1. Character Relationship Web ──────────────────────────────

export interface RelationshipEdge {
  characterA: string;
  characterB: string;
  trust: number;       // -100 to 100
  respect: number;     // -100 to 100
  fear: number;        // 0 to 100
  rivalry: number;     // 0 to 100
  loyalty: number;     // 0 to 100
  suspicion: number;   // 0 to 100
  debt: number;        // -100 (they owe) to 100 (you owe)
  lastInteraction: string;
  interactionCount: number;
}

export interface RelationshipWeb {
  edges: RelationshipEdge[];
}

export function createRelationshipWeb(): RelationshipWeb {
  return { edges: [] };
}

export function getRelationship(web: RelationshipWeb, a: string, b: string): RelationshipEdge | null {
  return web.edges.find(e =>
    (e.characterA === a && e.characterB === b) ||
    (e.characterA === b && e.characterB === a)
  ) || null;
}

export function updateRelationship(
  web: RelationshipWeb,
  a: string,
  b: string,
  changes: Partial<Pick<RelationshipEdge, 'trust' | 'respect' | 'fear' | 'rivalry' | 'loyalty' | 'suspicion' | 'debt'>>,
  interaction: string,
): RelationshipWeb {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const existing = getRelationship(web, a, b);

  if (existing) {
    const updated: RelationshipEdge = {
      ...existing,
      trust: clamp((existing.trust + (changes.trust || 0)), -100, 100),
      respect: clamp((existing.respect + (changes.respect || 0)), -100, 100),
      fear: clamp((existing.fear + (changes.fear || 0)), 0, 100),
      rivalry: clamp((existing.rivalry + (changes.rivalry || 0)), 0, 100),
      loyalty: clamp((existing.loyalty + (changes.loyalty || 0)), 0, 100),
      suspicion: clamp((existing.suspicion + (changes.suspicion || 0)), 0, 100),
      debt: clamp((existing.debt + (changes.debt || 0)), -100, 100),
      lastInteraction: interaction,
      interactionCount: existing.interactionCount + 1,
    };
    return {
      edges: web.edges.map(e =>
        (e.characterA === a && e.characterB === b) || (e.characterA === b && e.characterB === a)
          ? updated : e
      ),
    };
  }

  return {
    edges: [...web.edges, {
      characterA: a,
      characterB: b,
      trust: changes.trust || 0,
      respect: changes.respect || 0,
      fear: changes.fear || 0,
      rivalry: changes.rivalry || 0,
      loyalty: changes.loyalty || 0,
      suspicion: changes.suspicion || 0,
      debt: changes.debt || 0,
      lastInteraction: interaction,
      interactionCount: 1,
    }],
  };
}

export function buildRelationshipContext(web: RelationshipWeb, characterId: string): string {
  const relevant = web.edges.filter(e => e.characterA === characterId || e.characterB === characterId);
  if (relevant.length === 0) return '';
  const lines = relevant.map(e => {
    const other = e.characterA === characterId ? e.characterB : e.characterA;
    const attrs: string[] = [];
    if (Math.abs(e.trust) > 20) attrs.push(`trust:${e.trust > 0 ? 'high' : 'low'}`);
    if (e.fear > 30) attrs.push('feared');
    if (e.rivalry > 30) attrs.push('rival');
    if (e.loyalty > 40) attrs.push('loyal');
    if (e.suspicion > 30) attrs.push('suspicious');
    return `${other}: ${attrs.join(', ') || 'neutral'} (${e.lastInteraction})`;
  });
  return `CHARACTER RELATIONSHIPS:\n${lines.join('\n')}`;
}

// ── 2. NPC Personality Profiles ────────────────────────────────

export interface NpcPersonality {
  npcId: string;
  name: string;
  temperament: 'calm' | 'volatile' | 'cheerful' | 'melancholic' | 'aggressive' | 'nervous';
  speechStyle: 'formal' | 'casual' | 'gruff' | 'poetic' | 'terse' | 'flowery';
  profession: string;
  goal: string;
  secret: string;
  fear: string;
  reputation: string;
}

export function buildNpcPersonalityContext(npcs: NpcPersonality[]): string {
  if (npcs.length === 0) return '';
  const lines = npcs.map(n =>
    `${n.name} (${n.profession}): ${n.temperament}, speaks ${n.speechStyle}. ` +
    `Goal: ${n.goal}. Fear: ${n.fear}. Rep: ${n.reputation}.`
  );
  return `NPC PERSONALITIES:\n${lines.join('\n')}`;
}

// ── 3. NPC Memory System ───────────────────────────────────────

export interface NpcMemoryEntry {
  npcId: string;
  characterId: string;
  action: 'help' | 'trade' | 'insult' | 'violence' | 'betrayal' | 'gift' | 'rescue' | 'threat';
  description: string;
  dayOccurred: number;
  impactWeight: number; // 1-10
}

export interface NpcMemoryBank {
  entries: NpcMemoryEntry[];
}

export function createNpcMemoryBank(): NpcMemoryBank {
  return { entries: [] };
}

export function recordNpcMemory(bank: NpcMemoryBank, entry: NpcMemoryEntry): NpcMemoryBank {
  return { entries: [...bank.entries, entry].slice(-200) };
}

export function getNpcMemoriesAbout(bank: NpcMemoryBank, npcId: string, characterId: string): NpcMemoryEntry[] {
  return bank.entries.filter(e => e.npcId === npcId && e.characterId === characterId);
}

export function buildNpcMemoryContext(bank: NpcMemoryBank, npcId: string, characterId: string): string {
  const memories = getNpcMemoriesAbout(bank, npcId, characterId);
  if (memories.length === 0) return '';
  const lines = memories.slice(-5).map(m => `[Day ${m.dayOccurred}] ${m.action}: ${m.description}`);
  return `NPC MEMORIES OF PLAYER:\n${lines.join('\n')}`;
}

// ── 4. Adaptive Quest Generator ────────────────────────────────

export type QuestStage = 'seed' | 'active' | 'escalating' | 'climax' | 'resolved';

export interface StoryArc {
  id: string;
  title: string;
  stage: QuestStage;
  stages: string[];
  currentStageIndex: number;
  locations: string[];
  participants: string[];
  stakes: string;
  status: 'active' | 'paused' | 'resolved' | 'failed';
  createdDay: number;
}

export interface StoryArcTracker {
  arcs: StoryArc[];
}

export function createStoryArcTracker(): StoryArcTracker {
  return { arcs: [] };
}

export function addStoryArc(tracker: StoryArcTracker, arc: StoryArc): StoryArcTracker {
  return { arcs: [...tracker.arcs, arc].slice(-20) };
}

export function advanceArc(tracker: StoryArcTracker, arcId: string): StoryArcTracker {
  return {
    arcs: tracker.arcs.map(a => {
      if (a.id !== arcId) return a;
      const nextIndex = Math.min(a.currentStageIndex + 1, a.stages.length - 1);
      const stages: QuestStage[] = ['seed', 'active', 'escalating', 'climax', 'resolved'];
      const nextStage = stages[Math.min(nextIndex, stages.length - 1)];
      return { ...a, currentStageIndex: nextIndex, stage: nextStage, status: nextStage === 'resolved' ? 'resolved' : 'active' };
    }),
  };
}

export function buildStoryArcContext(tracker: StoryArcTracker): string {
  const active = tracker.arcs.filter(a => a.status === 'active');
  if (active.length === 0) return '';
  const lines = active.map(a =>
    `• ${a.title} [${a.stage}]: ${a.stages[a.currentStageIndex] || 'unknown'}. Stakes: ${a.stakes}. Locations: ${a.locations.join(', ')}.`
  );
  return `ACTIVE STORY ARCS (reference naturally):\n${lines.join('\n')}`;
}

// ── 5. Exploration Discovery System ────────────────────────────

export type DiscoveryType = 'cave' | 'ruins' | 'camp' | 'structure' | 'path' | 'battlefield' | 'shrine' | 'settlement';

export interface ExplorationDiscovery {
  id: string;
  type: DiscoveryType;
  name: string;
  description: string;
  zone: string;
  discoveredDay: number;
  explored: boolean;
}

export interface DiscoveryRegistry {
  discoveries: ExplorationDiscovery[];
}

export function createDiscoveryRegistry(): DiscoveryRegistry {
  return { discoveries: [] };
}

export function registerDiscovery(registry: DiscoveryRegistry, discovery: ExplorationDiscovery): DiscoveryRegistry {
  return { discoveries: [...registry.discoveries, discovery] };
}

export function buildDiscoveryContext(registry: DiscoveryRegistry, zone: string): string {
  const nearby = registry.discoveries.filter(d => d.zone === zone);
  const unexplored = nearby.filter(d => !d.explored);
  if (nearby.length === 0) return '';
  const lines = nearby.map(d => `${d.name} (${d.type})${d.explored ? ' [explored]' : ' [unexplored]'}: ${d.description}`);
  return `KNOWN DISCOVERIES IN AREA:\n${lines.join('\n')}`;
}

// ── 6. Living Location System ──────────────────────────────────

export interface LocationHistory {
  locationId: string;
  locationName: string;
  events: LocationEvent[];
}

export interface LocationEvent {
  type: 'battle' | 'destruction' | 'npc_death' | 'faction_change' | 'environmental_damage' | 'discovery' | 'construction';
  description: string;
  dayOccurred: number;
}

export interface LocationMemorySystem {
  locations: Map<string, LocationHistory>;
}

export function createLocationMemorySystem(): LocationMemorySystem {
  return { locations: new Map() };
}

export function recordLocationEvent(system: LocationMemorySystem, locationId: string, locationName: string, event: LocationEvent): LocationMemorySystem {
  const existing = system.locations.get(locationId) || { locationId, locationName, events: [] };
  existing.events = [...existing.events, event].slice(-50);
  const newMap = new Map(system.locations);
  newMap.set(locationId, existing);
  return { locations: newMap };
}

export function buildLocationHistoryContext(system: LocationMemorySystem, locationId: string): string {
  const history = system.locations.get(locationId);
  if (!history || history.events.length === 0) return '';
  const lines = history.events.slice(-5).map(e => `[Day ${e.dayOccurred}] ${e.type}: ${e.description}`);
  return `LOCATION HISTORY (${history.locationName}):\n${lines.join('\n')}\nNarration should reflect these past events — scars, changes, memories.`;
}

// ── 7. Living Economy ──────────────────────────────────────────

export interface EconomyItem {
  name: string;
  category: 'consumable' | 'equipment' | 'enhancement' | 'service';
  basePrice: number;
  currentPrice: number;
  availability: 'common' | 'uncommon' | 'rare' | 'scarce';
}

export interface LivingEconomy {
  items: EconomyItem[];
  priceMultiplier: number; // affected by world events
  lastUpdate: number;
}

export function createLivingEconomy(): LivingEconomy {
  const baseItems: EconomyItem[] = [
    // Consumables
    { name: 'Bandages', category: 'consumable', basePrice: 5, currentPrice: 5, availability: 'common' },
    { name: 'Healing Salve', category: 'consumable', basePrice: 15, currentPrice: 15, availability: 'common' },
    { name: 'Rations', category: 'consumable', basePrice: 3, currentPrice: 3, availability: 'common' },
    { name: 'Water Skin', category: 'consumable', basePrice: 2, currentPrice: 2, availability: 'common' },
    { name: 'Stimulant', category: 'consumable', basePrice: 25, currentPrice: 25, availability: 'uncommon' },
    // Equipment
    { name: 'Sword', category: 'equipment', basePrice: 50, currentPrice: 50, availability: 'common' },
    { name: 'Axe', category: 'equipment', basePrice: 45, currentPrice: 45, availability: 'common' },
    { name: 'Spear', category: 'equipment', basePrice: 35, currentPrice: 35, availability: 'common' },
    { name: 'Bow', category: 'equipment', basePrice: 60, currentPrice: 60, availability: 'uncommon' },
    { name: 'Crossbow', category: 'equipment', basePrice: 80, currentPrice: 80, availability: 'uncommon' },
    { name: 'Shield', category: 'equipment', basePrice: 40, currentPrice: 40, availability: 'common' },
    { name: 'Light Armor', category: 'equipment', basePrice: 75, currentPrice: 75, availability: 'common' },
    { name: 'Heavy Armor', category: 'equipment', basePrice: 150, currentPrice: 150, availability: 'rare' },
    // Enhancements
    { name: 'Weapon Sharpening', category: 'enhancement', basePrice: 20, currentPrice: 20, availability: 'common' },
    { name: 'Reinforced Armor', category: 'enhancement', basePrice: 40, currentPrice: 40, availability: 'uncommon' },
    { name: 'Balanced Weapon', category: 'enhancement', basePrice: 30, currentPrice: 30, availability: 'uncommon' },
    { name: 'Improved Grip', category: 'enhancement', basePrice: 15, currentPrice: 15, availability: 'common' },
    // Services
    { name: 'Weapon Repair', category: 'service', basePrice: 10, currentPrice: 10, availability: 'common' },
    { name: 'Armor Repair', category: 'service', basePrice: 15, currentPrice: 15, availability: 'common' },
    { name: 'Horse Rental', category: 'service', basePrice: 30, currentPrice: 30, availability: 'uncommon' },
    { name: 'Map Purchase', category: 'service', basePrice: 20, currentPrice: 20, availability: 'uncommon' },
    { name: 'Local Information', category: 'service', basePrice: 5, currentPrice: 5, availability: 'common' },
  ];
  return { items: baseItems, priceMultiplier: 1.0, lastUpdate: 0 };
}

export function updateEconomyPrices(economy: LivingEconomy, dangerLevel: number, tradeDisrupted: boolean): LivingEconomy {
  const multiplier = 1.0 + (dangerLevel * 0.05) + (tradeDisrupted ? 0.3 : 0);
  const items = economy.items.map(item => ({
    ...item,
    currentPrice: Math.round(item.basePrice * multiplier * (item.availability === 'scarce' ? 2.0 : item.availability === 'rare' ? 1.5 : 1.0)),
  }));
  return { ...economy, items, priceMultiplier: multiplier, lastUpdate: Date.now() };
}

export function buildEconomyContext(economy: LivingEconomy): string {
  if (economy.priceMultiplier > 1.2) {
    return `ECONOMY NOTE: Prices are elevated (${Math.round((economy.priceMultiplier - 1) * 100)}% above normal) due to regional instability. Merchants may mention supply issues.`;
  }
  return '';
}

// ── 8. Injury System ───────────────────────────────────────────

export type InjuryType = 'arm_injury' | 'leg_injury' | 'bleeding' | 'fatigue' | 'broken_weapon' | 'concussion' | 'burns' | 'frostbite';

export interface ActiveInjury {
  type: InjuryType;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  turnInflicted: number;
  healed: boolean;
}

export interface InjuryTracker {
  injuries: ActiveInjury[];
}

export function createInjuryTracker(): InjuryTracker {
  return { injuries: [] };
}

export function addInjury(tracker: InjuryTracker, injury: ActiveInjury): InjuryTracker {
  return { injuries: [...tracker.injuries, injury] };
}

export function healInjury(tracker: InjuryTracker, index: number): InjuryTracker {
  return {
    injuries: tracker.injuries.map((inj, i) => i === index ? { ...inj, healed: true } : inj),
  };
}

export function buildInjuryContext(tracker: InjuryTracker): string {
  const active = tracker.injuries.filter(i => !i.healed);
  if (active.length === 0) return '';
  const lines = active.map(i => `${i.type} (${i.severity}): ${i.description}`);
  return `ACTIVE INJURIES (affect capabilities):\n${lines.join('\n')}\nNarration should reflect how injuries limit movement, combat, and perception.`;
}

// ── 9. Tactical Environment Combat ─────────────────────────────

export interface TacticalEnvironment {
  terrain: string;
  lighting: 'bright' | 'dim' | 'dark' | 'pitch_black';
  cover: { location: string; quality: 'none' | 'partial' | 'full' }[];
  elevation: { zone: string; height: 'ground' | 'elevated' | 'high_ground' | 'below' }[];
  obstacles: string[];
  weatherEffect: string | null;
}

export function buildTacticalCombatContext(env: TacticalEnvironment): string {
  const parts: string[] = ['TACTICAL ENVIRONMENT (influence combat narration):'];
  parts.push(`Terrain: ${env.terrain}. Lighting: ${env.lighting}.`);
  if (env.cover.length > 0) {
    parts.push(`Cover: ${env.cover.map(c => `${c.location} (${c.quality})`).join(', ')}.`);
  }
  if (env.elevation.length > 0) {
    parts.push(`Elevation: ${env.elevation.map(e => `${e.zone}: ${e.height}`).join(', ')}.`);
  }
  if (env.obstacles.length > 0) {
    parts.push(`Obstacles: ${env.obstacles.join(', ')}.`);
  }
  if (env.weatherEffect) {
    parts.push(`Weather: ${env.weatherEffect}.`);
  }
  return parts.join('\n');
}

// ── 10. Rumor System ───────────────────────────────────────────

export interface Rumor {
  id: string;
  text: string;
  origin: string;
  spreadLevel: number; // 1-5
  truthfulness: number; // 0-100
  dayCreated: number;
  heard: boolean;
}

export interface RumorTracker {
  rumors: Rumor[];
}

export function createRumorTracker(): RumorTracker {
  return { rumors: [] };
}

export function addRumor(tracker: RumorTracker, rumor: Rumor): RumorTracker {
  return { rumors: [...tracker.rumors, rumor].slice(-30) };
}

export function buildRumorContext(tracker: RumorTracker): string {
  const spreadable = tracker.rumors.filter(r => !r.heard && r.spreadLevel >= 2);
  if (spreadable.length === 0) return '';
  const lines = spreadable.slice(0, 3).map(r => `"${r.text}" (from ${r.origin}, spread: ${r.spreadLevel}/5)`);
  return `ACTIVE RUMORS (NPCs may mention during conversation):\n${lines.join('\n')}`;
}

// ── 11. Campaign Journal ───────────────────────────────────────

export type JournalEntryType = 'discovery' | 'alliance' | 'battle' | 'decision' | 'location' | 'quest_update' | 'npc_met' | 'item_acquired';

export interface JournalEntry {
  type: JournalEntryType;
  title: string;
  description: string;
  dayOccurred: number;
  zone: string;
  participants: string[];
}

export interface CampaignJournal {
  entries: JournalEntry[];
}

export function createCampaignJournal(): CampaignJournal {
  return { entries: [] };
}

export function addJournalEntry(journal: CampaignJournal, entry: JournalEntry): CampaignJournal {
  return { entries: [...journal.entries, entry].slice(-100) };
}

export function buildJournalContext(journal: CampaignJournal, recentCount: number = 5): string {
  if (journal.entries.length === 0) return '';
  const recent = journal.entries.slice(-recentCount);
  const lines = recent.map(e => `[Day ${e.dayOccurred}] ${e.type}: ${e.title} — ${e.description}`);
  return `RECENT JOURNAL ENTRIES:\n${lines.join('\n')}`;
}

// ── 12. Player Influence System ────────────────────────────────

export interface WorldInfluence {
  action: string;
  consequence: string;
  affectedZone: string;
  dayOccurred: number;
  magnitude: 'minor' | 'moderate' | 'major';
}

export interface PlayerInfluenceTracker {
  influences: WorldInfluence[];
}

export function createPlayerInfluenceTracker(): PlayerInfluenceTracker {
  return { influences: [] };
}

export function recordInfluence(tracker: PlayerInfluenceTracker, influence: WorldInfluence): PlayerInfluenceTracker {
  return { influences: [...tracker.influences, influence].slice(-50) };
}

export function buildInfluenceContext(tracker: PlayerInfluenceTracker, zone: string): string {
  const relevant = tracker.influences.filter(i => i.affectedZone === zone);
  if (relevant.length === 0) return '';
  const lines = relevant.map(i => `${i.action} → ${i.consequence} (${i.magnitude})`);
  return `PLAYER INFLUENCE ON THIS AREA:\n${lines.join('\n')}\nThe world should reflect these changes.`;
}

// ── 13. Narrative Attention System ─────────────────────────────

export interface NarrativeEvent {
  description: string;
  importance: number;      // 1-10
  danger: number;           // 1-10
  storyRelevance: number;   // 1-10
  rarity: number;           // 1-10
  playerInvolvement: number;// 1-10
  emotionalImpact: number;  // 1-10
}

export function calculateAttentionScore(event: NarrativeEvent): number {
  return (
    event.importance * 2 +
    event.danger * 1.5 +
    event.storyRelevance * 2 +
    event.rarity * 1 +
    event.playerInvolvement * 1.5 +
    event.emotionalImpact * 2
  ) / 10;
}

export function shouldEmphasize(event: NarrativeEvent): boolean {
  return calculateAttentionScore(event) >= 5;
}

export function buildAttentionContext(events: NarrativeEvent[]): string {
  const emphasized = events.filter(shouldEmphasize);
  if (emphasized.length === 0) return '';
  const lines = emphasized.map(e => `[Priority ${calculateAttentionScore(e).toFixed(1)}] ${e.description}`);
  return `NARRATIVE EMPHASIS (give these events more descriptive weight):\n${lines.join('\n')}`;
}

// ── 14. Player Creativity Recognition Engine ───────────────────

export interface CreativitySignal {
  action: string;
  creativityScore: number; // 1-10
  type: 'environmental_use' | 'unconventional_tactic' | 'roleplay_depth' | 'problem_solving' | 'narrative_contribution';
  turn: number;
}

export interface CreativityTracker {
  signals: CreativitySignal[];
  cumulativeScore: number;
  recognitionsGiven: number;
}

export function createCreativityTracker(): CreativityTracker {
  return { signals: [], cumulativeScore: 0, recognitionsGiven: 0 };
}

const CREATIVITY_PATTERNS: { pattern: RegExp; type: CreativitySignal['type']; score: number }[] = [
  { pattern: /use.*(environment|terrain|debris|rubble|furniture|vehicle)/i, type: 'environmental_use', score: 7 },
  { pattern: /combine|improvise|redirect|repurpose/i, type: 'unconventional_tactic', score: 8 },
  { pattern: /feels?|remember|reflect|confess|admit/i, type: 'roleplay_depth', score: 6 },
  { pattern: /figure out|deduce|realize|connect|piece together/i, type: 'problem_solving', score: 7 },
  { pattern: /write|carve|sing|paint|create|build|craft/i, type: 'narrative_contribution', score: 6 },
];

export function detectCreativity(text: string, turn: number): CreativitySignal | null {
  for (const { pattern, type, score } of CREATIVITY_PATTERNS) {
    if (pattern.test(text)) {
      return { action: text.slice(0, 100), creativityScore: score, type, turn };
    }
  }
  return null;
}

export function recordCreativity(tracker: CreativityTracker, signal: CreativitySignal): CreativityTracker {
  return {
    signals: [...tracker.signals, signal].slice(-50),
    cumulativeScore: tracker.cumulativeScore + signal.creativityScore,
    recognitionsGiven: tracker.recognitionsGiven,
  };
}

export function buildCreativityContext(tracker: CreativityTracker): string {
  if (tracker.cumulativeScore < 10) return '';
  const recent = tracker.signals.slice(-3);
  const avgScore = recent.reduce((s, c) => s + c.creativityScore, 0) / recent.length;
  if (avgScore >= 6) {
    return 'CREATIVITY RECOGNITION: Player shows high creativity. Reward with richer narrative responses, unexpected outcomes, and environmental opportunities that match their style.';
  }
  return '';
}

// ── 15. Dynamic Story Arc System (extends StoryArcTracker) ─────

export function detectArcProgression(arcs: StoryArc[], playerAction: string): string | null {
  const lower = playerAction.toLowerCase();
  for (const arc of arcs) {
    if (arc.status !== 'active') continue;
    const currentStage = arc.stages[arc.currentStageIndex] || '';
    // Check if action keywords match current stage keywords
    const stageWords = currentStage.toLowerCase().split(/\s+/);
    const matches = stageWords.filter(w => w.length > 4 && lower.includes(w));
    if (matches.length >= 2) return arc.id;
  }
  return null;
}

// ── Master Context Builder ─────────────────────────────────────

export interface NarrativeSystemsSnapshot {
  relationships?: RelationshipWeb;
  npcPersonalities?: NpcPersonality[];
  npcMemory?: NpcMemoryBank;
  storyArcs?: StoryArcTracker;
  discoveries?: DiscoveryRegistry;
  locationMemory?: LocationMemorySystem;
  economy?: LivingEconomy;
  injuries?: InjuryTracker;
  tacticalEnv?: TacticalEnvironment;
  rumors?: RumorTracker;
  journal?: CampaignJournal;
  playerInfluence?: PlayerInfluenceTracker;
  attentionEvents?: NarrativeEvent[];
  creativity?: CreativityTracker;
  currentZone?: string;
  characterId?: string;
}

/**
 * Build a comprehensive narrative context string from all active systems.
 * This string is injected into the AI narrator prompt to inform narration.
 */
export function buildUnifiedNarrativeContext(snapshot: NarrativeSystemsSnapshot): string {
  const sections: string[] = [];

  if (snapshot.relationships && snapshot.characterId) {
    const ctx = buildRelationshipContext(snapshot.relationships, snapshot.characterId);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.npcPersonalities && snapshot.npcPersonalities.length > 0) {
    sections.push(buildNpcPersonalityContext(snapshot.npcPersonalities));
  }

  if (snapshot.npcMemory && snapshot.characterId) {
    // Build memory context for nearby NPCs
    const npcIds = new Set(snapshot.npcMemory.entries.map(e => e.npcId));
    for (const npcId of Array.from(npcIds).slice(0, 5)) {
      const ctx = buildNpcMemoryContext(snapshot.npcMemory, npcId, snapshot.characterId);
      if (ctx) sections.push(ctx);
    }
  }

  if (snapshot.storyArcs) {
    const ctx = buildStoryArcContext(snapshot.storyArcs);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.discoveries && snapshot.currentZone) {
    const ctx = buildDiscoveryContext(snapshot.discoveries, snapshot.currentZone);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.locationMemory && snapshot.currentZone) {
    const ctx = buildLocationHistoryContext(snapshot.locationMemory, snapshot.currentZone);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.economy) {
    const ctx = buildEconomyContext(snapshot.economy);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.injuries) {
    const ctx = buildInjuryContext(snapshot.injuries);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.tacticalEnv) {
    sections.push(buildTacticalCombatContext(snapshot.tacticalEnv));
  }

  if (snapshot.rumors) {
    const ctx = buildRumorContext(snapshot.rumors);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.journal) {
    const ctx = buildJournalContext(snapshot.journal);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.playerInfluence && snapshot.currentZone) {
    const ctx = buildInfluenceContext(snapshot.playerInfluence, snapshot.currentZone);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.attentionEvents && snapshot.attentionEvents.length > 0) {
    const ctx = buildAttentionContext(snapshot.attentionEvents);
    if (ctx) sections.push(ctx);
  }

  if (snapshot.creativity) {
    const ctx = buildCreativityContext(snapshot.creativity);
    if (ctx) sections.push(ctx);
  }

  if (sections.length === 0) return '';
  return '\n\nINTEGRATED NARRATIVE SYSTEMS:\n' + sections.join('\n\n');
}
