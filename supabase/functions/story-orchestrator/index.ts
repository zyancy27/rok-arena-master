import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NARRATIVE ORCHESTRATOR — The Dungeon Master's Brain (v3)
//
// Pipeline:
//   Player Action
//   → Priority Classification
//   → Narrative Director (mode detection)
//   → Regional Grid (zone data)
//   → World Context (sentiment, events, NPCs)
//   → Priority Gating (suppress irrelevant systems)
//   → Lore Consistency (proactive rules)
//   → Character Psychology (emotional state)
//   → Relationship Context
//   → Story Gravity (theme biasing)
//   → Battle Narrator (enriched context)
//   → Sound Extraction
//   → Sentiment Update
//   → Response
// ═══════════════════════════════════════════════════════════════

// ─── Event Priority System ─────────────────────────────────────
type EventPriority = 'critical' | 'important' | 'ambient';

interface PipelineEvent {
  type: string;
  priority: EventPriority;
  data: any;
}

function classifyEventPriority(action: string, context: any): EventPriority {
  const lower = action.toLowerCase();
  if (context.diceResult || context.defenseResult) return 'critical';
  if (/\b(die|death|kill|destroy|explode|collapse)\b/.test(lower)) return 'critical';
  if (context.activeEnemies?.length > 0) return 'critical';
  if (/\b(talk|ask|speak|say|tell|question|negotiate|trade|buy|sell)\b/.test(lower)) return 'important';
  if (context.knownNpcs?.length > 0 && /\b(approach|greet|wave|call)\b/.test(lower)) return 'important';
  return 'ambient';
}

// ─── Narrative Priority Engine (Server-side) ───────────────────
type NarrativeFocus = 'combat' | 'environment' | 'dialogue' | 'exploration' | 'discovery' | 'investigation' | 'social' | 'economy' | 'travel' | 'rest' | 'crisis';

interface PriorityStack {
  activeFocuses: NarrativeFocus[];
  suppressedSystems: string[];
  dominantMode: NarrativeFocus;
}

function calculateServerPriorityStack(action: string, context: any): PriorityStack {
  const scores: Record<NarrativeFocus, number> = {
    combat: 0, environment: 5, dialogue: 0, exploration: 5,
    discovery: 0, investigation: 0, social: 0, economy: 0,
    travel: 0, rest: 0, crisis: 0,
  };
  const lower = action.toLowerCase();

  // Combat signals
  if (/\b(attack|strike|slash|stab|shoot|cast|fight|block|dodge|parry|charge|fire)\b/i.test(lower)) scores.combat += 40;
  if (context.activeEnemies?.length > 0) scores.combat += 30 + (context.activeEnemies.length * 10);
  
  // Dialogue signals
  if (/\b(talk|speak|ask|say|tell|question|negotiate|greet|converse)\b/i.test(lower)) scores.dialogue += 35;
  if (context.knownNpcs?.length > 0 && /\b(approach|greet|wave)\b/i.test(lower)) scores.dialogue += 25;

  // Investigation
  if (/\b(search|examine|inspect|investigate|look|study|analyze|check|read)\b/i.test(lower)) scores.investigation += 30;

  // Exploration / Travel
  if (/\b(explore|wander|travel|walk|move|head|go|enter|leave|climb)\b/i.test(lower)) scores.exploration += 25;

  // Social / Economy
  if (/\b(trade|buy|sell|barter|haggle|shop|merchant|market)\b/i.test(lower)) { scores.social += 25; scores.economy += 25; }

  // Rest
  if (/\b(rest|sleep|camp|meditate|heal|recover|wait)\b/i.test(lower)) scores.rest += 35;

  // Environmental interaction
  if (/\b(use|activate|open|close|push|pull|break|destroy|build|repair)\b/i.test(lower)) scores.environment += 20;

  // Crisis from danger
  const dangerLevel = context.dangerLevel || 0;
  if (dangerLevel >= 8) scores.crisis += 40;
  if (dangerLevel >= 5) { scores.combat += 15; scores.environment += 10; }

  // Sort and pick top focuses
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a) as [NarrativeFocus, number][];
  const activeFocuses = sorted.filter(([, s]) => s >= 15).slice(0, 3).map(([f]) => f);
  const dominantMode = sorted[0][0];

  // Determine suppressed systems
  const suppressed: string[] = [];
  const hasCombat = activeFocuses.includes('combat') || activeFocuses.includes('crisis');
  if (hasCombat) suppressed.push('economy_details', 'rumor_mentions', 'exploration_hints', 'rest_descriptions');
  if (activeFocuses.includes('rest')) suppressed.push('combat_details', 'hazard_escalation', 'enemy_behavior');
  if (activeFocuses.includes('dialogue') && !hasCombat) suppressed.push('environment_details', 'hazard_escalation');

  return { activeFocuses, suppressedSystems: [...new Set(suppressed)], dominantMode };
}

// ─── Narrative Director (Server-side mode detection) ───────────
type NarrativeMode = 'exploration' | 'combat' | 'dialogue' | 'investigation' | 'travel' | 'rest' | 'crisis' | 'mystery' | 'stealth';

interface NarrativeDirective {
  mode: NarrativeMode;
  tone: string;
  pacing: string;
  emphasize: string[];
  deemphasize: string[];
}

function detectNarrativeMode(action: string, context: any, priority: PriorityStack): NarrativeDirective {
  const mode = priority.dominantMode as NarrativeMode;
  
  const CONFIGS: Record<string, { tone: string; pacing: string; emphasize: string[]; deemphasize: string[] }> = {
    combat: { tone: 'intense and tactical', pacing: 'urgent', emphasize: ['combat_descriptions', 'tactical_terrain', 'injury_effects'], deemphasize: ['economy', 'lore_exposition'] },
    dialogue: { tone: 'character-driven', pacing: 'measured', emphasize: ['npc_personality', 'relationships', 'information'], deemphasize: ['environment_details', 'combat'] },
    exploration: { tone: 'curious and atmospheric', pacing: 'measured', emphasize: ['environment', 'discovery_hints', 'world_building'], deemphasize: ['combat_mechanics'] },
    investigation: { tone: 'analytical and suspenseful', pacing: 'slow', emphasize: ['clues', 'environmental_details', 'npc_reactions'], deemphasize: ['combat', 'economy'] },
    crisis: { tone: 'tense and high-stakes', pacing: 'urgent', emphasize: ['threats', 'consequences', 'decision_pressure'], deemphasize: ['casual_descriptions', 'economy'] },
    rest: { tone: 'contemplative', pacing: 'slow', emphasize: ['character_reflection', 'recovery', 'ambient_sounds'], deemphasize: ['combat', 'threat_warnings'] },
    travel: { tone: 'scenic', pacing: 'brisk', emphasize: ['landscape', 'regional_changes', 'encounters'], deemphasize: ['detailed_combat', 'economy'] },
    mystery: { tone: 'atmospheric and suspenseful', pacing: 'slow', emphasize: ['clues', 'atmosphere', 'secrets'], deemphasize: ['combat', 'economy'] },
    social: { tone: 'character-driven', pacing: 'measured', emphasize: ['npc_personality', 'relationships'], deemphasize: ['combat'] },
    economy: { tone: 'grounded', pacing: 'measured', emphasize: ['prices', 'supply', 'merchant_personality'], deemphasize: ['combat'] },
    stealth: { tone: 'tense', pacing: 'measured', emphasize: ['sound_cues', 'enemy_awareness', 'cover'], deemphasize: ['loud_descriptions'] },
    discovery: { tone: 'wonder', pacing: 'slow', emphasize: ['environment', 'clues', 'history'], deemphasize: ['combat'] },
  };

  const config = CONFIGS[mode] || CONFIGS.exploration;
  return { mode: mode as NarrativeMode, ...config };
}

// ─── Shared Pipeline Context ───────────────────────────────────
interface OrchestratorContext {
  player_action: string;
  character_state: any;
  world_state: any;
  campaign_state: any;
  campaign_brain: any | null;
  npc_context: any[];
  active_enemies: any[];
  conversation_history: any[];
  event_priority: EventPriority;
  priority_stack: PriorityStack;
  narrative_directive: NarrativeDirective | null;
  battle_results: any | null;
  narrator_sentiment: any | null;
  narration_result: any | null;
  sound_events: SoundEvent[];
  errors: PipelineError[];
  cached_sentiment: any | null;
  auth_header: string;
  api_key: string;
  supabase_url: string;
  body?: any;
  /** Shared admin client — created once in the main handler */
  supabaseAdmin: ReturnType<typeof createClient>;
}

interface SoundEvent {
  type: string;
  trigger_phrase: string;
  intensity?: 'soft' | 'medium' | 'loud';
}

interface PipelineError {
  step: string;
  error: string;
  recoverable: boolean;
}

// ─── Sound Extraction from Narration ───────────────────────────
function extractSoundEvents(narrationText: string): SoundEvent[] {
  if (!narrationText) return [];
  const events: SoundEvent[] = [];

  const soundPatterns: { pattern: RegExp; type: string; intensity: 'soft' | 'medium' | 'loud' }[] = [
    { pattern: /metal\s+(groan|creak|screech|clang|ring)s?/gi, type: 'metal_impact', intensity: 'medium' },
    { pattern: /sword\s+(clash|clang|ring)s?|blade\s+(clash|ring)s?/gi, type: 'sword_clash', intensity: 'loud' },
    { pattern: /chains?\s+(rattle|clank|clink)s?/gi, type: 'chains', intensity: 'medium' },
    { pattern: /water\s+(roar|rush|crash|splash)s?/gi, type: 'waterfall', intensity: 'loud' },
    { pattern: /rain\s+(hammer|pound|pelt|drum)s?/gi, type: 'rain_heavy', intensity: 'medium' },
    { pattern: /drip|water\s+drops?/gi, type: 'water_drip', intensity: 'soft' },
    { pattern: /fire\s+(crackle|roar|hiss)s?|flame\s+(flicker|dance|lick)s?/gi, type: 'fire_crackle', intensity: 'medium' },
    { pattern: /explosion|blast|detonat/gi, type: 'explosion', intensity: 'loud' },
    { pattern: /wind\s+(howl|whistle|gust|moan)s?/gi, type: 'wind_gust', intensity: 'medium' },
    { pattern: /thunder\s+(crack|boom|rumble|roll)s?|lightning\s+(strike|flash|crack)s?/gi, type: 'thunder_crack', intensity: 'loud' },
    { pattern: /branch(es)?\s+(snap|crack|break)/gi, type: 'branches', intensity: 'soft' },
    { pattern: /bird|birdsong/gi, type: 'birds', intensity: 'soft' },
    { pattern: /(wall|floor|ceiling|structure|building|roof|pillar)\s+(collapse|crumble|shatter|crack|buckle)s?/gi, type: 'collapse', intensity: 'loud' },
    { pattern: /glass\s+(shatter|break|crack)s?/gi, type: 'glass', intensity: 'medium' },
    { pattern: /door\s+(slam|bang|creak|open)s?/gi, type: 'door_open', intensity: 'medium' },
    { pattern: /impact|crash|slam|smash/gi, type: 'impact', intensity: 'loud' },
    { pattern: /arrow\s+(whistle|whoosh|fly|streak)/gi, type: 'arrow', intensity: 'medium' },
    { pattern: /heartbeat|pulse/gi, type: 'heartbeat', intensity: 'soft' },
    { pattern: /silence|quiet|still/gi, type: 'silence', intensity: 'soft' },
    { pattern: /crowd\s+(gasp|roar|murmur|cheer)s?/gi, type: 'crowd', intensity: 'medium' },
    { pattern: /footstep|boot|step/gi, type: 'footsteps', intensity: 'soft' },
    { pattern: /energy\s+(surge|pulse|crackle|hum)s?|magic|arcane/gi, type: 'magic', intensity: 'medium' },
    { pattern: /rumbl(e|ing)|tremor|quake/gi, type: 'rumble', intensity: 'medium' },
  ];

  for (const { pattern, type, intensity } of soundPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(narrationText);
    if (match) {
      events.push({ type, trigger_phrase: match[0], intensity });
    }
  }

  const seen = new Set<string>();
  return events.filter(e => {
    if (seen.has(e.type)) return false;
    seen.add(e.type);
    return true;
  });
}

// ─── Pipeline Step: Fetch World Context ────────────────────────
async function fetchWorldContext(
  ctx: OrchestratorContext,
  characterId: string,
  campaignId: string,
): Promise<void> {
  try {
    const supabaseAdmin = ctx.supabaseAdmin;

    const [sentimentResult, campaignResult, worldEventsResult, worldRumorsResult, worldStateResult, campaignBrainResult] = await Promise.all([
      supabaseAdmin
        .from('narrator_sentiments')
        .select('*')
        .eq('character_id', characterId)
        .maybeSingle(),
      campaignId
        ? supabaseAdmin
            .from('campaigns')
            .select('world_state, story_context, environment_tags, current_zone, time_of_day, day_count, difficulty_scale, campaign_length, genre, tone')
            .eq('id', campaignId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      campaignId
        ? supabaseAdmin
            .from('world_events')
            .select('event_type, location, description, impact_level, story_relevance, player_proximity, participants')
            .eq('campaign_id', campaignId)
            .eq('resolved', false)
            .order('impact_level', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: null, error: null }),
      campaignId
        ? supabaseAdmin
            .from('world_rumors')
            .select('rumor_text, origin_location, spread_level')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: null, error: null }),
      campaignId
        ? supabaseAdmin
            .from('world_state')
            .select('region_name, environment_conditions, danger_level, npc_activity_summary, faction_activity_summary')
            .eq('campaign_id', campaignId)
            .limit(5)
        : Promise.resolve({ data: null, error: null }),
      campaignId
        ? supabaseAdmin
            .from('campaign_brain')
            .select('*')
            .eq('campaign_id', campaignId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (sentimentResult.data) {
      ctx.cached_sentiment = sentimentResult.data;
      ctx.narrator_sentiment = {
        nickname: sentimentResult.data.nickname,
        sentiment_score: sentimentResult.data.sentiment_score,
        opinion_summary: sentimentResult.data.opinion_summary,
        personality_notes: sentimentResult.data.personality_notes,
        memorable_moments: sentimentResult.data.memorable_moments || [],
        relationship_stage: sentimentResult.data.relationship_stage,
        curiosity: sentimentResult.data.curiosity,
        respect: sentimentResult.data.respect,
        trust: sentimentResult.data.trust,
        amusement: sentimentResult.data.amusement,
        disappointment: sentimentResult.data.disappointment,
        intrigue: sentimentResult.data.intrigue,
        story_value: sentimentResult.data.story_value,
        narrator_observations: sentimentResult.data.narrator_observations || [],
        nickname_history: sentimentResult.data.nickname_history || [],
        creativity_score: sentimentResult.data.creativity_score,
        world_interaction_score: sentimentResult.data.world_interaction_score,
        npc_interaction_score: sentimentResult.data.npc_interaction_score,
        exploration_score: sentimentResult.data.exploration_score,
        combat_style_score: sentimentResult.data.combat_style_score,
        story_engagement_score: sentimentResult.data.story_engagement_score,
        story_compatibility: sentimentResult.data.story_compatibility,
      };
    }

    if (campaignResult?.data) {
      ctx.campaign_state = {
        ...ctx.campaign_state,
        world_state: campaignResult.data.world_state,
        story_context: campaignResult.data.story_context,
        environment_tags: campaignResult.data.environment_tags,
        current_zone: campaignResult.data.current_zone,
        time_of_day: campaignResult.data.time_of_day,
        day_count: campaignResult.data.day_count,
        difficulty_scale: campaignResult.data.difficulty_scale,
        campaign_length: campaignResult.data.campaign_length,
        genre: campaignResult.data.genre,
        tone: campaignResult.data.tone,
      };
    }

    if (campaignBrainResult?.data) {
      ctx.campaign_brain = campaignBrainResult.data;
    }

    ctx.world_state = {
      ...ctx.world_state,
      active_world_events: worldEventsResult?.data || [],
      world_rumors: worldRumorsResult?.data || [],
      regional_states: worldStateResult?.data || [],
    };
  } catch (e) {
    ctx.errors.push({
      step: 'fetch_world_context',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
  }
}

// ─── Pipeline Step: Call Battle Narrator ────────────────────────
async function callBattleNarrator(
  ctx: OrchestratorContext,
  originalBody: any,
): Promise<void> {
  try {
    const livingWorldContext = buildLivingWorldContext(ctx);
    const enrichedBody = {
      ...originalBody,
      narratorSentiment: ctx.narrator_sentiment,
      livingWorldContext,
    };

    const response = await fetch(
      `${ctx.supabase_url}/functions/v1/battle-narrator`,
      {
        method: 'POST',
        headers: {
          'Authorization': ctx.auth_header,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify(enrichedBody),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`battle-narrator returned ${response.status}: ${errText.substring(0, 200)}`);
    }

    const result = await response.json();
    ctx.narration_result = result;

    const narrationText = result.narration || result.intro || '';
    if (narrationText) {
      ctx.sound_events = extractSoundEvents(narrationText);
    }
  } catch (e) {
    ctx.errors.push({
      step: 'battle_narrator',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
    const action = ctx.body?.playerAction || ctx.body?.message || '';
    const zone = ctx.body?.currentZone || 'the area';
    const charName = ctx.body?.playerCharacter?.name || 'The adventurer';
    const actionLower = action.toLowerCase();
    let fallback: string;
    if (actionLower.includes('look') || actionLower.includes('search') || actionLower.includes('examine')) {
      fallback = `${charName} scans ${zone} with careful eyes. The world holds its secrets close, but patience reveals subtle details — a shifting shadow, a distant echo, the faintest trace of something waiting to be discovered.`;
    } else if (actionLower.includes('attack') || actionLower.includes('fight') || actionLower.includes('strike')) {
      fallback = `${charName} lashes out with purpose. The force of the action disturbs the stillness of ${zone} — dust rises, echoes rebound, and for a heartbeat the world holds its breath before settling into a new equilibrium.`;
    } else {
      fallback = `${charName} acts with resolve in ${zone}. The surroundings shift subtly in response — the air changes, the light adjusts, and the world acknowledges the disturbance with quiet, living attention.`;
    }
    ctx.narration_result = { narration: fallback };
  }
}

// ─── Tension Classification (Server-side Pressure Engine v2) ──
type TensionLevel = 'low_pressure' | 'rising_tension' | 'urgent_danger' | 'crisis' | 'aftermath';

interface TensionClassification {
  level: TensionLevel;
  intensity: number;
  guidance: { tone: string; pacing: string; npcUrgency: string; environmentEmphasis: string; detailFocus: string };
  sources: string[];
}

function classifyServerTension(ctx: OrchestratorContext): TensionClassification {
  let intensity = 0;
  const sources: string[] = [];

  // Enemy threat
  const enemies = ctx.active_enemies?.length || 0;
  if (enemies > 0) { intensity += Math.min(40, enemies * 15); sources.push(`enemy_threat:${enemies}`); }

  // Environmental danger
  const dangerLevel = (ctx.world_state?.regional_states || []).reduce((max: number, r: any) => Math.max(max, r.danger_level || 0), 0);
  if (dangerLevel >= 4) { intensity += dangerLevel * 5; sources.push(`environmental_danger:${dangerLevel}`); }

  // Faction conflicts
  const factions = ctx.world_state?.regional_states?.reduce((sum: number, r: any) => {
    const fa = r.faction_activity_summary;
    return sum + (fa && /conflict|war|tension|dispute/i.test(fa) ? 1 : 0);
  }, 0) || 0;
  if (factions > 0) { intensity += factions * 12; sources.push(`world_instability:${factions}`); }

  // Unresolved events
  const unresolvedCount = (ctx.world_state?.active_world_events || []).length;
  if (unresolvedCount >= 2) { intensity += unresolvedCount * 6; sources.push(`uncertainty:${unresolvedCount}`); }

  intensity = Math.min(100, intensity);

  // Tension guidance map
  const GUIDANCE: Record<TensionLevel, TensionClassification['guidance']> = {
    low_pressure: { tone: 'Calm, reflective', pacing: 'Slow and atmospheric', npcUrgency: 'Relaxed, routine', environmentEmphasis: 'Ambient details, beauty, subtle foreshadowing', detailFocus: 'Character moments, world-building' },
    rising_tension: { tone: 'Uneasy, something building', pacing: 'Measured but alert', npcUrgency: 'Wary, conversations have edge', environmentEmphasis: 'Signs of change — shifting winds, distant sounds', detailFocus: 'Threats just out of sight' },
    urgent_danger: { tone: 'Intense and focused', pacing: 'Fast, short sentences', npcUrgency: 'Alarmed, seeking shelter or sides', environmentEmphasis: 'Hostile terrain, closing opportunities', detailFocus: 'Immediate threats, tactical options' },
    crisis: { tone: 'Maximum intensity', pacing: 'Urgent, kinetic', npcUrgency: 'Panicking, fleeing, fighting', environmentEmphasis: 'Active destruction, collapsing terrain', detailFocus: 'Survival, sacrifice, what the character protects' },
    aftermath: { tone: 'Quiet weight, the storm passed', pacing: 'Slow, heavy', npcUrgency: 'Stunned, grieving, cautiously hopeful', environmentEmphasis: 'Damage, debris, changed landscape', detailFocus: 'Consequences, reflection, identity after the storm' },
  };

  let level: TensionLevel;
  if (intensity >= 71) level = 'crisis';
  else if (intensity >= 46) level = 'urgent_danger';
  else if (intensity >= 21) level = 'rising_tension';
  else level = 'low_pressure';

  return { level, intensity, guidance: GUIDANCE[level], sources };
}

// ─── Emergent Events Detection (Server-side) ──────────────────
interface EmergentEventHint {
  title: string;
  description: string;
  cause: string;
  gravity: number;
  urgency: string;
}

function detectEmergentHints(ctx: OrchestratorContext): EmergentEventHint[] {
  const hints: EmergentEventHint[] = [];
  const regions = ctx.world_state?.regional_states || [];
  const events = ctx.world_state?.active_world_events || [];

  for (const region of regions) {
    const danger = region.danger_level || 0;
    const factionStr = region.faction_activity_summary || '';
    const hasFactionConflict = /conflict|war|tension|dispute/i.test(factionStr);

    // Security events from low guard presence + high danger
    if (danger >= 5 && !events.some((e: any) => e.event_type === 'bandit_activity' && e.location === region.region_name)) {
      hints.push({
        title: 'Security deteriorating',
        description: `Danger level ${danger}/10 in ${region.region_name} with insufficient security response`,
        cause: `Sustained high danger without adequate guard presence`,
        gravity: Math.min(9, danger + 1),
        urgency: danger >= 7 ? 'imminent' : 'developing',
      });
    }

    // Faction power shifts
    if (hasFactionConflict) {
      hints.push({
        title: 'Faction tensions escalating',
        description: `${factionStr} in ${region.region_name}`,
        cause: 'Unresolved faction disputes',
        gravity: 7,
        urgency: 'developing',
      });
    }
  }

  // Economy-driven events from world_state
  const ws = ctx.campaign_state?.world_state || {};
  const economy = ws.economy || {};
  for (const [key, val] of Object.entries(economy)) {
    const e = val as any;
    if (e.price_modifier > 1.5) {
      hints.push({
        title: `${key} shortage`,
        description: `Severe price spike in ${key} (×${e.price_modifier.toFixed(1)})`,
        cause: e.reason || 'Supply disruption',
        gravity: 6,
        urgency: e.price_modifier > 2.0 ? 'active' : 'developing',
      });
    }
  }

  return hints.slice(0, 4); // cap
}

// ─── Character Identity Discovery Context (Server-side) ───────
function buildIdentityDiscoveryContext(ctx: OrchestratorContext): string {
  const ws = ctx.campaign_state?.world_state || {};
  const identity = ws.character_identity_discovery;
  if (!identity) return '';

  const parts: string[] = [];
  const tendencies = identity.emerging_tendencies || [];
  if (tendencies.length > 0) {
    parts.push('CHARACTER TENDENCIES (observed through behavior, NOT assigned):');
    for (const t of tendencies) {
      parts.push(`- ${t.tendency}: observed ${t.count || '?'} times (confidence: ${t.confidence || '?'}%)`);
    }
    parts.push('These can shift. Do NOT announce them. Reflect them subtly in narration.');
    parts.push('The character discovers who they are through play. Never force an arc or destiny.');
  }

  const reflection = identity.pending_reflection;
  if (reflection) {
    parts.push(`\nIDENTITY REFLECTION (weave naturally if appropriate):`);
    parts.push(`"${reflection}"`);
  }

  return parts.join('\n');
}

// ─── Character Depth Context Builder ──────────────────────────
function buildCharacterDepthContext(ctx: OrchestratorContext): string {
  const ws = ctx.campaign_state?.world_state || {};
  const parts: string[] = [];

  // Contradiction patterns
  const contradictions = ws.character_contradictions;
  if (contradictions?.recurring_shifts?.length > 0) {
    parts.push('CHARACTER CONTRADICTIONS (observed, not forced):');
    for (const shift of contradictions.recurring_shifts.slice(0, 3)) {
      parts.push(`- ${shift.tendency}: contradicted ${shift.count} times — may indicate growth or internal conflict`);
    }
    parts.push('When contradictions occur, acknowledge subtly. Never judge or block.');
  }

  // Values under pressure
  const values = ws.character_values;
  if (values?.top_values?.length > 0) {
    parts.push('\nVALUES UNDER PRESSURE (what the character protects when it matters):');
    for (const v of values.top_values.slice(0, 3)) {
      const overStr = v.chosen_over?.length > 0 ? ` (chosen over: ${v.chosen_over.join(', ')})` : '';
      parts.push(`- ${v.value}: chosen ${v.count} times under pressure${overStr}`);
    }
    parts.push('These reveal core character. Reflect subtly. Never announce directly.');
  }

  // Personal triggers
  const triggers = ws.personal_triggers;
  if (triggers?.active_triggers?.length > 0) {
    parts.push('\nPERSONAL TRIGGERS (character history → present resonance):');
    for (const t of triggers.active_triggers.slice(0, 4)) {
      parts.push(`- [${t.category}] keywords: ${(t.keywords || []).slice(0, 3).join(', ')} → from "${t.origin}" (weight: ${t.weight}/5, ${t.valence})`);
    }
    parts.push('If the scene naturally contains these elements, weave emotional resonance subtly.');
  }

  // Silence patterns
  const silence = ws.character_silence;
  if (silence?.patterns?.length > 0) {
    parts.push('\nCHARACTER SILENCE PATTERNS (what the character avoids):');
    for (const p of silence.patterns.slice(0, 3)) {
      parts.push(`- Avoids "${p.subject}" (${p.category}): ${p.count} times`);
    }
    parts.push('Silence communicates. Acknowledge it rarely but meaningfully.');
  }

  // Reputation vs Identity
  const repId = ws.reputation_vs_identity;
  if (repId?.reputation?.length > 0) {
    parts.push('\nEXTERNAL REPUTATION:');
    for (const r of repId.reputation.slice(0, 3)) {
      parts.push(`- ${r.trait} (strength: ${r.strength}%, region: ${r.region})`);
    }
    if (repId.conflicts?.length > 0) {
      parts.push('REPUTATION vs IDENTITY CONFLICTS:');
      for (const c of repId.conflicts.slice(0, 2)) {
        parts.push(`- World sees "${c.reputation}" but character acts "${c.identity}" (divergence: ${c.divergence}%)`);
      }
      parts.push('NPCs react based on REPUTATION. Narration may note the gap subtly.');
    }
  }

  // Memory weight
  const memWeight = ws.memory_weight;
  if (memWeight?.defining_moments?.length > 0) {
    parts.push('\nDEFINING MOMENTS (shape everything):');
    for (const m of memWeight.defining_moments.slice(0, 3)) {
      parts.push(`- "${m.event}" (weight: ${m.weight}, factors: ${(m.factors || []).slice(0, 3).join(', ')})`);
    }
    parts.push('Reference defining moments when contextually appropriate. Don\'t force them.');
  }

  return parts.join('\n');
}

// ─── Build Campaign Brain Context (Narrator's Persistent Memory) ──
function buildCampaignBrainContext(ctx: OrchestratorContext): string {
  const brain = ctx.campaign_brain;
  if (!brain) return '';

  const parts: string[] = [];
  parts.push('═══════════════════════════════════════════════════');
  parts.push('CAMPAIGN BRAIN — NARRATOR\'S PERSISTENT MEMORY');
  parts.push('You are the single authoritative intelligence running this campaign.');
  parts.push('Everything below is YOUR memory. Use it to maintain continuity.');
  parts.push('═══════════════════════════════════════════════════');

  // Core identity
  if (brain.premise) parts.push(`\nCAMPAIGN PREMISE: ${brain.premise}`);
  if (brain.genre) parts.push(`GENRE: ${brain.genre}`);
  if (brain.tone) parts.push(`TONE: ${brain.tone}`);
  if (brain.campaign_objective) parts.push(`CAMPAIGN OBJECTIVE: ${brain.campaign_objective}`);
  if (brain.core_storyline) parts.push(`CORE STORYLINE: ${brain.core_storyline}`);

  // Arc tracking
  if (brain.current_arc) parts.push(`\nCURRENT ARC: ${brain.current_arc}`);
  const arcs = brain.major_arcs || [];
  if (arcs.length > 0) {
    parts.push('MAJOR ARCS:');
    for (const arc of arcs) {
      parts.push(`- ${arc.order || '?'}. ${arc.name}: ${arc.summary}`);
    }
  }

  // Story hooks (persistent interest tracking)
  const hooks = brain.story_hooks || [];
  const activeHooks = hooks.filter((h: any) => h.status === 'active' || h.status === 'surfaced');
  if (activeHooks.length > 0) {
    parts.push(`\nACTIVE STORY HOOKS (weave 1-2 into your response naturally — NEVER list them as options):`);
    for (const h of activeHooks) {
      const age = (brain.current_day || 1) - (h.created_day || 1);
      const staleNote = age > 3 ? ' [STALE — reshape or escalate]' : '';
      const engagedNote = h.status === 'surfaced' ? ' [SURFACED — player has seen this]' : '';
      parts.push(`- [${h.id}] ${h.description} (method: ${h.surface_method}, priority: ${h.priority}/10)${engagedNote}${staleNote}`);
    }
    parts.push('HOOK RULES: Surface hooks through environment, NPCs, or consequences. If a hook is STALE, reshape it — change the delivery method, escalate the stakes, or connect it to something new. If a hook was ENGAGED by the player, reinforce it. If IGNORED 3+ times, cool it off or retire it.');
  }

  // Story beats and threads
  const beats = brain.active_story_beats || [];
  if (beats.length > 0) {
    parts.push(`\nACTIVE STORY BEATS (what should happen soon):`);
    for (const beat of beats) parts.push(`- ${beat}`);
  }

  const threads = brain.unresolved_threads || [];
  if (threads.length > 0) {
    parts.push(`\nUNRESOLVED THREADS (do NOT forget these):`);
    for (const t of threads) parts.push(`- ${t}`);
  }

  // Truths
  const known = brain.known_truths || [];
  if (known.length > 0) {
    parts.push(`\nKNOWN TRUTHS (the world openly knows):`);
    for (const k of known) parts.push(`- ${k}`);
  }
  const hidden = brain.hidden_truths || [];
  if (hidden.length > 0) {
    parts.push(`\nHIDDEN TRUTHS (players don't know yet — reveal through play):`);
    for (const h of hidden) parts.push(`- ${h}`);
  }

  // Pressures
  const pressures = brain.future_pressures || [];
  if (pressures.length > 0) {
    parts.push(`\nFUTURE PRESSURES (will escalate if ignored):`);
    for (const p of pressures) parts.push(`- ${p}`);
  }
  if (brain.current_pressure) parts.push(`CURRENT PRESSURE: ${brain.current_pressure}`);

  // Time state with pacing awareness
  parts.push(`\nCAMPAIGN TIME: Day ${brain.current_day}, ${brain.current_time_block} (${brain.elapsed_hours || 0} hours elapsed)`);
  parts.push(`CAMPAIGN LENGTH TARGET: ${brain.campaign_length_target}`);
  if (brain.remaining_narrative_runway) parts.push(`NARRATIVE RUNWAY: ${brain.remaining_narrative_runway}`);

  // Campaign pacing guidance based on length target
  const lengthTarget = brain.campaign_length_target || 'medium';
  const currentDay = brain.current_day || 1;
  const pacingConfig: Record<string, { maxDays: number; earlyUntil: number; midUntil: number; lateFrom: number }> = {
    short: { maxDays: 5, earlyUntil: 2, midUntil: 3, lateFrom: 4 },
    medium: { maxDays: 15, earlyUntil: 4, midUntil: 10, lateFrom: 12 },
    long: { maxDays: 40, earlyUntil: 10, midUntil: 28, lateFrom: 35 },
  };
  const pacing = pacingConfig[lengthTarget] || pacingConfig.medium;
  let pacingPhase: string;
  let pacingGuidance: string;
  if (currentDay <= pacing.earlyUntil) {
    pacingPhase = 'EARLY';
    pacingGuidance = 'Establish the world, introduce key NPCs and threats. Plant hooks for later. Time moves at a normal pace — don\'t rush.';
  } else if (currentDay <= pacing.midUntil) {
    pacingPhase = 'MIDGAME';
    pacingGuidance = 'Complications deepen. Threads interweave. Pressure builds. Some hooks should pay off, new ones emerge. Balance exploration with rising stakes.';
  } else if (currentDay >= pacing.lateFrom) {
    pacingPhase = 'ENDGAME';
    pacingGuidance = `The campaign is approaching its conclusion (target: ~${pacing.maxDays} days). Threads should converge. Unresolved pressures escalate. Drive toward climax and resolution. Time-sensitive elements become URGENT.`;
  } else {
    pacingPhase = 'LATE-MID';
    pacingGuidance = 'Stakes are high. Major arcs should be in motion. Some threads resolve, creating consequences. Begin foreshadowing the endgame.';
  }
  parts.push(`\nPACING PHASE: ${pacingPhase} (Day ${currentDay} of ~${pacing.maxDays} target)`);
  parts.push(`PACING GUIDANCE: ${pacingGuidance}`);

  // World and factions
  if (brain.world_summary) parts.push(`\nWORLD STATE: ${brain.world_summary}`);
  const factions = brain.faction_state || [];
  if (factions.length > 0) {
    parts.push('FACTIONS:');
    for (const f of factions) {
      parts.push(`- ${f.name}: ${f.stance} | Goals: ${f.goals} | Power: ${f.power_level}`);
    }
  }

  // Victory/failure
  const victory = brain.victory_conditions || [];
  const failure = brain.failure_conditions || [];
  if (victory.length > 0) {
    parts.push(`\nVICTORY CONDITIONS: ${victory.join(' | ')}`);
  }
  if (failure.length > 0) {
    parts.push(`FAILURE CONDITIONS: ${failure.join(' | ')}`);
  }

  // Player impact
  const impacts = brain.player_impact_log || [];
  if (impacts.length > 0) {
    parts.push(`\nPLAYER IMPACT LOG (consequences of player actions):`);
    for (const imp of impacts.slice(-10)) {
      parts.push(`- ${typeof imp === 'string' ? imp : JSON.stringify(imp)}`);
    }
  }

  // Location
  if (brain.current_location) parts.push(`\nCURRENT LOCATION: ${brain.current_location}`);

  parts.push('\n═══════════════════════════════════════════════════');
  parts.push('NARRATOR DIRECTIVES:');
  parts.push('- NEVER forget the campaign objective or current arc');
  parts.push('- ALWAYS weave player actions into the existing story — do not erase the story');
  parts.push('- Track time realistically: rest=long, combat=short, travel=medium, dialogue=quick');
  parts.push('- When time advances, the world CHANGES: NPCs relocate, weather shifts, deadlines approach');
  parts.push('- Time-sensitive pressures ESCALATE when ignored — a rescue becomes a recovery, a threat becomes an attack');
  parts.push('- Inaction has consequences when time-sensitive pressures exist — the world does not wait');
  parts.push('- NPCs refer to each other by FIRST NAME unless full name is dramatically significant');
  parts.push('- The world existed before the players arrived — NPCs have lives, agendas, and routines');
  parts.push('═══════════════════════════════════════════════════');

  return parts.join('\n');
}

// ─── Build Living World Context for Narrator (with Priority Gating) ──
function buildLivingWorldContext(ctx: OrchestratorContext): string {
  const parts: string[] = [];
  const ws = ctx.world_state;
  const ps = ctx.priority_stack;
  const directive = ctx.narrative_directive;
  const suppressed = new Set(ps.suppressedSystems);

  // ── CAMPAIGN BRAIN (narrator's persistent memory — always first) ──
  const brainCtx = buildCampaignBrainContext(ctx);
  if (brainCtx) parts.push(brainCtx);

  // ── TENSION CLASSIFICATION (Narrative Pressure Engine v2) ──
  const tension = classifyServerTension(ctx);
  parts.push(`NARRATIVE TENSION: ${tension.level.replace(/_/g, ' ').toUpperCase()} (intensity: ${tension.intensity}/100)`);
  parts.push(`Tone: ${tension.guidance.tone}`);
  parts.push(`Pacing: ${tension.guidance.pacing}`);
  parts.push(`NPC behavior: ${tension.guidance.npcUrgency}`);
  parts.push(`Environment focus: ${tension.guidance.environmentEmphasis}`);
  parts.push(`Detail focus: ${tension.guidance.detailFocus}`);
  if (tension.sources.length > 0) {
    parts.push(`Pressure sources: ${tension.sources.join(', ')}`);
  }
  parts.push('Tension creates situations that REVEAL character. Never remove player freedom.');

  // ── NARRATIVE DIRECTOR FRAME ──
  if (directive) {
    parts.push(`\nNARRATIVE DIRECTOR:`);
    parts.push(`MODE: ${directive.mode.toUpperCase()} | TONE: ${directive.tone} | PACING: ${directive.pacing}`);
    parts.push(`EMPHASIZE: ${directive.emphasize.join(', ')}`);
    parts.push(`MINIMIZE: ${directive.deemphasize.join(', ')}`);
  }

  // ── PRIORITY FOCUS ──
  parts.push(`\nNARRATIVE PRIORITY: ${ps.activeFocuses.join(' > ')}`);
  if (ps.suppressedSystems.length > 0) {
    parts.push(`SUPPRESSED (do not emphasize): ${ps.suppressedSystems.join(', ')}`);
  }

  // ── EMERGENT EVENTS (world-condition-driven) ──
  const emergentHints = detectEmergentHints(ctx);
  if (emergentHints.length > 0) {
    parts.push('\nEMERGENT WORLD EVENTS (arose from world conditions, not scripted):');
    for (const e of emergentHints) {
      parts.push(`- "${e.title}" (gravity: ${e.gravity}/10, ${e.urgency}): ${e.description}`);
      parts.push(`  Cause: ${e.cause}`);
    }
    parts.push('Reference these naturally. They are logical consequences of world state.');
  }

  // ── CHARACTER IDENTITY DISCOVERY ──
  const identityCtx = buildIdentityDiscoveryContext(ctx);
  if (identityCtx) {
    parts.push(`\n${identityCtx}`);
  }

  // ── ACTIVE WORLD EVENTS (only if not suppressed) ──
  const events = ws.active_world_events || [];
  if (events.length > 0 && !suppressed.has('exploration_hints')) {
    const highImpact = events.filter((e: any) => e.impact_level >= 5);
    const nearby = events.filter((e: any) => e.player_proximity >= 5);
    if (highImpact.length > 0) {
      parts.push('\nMAJOR WORLD EVENTS:');
      for (const e of highImpact.slice(0, 3)) {
        parts.push(`- [${e.event_type}] at ${e.location}: ${e.description}`);
      }
    }
    if (nearby.length > 0) {
      parts.push('NEARBY ACTIVITY:');
      for (const e of nearby.slice(0, 3)) {
        parts.push(`- ${e.description} (${e.location})`);
      }
    }
  }

  // ── RUMORS (only if not suppressed) ──
  const rumors = ws.world_rumors || [];
  if (rumors.length > 0 && !suppressed.has('rumor_mentions')) {
    parts.push('\nWORLD RUMORS (NPCs may mention):');
    for (const r of rumors.slice(0, 3)) {
      parts.push(`- "${r.rumor_text}" (from ${r.origin_location})`);
    }
  }

  // ── REGIONAL CONDITIONS ──
  const regions = ws.regional_states || [];
  if (regions.length > 0) {
    parts.push('\nREGIONAL CONDITIONS:');
    for (const r of regions) {
      const conds = (r.environment_conditions as any)?.conditions || [];
      const weather = (r.environment_conditions as any)?.weather || '';
      const creatureActivity = (r.environment_conditions as any)?.creature_activity;
      parts.push(`- ${r.region_name}: danger ${r.danger_level}/10${conds.length ? ', ' + conds.join(', ') : ''}${weather ? ', weather: ' + weather : ''}`);
      if (r.npc_activity_summary && !suppressed.has('environment_details')) parts.push(`  NPC activity: ${r.npc_activity_summary}`);
      if (r.faction_activity_summary) parts.push(`  Factions: ${r.faction_activity_summary}`);
      if (creatureActivity?.description) parts.push(`  Creatures: ${creatureActivity.description} (threat: ${creatureActivity.threat_level}/5)`);
    }
  }

  // ── STORY ARCS (always active — they're central) ──
  const campaignState = ctx.campaign_state || {};
  const storyCtx = campaignState.story_context || {};
  const activeArcs = storyCtx.active_arcs || [];
  if (activeArcs.length > 0) {
    parts.push('\nACTIVE STORY ARCS:');
    for (const arc of activeArcs.slice(0, 3)) {
      parts.push(`- "${arc.title}" [${arc.stage}]: ${arc.stage_description || arc.stakes || 'Unfolding...'}. Locations: ${(arc.locations || []).join(', ')}`);
    }
  }

  // ── ECONOMY (only when relevant) ──
  const worldStateJson = campaignState.world_state || {};
  const economy = worldStateJson.economy || {};
  const economyKeys = Object.keys(economy);
  if (economyKeys.length > 0 && !suppressed.has('economy_details') && (ps.activeFocuses.includes('economy') || ps.activeFocuses.includes('social'))) {
    parts.push('\nLIVING ECONOMY:');
    for (const key of economyKeys.slice(0, 4)) {
      const e = economy[key];
      const modifier = e.price_modifier || 1.0;
      const label = modifier > 1.2 ? 'EXPENSIVE' : modifier < 0.8 ? 'CHEAP' : 'normal';
      parts.push(`- ${key}: ${label} (×${modifier.toFixed(1)}) — ${e.reason}`);
    }
  }

  // ── LOCATION HISTORY ──
  const locHistory = worldStateJson.location_history || {};
  const currentZone = campaignState.current_zone || '';
  const zoneHistory = locHistory[currentZone];
  if (zoneHistory && zoneHistory.length > 0) {
    parts.push('\nLOCATION MEMORY (what happened HERE):');
    for (const entry of zoneHistory.slice(-3)) {
      parts.push(`- Day ${entry.day}: ${entry.event}${entry.permanent ? ' (permanent)' : ''}`);
    }
  }

  // ── DISCOVERABLE LOCATIONS (only during exploration/discovery) ──
  const discoveries = worldStateJson.discoverable_locations || [];
  const undiscovered = discoveries.filter((d: any) => !d.discovered);
  if (undiscovered.length > 0 && !suppressed.has('exploration_hints') && (ps.activeFocuses.includes('exploration') || ps.activeFocuses.includes('discovery'))) {
    parts.push('\nDISCOVERABLE LOCATIONS (hint via environmental clues):');
    for (const d of undiscovered.slice(0, 2)) {
      parts.push(`- [${d.type}] near ${d.location}: ${d.description} (danger: ${d.danger_level}/10)`);
    }
  }

  // ── PLAYER INFLUENCE ──
  const playerInfluence = worldStateJson.player_influence || [];
  const recentInfluence = playerInfluence.filter((i: any) => i.permanence !== 'temporary' || (i.day && i.day >= (campaignState.day_count || 1) - 3));
  if (recentInfluence.length > 0) {
    parts.push('\nPLAYER INFLUENCE ON WORLD:');
    for (const inf of recentInfluence.slice(-3)) {
      parts.push(`- ${inf.cause} → ${inf.effect} (${inf.permanence})`);
    }
  }

  // ── CHARACTER PSYCHOLOGY (from campaign world_state) ──
  const psychology = worldStateJson.character_psychology;
  if (psychology) {
    parts.push('\nCHARACTER PSYCHOLOGY:');
    if (psychology.dominant_emotion) parts.push(`Dominant emotion: ${psychology.dominant_emotion}`);
    if (psychology.strong_traits?.length > 0) parts.push(`Strong traits: ${psychology.strong_traits.join(', ')}`);
    if (psychology.recent_trauma?.length > 0) parts.push(`Recent trauma: ${psychology.recent_trauma.join('; ')} — reflect in character behavior`);
    if (psychology.fears?.length > 0) parts.push(`Fears: ${psychology.fears.join(', ')}`);
  }

  // ── RELATIONSHIP CONTEXT ──
  const relationships = worldStateJson.character_relationships;
  if (relationships && Array.isArray(relationships) && relationships.length > 0) {
    parts.push('\nCHARACTER RELATIONSHIPS:');
    for (const rel of relationships.slice(0, 5)) {
      parts.push(`- ${rel.source} → ${rel.target}: ${rel.tone} (trust:${rel.trust} respect:${rel.respect} fear:${rel.fear})`);
    }
  }

  // ── LORE CONSISTENCY RULES ──
  const loreRules = worldStateJson.lore_rules;
  if (loreRules) {
    parts.push('\nLORE RULES (never violate):');
    if (loreRules.technology_level) parts.push(`- Technology level: ${loreRules.technology_level}. Do NOT reference higher technology.`);
    if (loreRules.world_rules?.length > 0) {
      for (const rule of loreRules.world_rules.slice(0, 5)) {
        parts.push(`- ${rule}`);
      }
    }
  }

  // ── CHARACTER DEPTH SYSTEMS ──
  const characterDepth = buildCharacterDepthContext(ctx);
  if (characterDepth) {
    parts.push(`\n${characterDepth}`);
  }

  // ── NARRATIVE PHILOSOPHY ──
  parts.push('\nNARRATIVE PHILOSOPHY:');
  parts.push('- The world creates situations. The player responds. The system observes. The narrator reflects.');
  parts.push('- No forced arcs. No destiny. Character-driven storytelling through interaction and consequence.');
  parts.push('- Player freedom is absolute. The world reacts logically to choices.');

  // ── DM SITUATION FRAME (condensed, priority-aware) ──
  if (parts.length > 0) {
    const dangerMax = (ws.regional_states || []).reduce((max: number, r: any) => Math.max(max, r.danger_level || 0), 0);
    
    parts.push('\nDM SITUATION FRAME:');
    if (dangerMax >= 7) parts.push('- Regional danger HIGH. Lean toward tension. Injuries likely. NPCs fearful/aggressive.');
    else if (dangerMax >= 4) parts.push('- Regional danger MODERATE. Balance exploration with alertness.');
    else parts.push('- Regional danger LOW. Favor atmospheric exploration and character moments.');

    // Only include system reminders relevant to current mode
    parts.push('\nACTIVE SYSTEMS (apply based on narrative mode):');
    
    if (ps.activeFocuses.includes('combat') || ps.activeFocuses.includes('crisis')) {
      parts.push('- TACTICAL ENVIRONMENT: Reference terrain, lighting, cover, elevation in combat.');
      parts.push('- INJURY SYSTEM: Combat causes injuries affecting capabilities.');
    }
    if (ps.activeFocuses.includes('dialogue') || ps.activeFocuses.includes('social')) {
      parts.push('- NPC MEMORY: NPCs remember past interactions. Behavior changes based on history.');
      parts.push('- NPC PERSONALITY: Each NPC has temperament, speech style, goals, secrets. Reflect in dialogue.');
      parts.push('- REPUTATION: NPCs react to player reputation.');
    }
    if (ps.activeFocuses.includes('exploration') || ps.activeFocuses.includes('discovery')) {
      parts.push('- EXPLORATION DISCOVERIES: Hint at hidden locations through environmental clues.');
      parts.push('- LIVING LOCATIONS: Narration reflects location history.');
    }
    // Always active
    parts.push('- STORY ARCS: Reference active arcs naturally.');
    parts.push('- PLAYER INFLUENCE: World reflects consequences of player actions.');
    parts.push('- CREATIVITY RECOGNITION: Reward creative solutions with richer narrative responses.');
    parts.push('- CHARACTER PSYCHOLOGY: Reflect emotional state and trauma in character behavior.');
    parts.push('- LORE CONSISTENCY: Never contradict established world rules or character background.');
    parts.push('- IDENTITY DISCOVERY: Observe character patterns. Reflect subtly. Never force outcomes.');
    parts.push('- EMERGENT EVENTS: World events emerge from conditions. Reference their causes naturally.');
    parts.push('- CONTRADICTION ENGINE: When character acts against established patterns, acknowledge subtly.');
    parts.push('- VALUES UNDER PRESSURE: Note what the character protects when stakes are high.');
    parts.push('- PERSONAL TRIGGERS: Connect character history to present environmental moments.');
    parts.push('- SILENCE ENGINE: When silence is meaningful, acknowledge it rarely but powerfully.');
    parts.push('- REPUTATION vs IDENTITY: NPCs react to reputation. Narration may note the gap.');
    parts.push('- MEMORY WEIGHT: Reference defining moments naturally. Let minor memories fade.');
  }

  if (parts.length === 0) return '';
  return '\n\nLIVING WORLD STATE:\n' + parts.join('\n');
}

// ─── Pipeline Step: Update Sentiment in DB ─────────────────────
async function updateSentimentInDb(
  ctx: OrchestratorContext,
  characterId: string,
): Promise<void> {
  const su = ctx.narration_result?.sentimentUpdate;
  if (!su || !characterId) return;

  try {
    const supabaseAdmin = ctx.supabaseAdmin;

    const prev = ctx.cached_sentiment || {};
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const clamp100 = (v: number) => clamp(v, 0, 100);

    const newSentiment = clamp(
      (prev.sentiment_score ?? 0) + (su.sentiment_shift ?? 0),
      -100, 100,
    );

    const dims = su.relationship_dimensions || {};
    const beh = su.behavior_scores || {};

    const newCuriosity = clamp100((prev.curiosity ?? 50) + (dims.curiosity_shift ?? 0));
    const newRespect = clamp100((prev.respect ?? 50) + (dims.respect_shift ?? 0));
    const newTrust = clamp100((prev.trust ?? 50) + (dims.trust_shift ?? 0));
    const newAmusement = clamp100((prev.amusement ?? 50) + (dims.amusement_shift ?? 0));
    const newDisappointment = clamp100((prev.disappointment ?? 10) + (dims.disappointment_shift ?? 0));
    const newIntrigue = clamp100((prev.intrigue ?? 50) + (dims.intrigue_shift ?? 0));
    const newStoryValue = clamp100((prev.story_value ?? 50) + (dims.story_value_shift ?? 0));

    const newCreativity = clamp100((prev.creativity_score ?? 50) + (beh.creativity ?? 0));
    const newWorldInteraction = clamp100((prev.world_interaction_score ?? 50) + (beh.world_interaction ?? 0));
    const newNpcInteraction = clamp100((prev.npc_interaction_score ?? 50) + (beh.npc_interaction ?? 0));
    const newExploration = clamp100((prev.exploration_score ?? 50) + (beh.exploration ?? 0));
    const newCombatStyle = clamp100((prev.combat_style_score ?? 50) + (beh.combat_style ?? 0));
    const newStoryEngagement = clamp100((prev.story_engagement_score ?? 50) + (beh.story_engagement ?? 0));
    const newStoryCompat = clamp100((prev.story_compatibility ?? 50) + (su.story_compatibility_shift ?? 0));

    const avgPositive = (newCuriosity + newRespect + newTrust + newAmusement + newIntrigue + newStoryValue) / 6;
    let stage: string;
    if (newDisappointment > 70 && avgPositive < 30) stage = 'Disappointed';
    else if (newDisappointment > 55 && avgPositive < 40) stage = 'Unimpressed';
    else if (avgPositive >= 80) stage = 'Beloved Storyteller';
    else if (avgPositive >= 65) stage = 'Compelling';
    else if (avgPositive >= 50) stage = 'Noteworthy';
    else if (avgPositive >= 35) stage = 'Interesting';
    else if (avgPositive >= 20) stage = 'Observed';
    else stage = 'Unknown';

    const observations = [...(prev.narrator_observations || [])];
    if (su.narrator_observation) observations.push(su.narrator_observation);
    const nicknameHistory = [...(prev.nickname_history || [])];
    if (su.nickname && su.nickname !== prev.nickname && su.nickname !== nicknameHistory[nicknameHistory.length - 1]) {
      nicknameHistory.push(su.nickname);
    }
    const moments = [...(prev.memorable_moments || [])];
    if (su.memorable_moment) moments.push(su.memorable_moment);

    const upsertData = {
      character_id: characterId,
      nickname: su.nickname || prev.nickname || null,
      sentiment_score: newSentiment,
      opinion_summary: su.opinion_summary || prev.opinion_summary,
      personality_notes: su.personality_notes || prev.personality_notes,
      memorable_moments: moments.slice(-50),
      relationship_stage: stage,
      curiosity: newCuriosity,
      respect: newRespect,
      trust: newTrust,
      amusement: newAmusement,
      disappointment: newDisappointment,
      intrigue: newIntrigue,
      story_value: newStoryValue,
      creativity_score: newCreativity,
      world_interaction_score: newWorldInteraction,
      npc_interaction_score: newNpcInteraction,
      exploration_score: newExploration,
      combat_style_score: newCombatStyle,
      story_engagement_score: newStoryEngagement,
      story_compatibility: newStoryCompat,
      narrator_observations: observations.slice(-30),
      nickname_history: nicknameHistory.slice(-10),
      updated_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from('narrator_sentiments')
      .upsert(upsertData, { onConflict: 'character_id' });
  } catch (e) {
    ctx.errors.push({
      step: 'update_sentiment',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
  }
}

// ─── Time Progression Constants ────────────────────────────────
const TIME_BLOCKS = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'evening', 'night', 'midnight'] as const;

/** Map narrative mode + advanceTime steps to realistic elapsed hours */
function estimateElapsedHours(steps: number, mode: string): number {
  if (steps === 0) return 0;
  // Each "step" is one time block (~3 hours), but mode adjusts realism
  const BASE_HOURS_PER_STEP = 3;
  const modeMultipliers: Record<string, number> = {
    combat: 0.3,      // combat is fast — ~1h per step
    rest: 2.5,         // rest/sleep is long — 7.5h per step  
    travel: 1.5,       // travel takes time — 4.5h per step
    dialogue: 0.2,     // conversations are quick — ~40min per step
    exploration: 0.8,  // exploring takes moderate time
    investigation: 0.5, // focused investigation
    crisis: 0.2,       // crisis moments are compressed
    social: 0.4,       // social interactions
    economy: 0.3,      // trading/shopping
    discovery: 0.6,    // discovering things
  };
  const mult = modeMultipliers[mode] || 1.0;
  return Math.round((steps * BASE_HOURS_PER_STEP * mult) * 10) / 10;
}

function advanceTimeBlock(current: string, steps: number): { time: string; newDay: boolean } {
  const idx = TIME_BLOCKS.indexOf(current as any);
  const startIdx = idx >= 0 ? idx : 1; // default to morning
  const newIdx = (startIdx + steps) % TIME_BLOCKS.length;
  const newDay = steps > 0 && newIdx <= startIdx;
  return { time: TIME_BLOCKS[newIdx], newDay };
}

// ─── Pipeline Step: Update Campaign Time (Narrator-Driven) ─────
async function updateCampaignTime(
  ctx: OrchestratorContext,
  campaignId: string,
): Promise<{ timeBlock: string; day: number; elapsedHours: number } | null> {
  const steps = ctx.narration_result?.advanceTime;
  if (!steps || steps <= 0 || !campaignId) return null;

  try {
    const supabaseAdmin = createClient(
      ctx.supabase_url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Get current time state from brain (source of truth) or campaign
    const brain = ctx.campaign_brain;
    const campaignState = ctx.campaign_state || {};
    const currentTimeBlock = brain?.current_time_block || campaignState.time_of_day || 'morning';
    const currentDay = brain?.current_day || campaignState.day_count || 1;
    const currentElapsed = parseFloat(brain?.elapsed_hours || campaignState.elapsed_hours || '0');

    // Calculate new time
    const mode = ctx.narrative_directive?.mode || 'exploration';
    const hoursAdvanced = estimateElapsedHours(steps, mode);
    const { time: newTimeBlock, newDay } = advanceTimeBlock(currentTimeBlock, steps);
    const newDay_ = newDay ? currentDay + 1 : currentDay;
    const newElapsed = Math.round((currentElapsed + hoursAdvanced) * 10) / 10;

    // Update both tables in parallel
    const updates = [
      supabaseAdmin.from('campaigns').update({
        time_of_day: newTimeBlock,
        day_count: newDay_,
        elapsed_hours: newElapsed,
      }).eq('id', campaignId),
    ];

    if (brain) {
      updates.push(
        supabaseAdmin.from('campaign_brain').update({
          current_time_block: newTimeBlock,
          current_day: newDay_,
          elapsed_hours: newElapsed,
          updated_at: new Date().toISOString(),
        }).eq('campaign_id', campaignId),
      );
    }

    await Promise.all(updates);

    return { timeBlock: newTimeBlock, day: newDay_, elapsedHours: newElapsed };
  } catch (e) {
    ctx.errors.push({
      step: 'update_campaign_time',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
    return null;
  }
}

// ─── Pipeline Step: Persist NPC Updates (Narrator-Owned) ───────
async function persistNpcUpdates(
  ctx: OrchestratorContext,
  campaignId: string,
  characterId?: string,
): Promise<{ created: number; updated: number } | null> {
  const npcUpdates = ctx.narration_result?.npcUpdates;
  if (!npcUpdates || !Array.isArray(npcUpdates) || npcUpdates.length === 0 || !campaignId) return null;

  try {
    const supabaseAdmin = ctx.supabaseAdmin;

    const brain = ctx.campaign_brain;
    const campaignState = ctx.campaign_state || {};
    const currentDay = brain?.current_day || campaignState.day_count || 1;
    const currentZone = campaignState.current_zone || 'Unknown';
    const charId = characterId || null;

    let created = 0;
    let updated = 0;

    for (const npcUpdate of npcUpdates) {
      if (npcUpdate.isNew && npcUpdate.name) {
        // Narrator introduces a new NPC — persist with grounded fields
        const firstName = npcUpdate.name.split(' ')[0];
        const { data: newNpc } = await supabaseAdmin.from('campaign_npcs').insert({
          campaign_id: campaignId,
          name: npcUpdate.name,
          full_name: npcUpdate.name,
          first_name: firstName,
          role: npcUpdate.role || 'civilian',
          personality: npcUpdate.personality || null,
          appearance: npcUpdate.appearance || null,
          current_zone: npcUpdate.current_zone || currentZone,
          backstory: npcUpdate.backstory || null,
          first_met_day: currentDay,
          last_seen_day: currentDay,
          occupation: npcUpdate.occupation || null,
          temperament: npcUpdate.temperament || null,
          is_outgoing: npcUpdate.is_outgoing ?? false,
          is_chaotic: npcUpdate.is_chaotic ?? false,
          trust_disposition: npcUpdate.trust_disposition ?? 0,
          story_relevance_level: npcUpdate.story_relevance || 'minor',
          status: 'alive',
        }).select('id').single();

        if (newNpc && charId) {
          await supabaseAdmin.from('npc_relationships').insert({
            npc_id: newNpc.id,
            character_id: charId,
            campaign_id: campaignId,
            disposition: npcUpdate.disposition || 'neutral',
            trust_level: npcUpdate.trust_level || 0,
            notes: npcUpdate.relationship_notes || null,
            last_interaction_day: currentDay,
          });
        }
        created++;
      } else if (npcUpdate.id) {
        // Narrator updates an existing NPC
        const updateData: any = {
          last_seen_day: currentDay,
          updated_at: new Date().toISOString(),
        };
        if (npcUpdate.current_zone) updateData.current_zone = npcUpdate.current_zone;
        if (npcUpdate.status) updateData.status = npcUpdate.status;
        if (npcUpdate.npc_current_activity) updateData.npc_current_activity = npcUpdate.npc_current_activity;
        if (npcUpdate.npc_goal) updateData.npc_goal = npcUpdate.npc_goal;
        if (npcUpdate.memory_summary) updateData.memory_summary = npcUpdate.memory_summary;

        await supabaseAdmin.from('campaign_npcs').update(updateData).eq('id', npcUpdate.id);

        // Update relationship if disposition/trust changed
        if (charId && (npcUpdate.disposition || npcUpdate.trust_change)) {
          const { data: existingRel } = await supabaseAdmin
            .from('npc_relationships')
            .select('id, trust_level, disposition')
            .eq('npc_id', npcUpdate.id)
            .eq('character_id', charId)
            .eq('campaign_id', campaignId)
            .maybeSingle();

          if (existingRel) {
            const newTrust = Math.max(-100, Math.min(100, (existingRel.trust_level || 0) + (npcUpdate.trust_change || 0)));
            await supabaseAdmin.from('npc_relationships').update({
              disposition: npcUpdate.disposition || existingRel.disposition,
              trust_level: newTrust,
              notes: npcUpdate.relationship_notes || null,
              last_interaction_day: currentDay,
            }).eq('id', existingRel.id);
          } else {
            await supabaseAdmin.from('npc_relationships').insert({
              npc_id: npcUpdate.id,
              character_id: charId,
              campaign_id: campaignId,
              disposition: npcUpdate.disposition || 'neutral',
              trust_level: npcUpdate.trust_change || 0,
              notes: npcUpdate.relationship_notes || null,
              last_interaction_day: currentDay,
            });
          }
        }
        updated++;
      }
    }

    return { created, updated };
  } catch (e) {
    ctx.errors.push({
      step: 'persist_npc_updates',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
    return null;
  }
}

// ─── Pipeline Step: Persist Character Discoveries (Gated) ──────
async function persistCharacterDiscoveries(
  ctx: OrchestratorContext,
  characterId: string,
): Promise<{ synced: number; fields: string[] } | null> {
  const discoveries = ctx.narration_result?.characterDiscoveries;
  if (!Array.isArray(discoveries) || discoveries.length === 0) return null;

  const VALID_FIELDS = ['personality', 'mentality', 'lore', 'abilities', 'powers', 'weapons_items'] as const;
  type DiscoverableField = typeof VALID_FIELDS[number];

  try {
    const supabaseAdmin = ctx.supabaseAdmin;

    // Fetch current character fields
    const { data: character, error: fetchError } = await supabaseAdmin
      .from('characters')
      .select('personality, mentality, lore, abilities, powers, weapons_items')
      .eq('id', characterId)
      .maybeSingle();

    if (fetchError || !character) {
      ctx.errors.push({ step: 'persist_discoveries', error: 'Character not found', recoverable: true });
      return null;
    }

    // Filter valid discoveries and deduplicate against existing content
    const validDiscoveries = discoveries.filter((d: any) => {
      if (!d.targetField || !VALID_FIELDS.includes(d.targetField)) return false;
      if (!d.content || typeof d.content !== 'string' || d.content.length < 5) return false;
      // Check if this content already exists in the field (prevent duplicates)
      const existing = (character as any)[d.targetField] || '';
      if (existing.toLowerCase().includes(d.content.toLowerCase().slice(0, 30))) return false;
      return true;
    });

    if (validDiscoveries.length === 0) return null;

    // Build field updates by appending discoveries
    const updates: Partial<Record<DiscoverableField, string>> = {};
    const touchedFields: string[] = [];

    for (const disc of validDiscoveries) {
      const field = disc.targetField as DiscoverableField;
      const existing = updates[field] ?? ((character as any)[field] || '');
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const entry = `[Discovered ${date}] ${disc.content}`;
      const separator = existing.trim() ? '\n\n' : '';
      updates[field] = `${existing}${separator}${entry}`;
      if (!touchedFields.includes(field)) touchedFields.push(field);
    }

    const { error: updateError } = await supabaseAdmin
      .from('characters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', characterId);

    if (updateError) {
      ctx.errors.push({ step: 'persist_discoveries', error: updateError.message, recoverable: true });
      return null;
    }

    return { synced: validDiscoveries.length, fields: touchedFields };
  } catch (e) {
    ctx.errors.push({
      step: 'persist_discoveries',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
    return null;
  }
}

// ─── Pipeline Step: Persist Hook Updates (Narrator-Owned) ──────
async function persistHookUpdates(
  ctx: OrchestratorContext,
  campaignId: string,
): Promise<void> {
  const hookUpdates = ctx.narration_result?.hookUpdates;
  const brain = ctx.campaign_brain;
  if (!brain) return;

  try {
    const supabaseAdmin = ctx.supabaseAdmin;

    let hooks: any[] = Array.isArray(brain.story_hooks) ? [...brain.story_hooks] : [];
    const currentDay = brain.current_day || 1;
    let nextId = hooks.length > 0 
      ? Math.max(...hooks.map((h: any) => parseInt(String(h.id).replace('hook_', '')) || 0)) + 1 
      : 1;

    // Process narrator-reported hook updates
    if (Array.isArray(hookUpdates) && hookUpdates.length > 0) {
      for (const update of hookUpdates) {
        if (update.action === 'created' && update.description) {
          hooks.push({
            id: `hook_${nextId++}`,
            description: update.description,
            surface_method: update.surface_method || 'environment',
            priority: Math.min(10, Math.max(1, update.priority || 5)),
            status: 'active',
            created_day: currentDay,
            last_surfaced_day: null,
            times_surfaced: 0,
            times_ignored: 0,
            tied_thread: null,
          });
        } else if (update.id) {
          const idx = hooks.findIndex((h: any) => h.id === update.id);
          if (idx >= 0) {
            switch (update.action) {
              case 'surfaced':
                hooks[idx].status = 'surfaced';
                hooks[idx].last_surfaced_day = currentDay;
                hooks[idx].times_surfaced = (hooks[idx].times_surfaced || 0) + 1;
                break;
              case 'engaged':
                hooks[idx].status = 'engaged';
                hooks[idx].last_surfaced_day = currentDay;
                // Boost priority when player engages
                hooks[idx].priority = Math.min(10, (hooks[idx].priority || 5) + 1);
                break;
              case 'resolved':
                hooks[idx].status = 'resolved';
                break;
              case 'ignored':
                hooks[idx].times_ignored = (hooks[idx].times_ignored || 0) + 1;
                // After 3 ignores, mark as stale
                if (hooks[idx].times_ignored >= 3) {
                  hooks[idx].status = 'stale';
                }
                break;
              case 'reshaped':
                hooks[idx].status = 'active';
                hooks[idx].description = update.description || hooks[idx].description;
                hooks[idx].surface_method = update.surface_method || hooks[idx].surface_method;
                hooks[idx].priority = update.priority || hooks[idx].priority;
                hooks[idx].times_ignored = 0; // Reset ignore count on reshape
                hooks[idx].last_surfaced_day = null;
                break;
            }
          }
        }
      }
    }

    // Age-based hook maintenance (run every turn)
    for (const hook of hooks) {
      if (hook.status === 'resolved') continue;
      const age = currentDay - (hook.created_day || 1);
      // Mark hooks stale if not surfaced in 3+ days
      if (hook.status === 'active' && age > 3 && !hook.last_surfaced_day) {
        hook.status = 'stale';
      }
      // Reduce priority of stale hooks over time
      if (hook.status === 'stale') {
        hook.priority = Math.max(1, (hook.priority || 5) - 1);
      }
    }

    // Keep max 8 hooks, prioritizing active/engaged over stale/resolved
    const statusOrder: Record<string, number> = { engaged: 0, active: 1, surfaced: 2, stale: 3, resolved: 4 };
    hooks.sort((a: any, b: any) => {
      const sa = statusOrder[a.status] ?? 3;
      const sb = statusOrder[b.status] ?? 3;
      if (sa !== sb) return sa - sb;
      return (b.priority || 0) - (a.priority || 0);
    });
    // Keep resolved hooks for history but cap total
    hooks = hooks.slice(0, 12);

    await supabaseAdmin.from('campaign_brain').update({
      story_hooks: hooks,
      updated_at: new Date().toISOString(),
    }).eq('campaign_id', campaignId);

  } catch (e) {
    ctx.errors.push({
      step: 'persist_hook_updates',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
  }
}

// ─── Pipeline Step: Persist World State Updates (Narrator-Owned) ──
async function persistWorldStateUpdates(
  ctx: OrchestratorContext,
  campaignId: string,
): Promise<{ eventsCreated: number; eventsResolved: number; dangerUpdated: boolean; rumorsAdded: number } | null> {
  const updates = ctx.narration_result?.worldStateUpdates;
  if (!Array.isArray(updates) || updates.length === 0 || !campaignId) return null;

  try {
    const supabaseAdmin = ctx.supabaseAdmin;

    const brain = ctx.campaign_brain;
    const currentDay = brain?.current_day || ctx.campaign_state?.day_count || 1;
    const currentZone = ctx.campaign_state?.current_zone || 'Unknown';
    let eventsCreated = 0;
    let eventsResolved = 0;
    let dangerUpdated = false;
    let rumorsAdded = 0;

    for (const update of updates.slice(0, 3)) {
      const location = update.location || currentZone;

      switch (update.type) {
        case 'danger_shift': {
          const delta = Math.max(-3, Math.min(3, update.dangerDelta || 0));
          if (delta === 0) break;
          // Update world_state danger level for the matching region
          const { data: regionData } = await supabaseAdmin
            .from('world_state')
            .select('id, danger_level')
            .eq('campaign_id', campaignId)
            .eq('region_name', location)
            .maybeSingle();

          if (regionData) {
            const newDanger = Math.max(0, Math.min(10, (regionData.danger_level || 0) + delta));
            await supabaseAdmin.from('world_state').update({
              danger_level: newDanger,
              updated_at: new Date().toISOString(),
            }).eq('id', regionData.id);
            dangerUpdated = true;
          }
          break;
        }

        case 'environment_change': {
          // Update environment_conditions on the matching world_state region
          const { data: envRegion } = await supabaseAdmin
            .from('world_state')
            .select('id, environment_conditions')
            .eq('campaign_id', campaignId)
            .eq('region_name', location)
            .maybeSingle();

          if (envRegion) {
            const existing = (envRegion.environment_conditions as any) || {};
            const conditions = existing.conditions || [];
            conditions.push(update.description);
            await supabaseAdmin.from('world_state').update({
              environment_conditions: { ...existing, conditions: conditions.slice(-8) },
              updated_at: new Date().toISOString(),
            }).eq('id', envRegion.id);
          }
          break;
        }

        case 'rumor_spawned': {
          // Insert into world_rumors if table exists, otherwise store in campaign brain
          try {
            await supabaseAdmin.from('world_rumors').insert({
              campaign_id: campaignId,
              rumor_text: update.description,
              origin_location: location,
              spread_level: 1,
            });
            rumorsAdded++;
          } catch {
            // world_rumors table may not exist — store in brain instead
            if (brain) {
              const rumors = Array.isArray(brain.story_hooks) ? brain.story_hooks : [];
              // No-op: rumors stored as hooks handled separately
            }
          }
          break;
        }

        case 'event_created': {
          await supabaseAdmin.from('world_events').insert({
            campaign_id: campaignId,
            event_type: 'narrator_generated',
            location,
            description: update.description,
            impact_level: Math.min(10, Math.max(1, update.magnitude || 5)),
            story_relevance: Math.min(10, Math.max(1, update.magnitude || 5)),
            player_proximity: location === currentZone ? 8 : 3,
            resolved: false,
          });
          eventsCreated++;
          break;
        }

        case 'event_resolved': {
          // Find matching unresolved event and mark resolved
          const { data: matchingEvents } = await supabaseAdmin
            .from('world_events')
            .select('id, description')
            .eq('campaign_id', campaignId)
            .eq('resolved', false)
            .limit(20);

          if (matchingEvents && matchingEvents.length > 0) {
            // Simple match: find event whose description overlaps with update description
            const descLower = (update.description || '').toLowerCase();
            const match = matchingEvents.find((e: any) => {
              const eLower = (e.description || '').toLowerCase();
              return descLower.includes(eLower.slice(0, 30)) || eLower.includes(descLower.slice(0, 30));
            });
            if (match) {
              await supabaseAdmin.from('world_events').update({
                resolved: true,
                updated_at: new Date().toISOString(),
              }).eq('id', match.id);
              eventsResolved++;
            }
          }
          break;
        }

        case 'region_change': {
          // Update npc/faction activity summaries on world_state
          const { data: regionChange } = await supabaseAdmin
            .from('world_state')
            .select('id, npc_activity_summary, faction_activity_summary')
            .eq('campaign_id', campaignId)
            .eq('region_name', location)
            .maybeSingle();

          if (regionChange) {
            const updateData: any = { updated_at: new Date().toISOString() };
            if (update.description) {
              updateData.faction_activity_summary = update.description;
            }
            await supabaseAdmin.from('world_state').update(updateData).eq('id', regionChange.id);
          }
          break;
        }
      }
    }

    return { eventsCreated, eventsResolved, dangerUpdated, rumorsAdded };
  } catch (e) {
    ctx.errors.push({
      step: 'persist_world_state',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
    return null;
  }
}

// ─── Pipeline Step: Persist Faction Updates (Narrator-Owned) ──────
async function persistFactionUpdates(
  ctx: OrchestratorContext,
  campaignId: string,
): Promise<{ updated: number } | null> {
  const factionUpdates = ctx.narration_result?.factionUpdates;
  if (!Array.isArray(factionUpdates) || factionUpdates.length === 0 || !campaignId) return null;

  try {
    const supabaseAdmin = createClient(
      ctx.supabase_url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let updated = 0;
    const brain = ctx.campaign_brain;

    // Update factions table
    for (const fu of factionUpdates.slice(0, 2)) {
      if (!fu.factionName) continue;

      // Try to find existing faction
      const { data: existingFaction } = await supabaseAdmin
        .from('factions')
        .select('id, military_strength, faction_goals, current_conflicts, territory_regions')
        .eq('campaign_id', campaignId)
        .ilike('faction_name', fu.factionName)
        .maybeSingle();

      if (existingFaction) {
        const updateData: any = { updated_at: new Date().toISOString() };
        if (fu.powerDelta) {
          updateData.military_strength = Math.max(0, Math.min(100, (existingFaction.military_strength || 50) + fu.powerDelta));
        }
        if (fu.goalProgress) {
          updateData.faction_goals = fu.goalProgress;
        }
        if (fu.conflictUpdate) {
          const conflicts = Array.isArray(existingFaction.current_conflicts) ? existingFaction.current_conflicts : [];
          conflicts.push(fu.conflictUpdate);
          updateData.current_conflicts = conflicts.slice(-5);
        }
        if (fu.territoryChange) {
          const territories = Array.isArray(existingFaction.territory_regions) ? existingFaction.territory_regions : [];
          territories.push(fu.territoryChange);
          updateData.territory_regions = territories.slice(-10);
        }
        await supabaseAdmin.from('factions').update(updateData).eq('id', existingFaction.id);
        updated++;
      }
    }

    // Also update campaign_brain faction_state for narrator continuity
    if (brain && factionUpdates.length > 0) {
      const factionState: any[] = Array.isArray(brain.faction_state) ? [...brain.faction_state] : [];
      for (const fu of factionUpdates) {
        if (!fu.factionName) continue;
        const idx = factionState.findIndex((f: any) =>
          (f.name || '').toLowerCase() === fu.factionName.toLowerCase()
        );
        if (idx >= 0) {
          if (fu.stanceChange) factionState[idx].stance = fu.stanceChange;
          if (fu.powerDelta) {
            const currentPower = parseInt(factionState[idx].power_level) || 50;
            factionState[idx].power_level = Math.max(0, Math.min(100, currentPower + fu.powerDelta));
          }
          if (fu.goalProgress) factionState[idx].goals = fu.goalProgress;
        }
      }
      await supabaseAdmin.from('campaign_brain').update({
        faction_state: factionState,
        updated_at: new Date().toISOString(),
      }).eq('campaign_id', campaignId);
    }

    return { updated };
  } catch (e) {
    ctx.errors.push({
      step: 'persist_faction_updates',
      error: e instanceof Error ? e.message : 'Unknown error',
      recoverable: true,
    });
    return null;
  }
}

// ─── Main Orchestrator ─────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (userData?.user) {
      const { data: subData } = await supabaseAdmin
        .from('user_subscriptions')
        .select('ai_subscription_active, founder_status')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      if (subData && !subData.founder_status && !subData.ai_subscription_active) {
        return new Response(
          JSON.stringify({ error: 'AI subscription required', code: 'SUBSCRIPTION_REQUIRED' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const {
      pipelineType,
      characterId,
      campaignId,
      ...narratorPayload
    } = body;

    // ─── Step 1: Classify Event Priority ───────────────────────
    const eventPriority = classifyEventPriority(
      narratorPayload.playerAction || '',
      { diceResult: narratorPayload.diceResult, defenseResult: narratorPayload.defenseResult, activeEnemies: narratorPayload.activeEnemies, knownNpcs: narratorPayload.knownNpcs },
    );

    // ─── Step 2: Calculate Priority Stack (gates systems) ──────
    const priorityStack = calculateServerPriorityStack(
      narratorPayload.playerAction || '',
      { activeEnemies: narratorPayload.activeEnemies, knownNpcs: narratorPayload.knownNpcs, dangerLevel: narratorPayload.dangerLevel || 0 },
    );

    // ─── Step 3: Detect Narrative Mode ─────────────────────────
    const narrativeDirective = detectNarrativeMode(
      narratorPayload.playerAction || '',
      narratorPayload,
      priorityStack,
    );

    // ─── Initialize Pipeline Context ───────────────────────────
    const ctx: OrchestratorContext = {
      player_action: narratorPayload.playerAction || '',
      character_state: narratorPayload.playerCharacter || {},
      world_state: narratorPayload.worldState || {},
      campaign_state: {},
      campaign_brain: null,
      npc_context: narratorPayload.knownNpcs || [],
      active_enemies: narratorPayload.activeEnemies || [],
      conversation_history: narratorPayload.conversationHistory || [],
      event_priority: eventPriority,
      priority_stack: priorityStack,
      narrative_directive: narrativeDirective,
      battle_results: null,
      narrator_sentiment: null,
      narration_result: null,
      sound_events: [],
      errors: [],
      cached_sentiment: null,
      auth_header: authHeader,
      api_key: LOVABLE_API_KEY,
      supabase_url: SUPABASE_URL,
      body: narratorPayload,
    };

    // ─── Step 4: Fetch World Context (gated by priority) ───────
    if (characterId) {
      await fetchWorldContext(ctx, characterId, campaignId);
    }

    // ─── Step 5: Call Battle Narrator (enriched context) ────────
    await callBattleNarrator(ctx, narratorPayload);

    // ─── Step 6: Update Sentiment (async, non-blocking) ────────
    if (characterId && ctx.narration_result?.sentimentUpdate) {
      updateSentimentInDb(ctx, characterId).catch((e) => {
        console.error('Background sentiment update failed:', e);
      });
    }

    // ─── Step 6b: Update Campaign Time (narrator-driven) ───────
    let timeUpdate: { timeBlock: string; day: number; elapsedHours: number } | null = null;
    if (campaignId && ctx.narration_result?.advanceTime) {
      timeUpdate = await updateCampaignTime(ctx, campaignId);
    }

    // ─── Step 6c: Persist NPC Updates (narrator-owned) ─────────
    let npcPersistResult: { created: number; updated: number } | null = null;
    if (campaignId && ctx.narration_result?.npcUpdates?.length > 0) {
      npcPersistResult = await persistNpcUpdates(ctx, campaignId, characterId);
    }

    // ─── Step 6d: Persist Hook Updates (narrator-owned) ─────────
    if (campaignId && ctx.campaign_brain) {
      persistHookUpdates(ctx, campaignId).catch((e) => {
        console.error('Background hook update failed:', e);
      });
    }

    // ─── Step 6e: Persist Character Discoveries (gated) ──────────
    let discoveryResults: { synced: number; fields: string[] } | null = null;
    if (characterId && ctx.narration_result?.characterDiscoveries?.length > 0) {
      discoveryResults = await persistCharacterDiscoveries(ctx, characterId);
    }

    // ─── Step 6f: Persist World State Updates (narrator-owned) ───
    let worldStateResults: { eventsCreated: number; eventsResolved: number; dangerUpdated: boolean; rumorsAdded: number } | null = null;
    if (campaignId && ctx.narration_result?.worldStateUpdates?.length > 0) {
      worldStateResults = await persistWorldStateUpdates(ctx, campaignId);
    }

    // ─── Step 6g: Persist Faction Updates (narrator-owned) ───────
    let factionResults: { updated: number } | null = null;
    if (campaignId && ctx.narration_result?.factionUpdates?.length > 0) {
      factionResults = await persistFactionUpdates(ctx, campaignId);
    }

    // ─── Step 7: Build Orchestrated Response ───────────────────
    const tension = classifyServerTension(ctx);
    const emergentHints = detectEmergentHints(ctx);

    const orchestratedResponse = {
      ...ctx.narration_result,
      _orchestrator: {
        event_priority: ctx.event_priority,
        narrative_mode: narrativeDirective.mode,
        active_focuses: priorityStack.activeFocuses,
        suppressed_systems: priorityStack.suppressedSystems,
        sound_events: ctx.sound_events,
        tension_level: tension.level,
        tension_intensity: tension.intensity,
        tension_sources: tension.sources,
        emergent_events_count: emergentHints.length,
        narrator_sentiment: ctx.narrator_sentiment
          ? {
              nickname: ctx.narrator_sentiment.nickname,
              relationship_stage: ctx.narrator_sentiment.relationship_stage,
              sentiment_score: ctx.narrator_sentiment.sentiment_score,
              curiosity: ctx.narrator_sentiment.curiosity,
              respect: ctx.narrator_sentiment.respect,
              trust: ctx.narrator_sentiment.trust,
            }
          : null,
        living_world: {
          active_events_count: (ctx.world_state.active_world_events || []).length + (worldStateResults?.eventsCreated || 0),
          rumors_count: (ctx.world_state.world_rumors || []).length + (worldStateResults?.rumorsAdded || 0),
          danger_level: (ctx.world_state.regional_states || []).reduce((max: number, r: any) => Math.max(max, r.danger_level || 0), 0),
        },
        time_update: timeUpdate || undefined,
        npc_persist: npcPersistResult || undefined,
        character_discoveries: discoveryResults || undefined,
        world_state_persist: worldStateResults || undefined,
        faction_persist: factionResults || undefined,
        pipeline_errors: ctx.errors.length > 0 ? ctx.errors : undefined,
      },
    };

    return new Response(
      JSON.stringify(orchestratedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Story orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred in the narrative orchestrator' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
