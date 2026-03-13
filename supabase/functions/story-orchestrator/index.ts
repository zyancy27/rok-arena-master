import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NARRATIVE ORCHESTRATOR — The Dungeon Master's Brain
//
// Central coordination layer that determines:
//   • which systems run
//   • in what order
//   • what context each receives
//   • how results combine into the final response
//
// Pipeline: action → simulation → sentiment → narration → sound → voice
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
  // Critical: combat outcomes, death, major discoveries
  if (context.diceResult || context.defenseResult) return 'critical';
  if (/\b(die|death|kill|destroy|explode|collapse)\b/.test(lower)) return 'critical';
  if (context.activeEnemies?.length > 0) return 'critical';
  // Important: NPC dialogue, world events
  if (/\b(talk|ask|speak|say|tell|question|negotiate|trade|buy|sell)\b/.test(lower)) return 'important';
  if (context.knownNpcs?.length > 0 && /\b(approach|greet|wave|call)\b/.test(lower)) return 'important';
  // Ambient: exploration, environmental descriptions
  return 'ambient';
}

// ─── Shared Pipeline Context ───────────────────────────────────
interface OrchestratorContext {
  // Input
  player_action: string;
  character_state: any;
  world_state: any;
  campaign_state: any;
  npc_context: any[];
  active_enemies: any[];
  conversation_history: any[];

  // Pipeline results (populated as pipeline progresses)
  event_priority: EventPriority;
  battle_results: any | null;
  narrator_sentiment: any | null;
  narration_result: any | null;
  sound_events: SoundEvent[];
  errors: PipelineError[];

  // Cached data (fetched once, reused)
  cached_sentiment: any | null;
  auth_header: string;
  api_key: string;
  supabase_url: string;
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
  const lower = narrationText.toLowerCase();

  const soundPatterns: { pattern: RegExp; type: string; intensity: 'soft' | 'medium' | 'loud' }[] = [
    // Metal
    { pattern: /metal\s+(groan|creak|screech|clang|ring)s?/gi, type: 'metal_impact', intensity: 'medium' },
    { pattern: /sword\s+(clash|clang|ring)s?|blade\s+(clash|ring)s?/gi, type: 'sword_clash', intensity: 'loud' },
    { pattern: /chains?\s+(rattle|clank|clink)s?/gi, type: 'chains', intensity: 'medium' },
    // Water
    { pattern: /water\s+(roar|rush|crash|splash)s?/gi, type: 'waterfall', intensity: 'loud' },
    { pattern: /rain\s+(hammer|pound|pelt|drum)s?/gi, type: 'rain_heavy', intensity: 'medium' },
    { pattern: /drip|water\s+drops?/gi, type: 'water_drip', intensity: 'soft' },
    // Fire
    { pattern: /fire\s+(crackle|roar|hiss)s?|flame\s+(flicker|dance|lick)s?/gi, type: 'fire_crackle', intensity: 'medium' },
    { pattern: /explosion|blast|detonat/gi, type: 'explosion', intensity: 'loud' },
    // Nature
    { pattern: /wind\s+(howl|whistle|gust|moan)s?/gi, type: 'wind_gust', intensity: 'medium' },
    { pattern: /thunder\s+(crack|boom|rumble|roll)s?|lightning\s+(strike|flash|crack)s?/gi, type: 'thunder_crack', intensity: 'loud' },
    { pattern: /branch(es)?\s+(snap|crack|break)/gi, type: 'branches', intensity: 'soft' },
    { pattern: /bird|birdsong/gi, type: 'birds', intensity: 'soft' },
    // Structural
    { pattern: /(wall|floor|ceiling|structure|building|roof|pillar)\s+(collapse|crumble|shatter|crack|buckle)s?/gi, type: 'collapse', intensity: 'loud' },
    { pattern: /glass\s+(shatter|break|crack)s?/gi, type: 'glass', intensity: 'medium' },
    { pattern: /door\s+(slam|bang|creak|open)s?/gi, type: 'door_open', intensity: 'medium' },
    // Combat
    { pattern: /impact|crash|slam|smash/gi, type: 'impact', intensity: 'loud' },
    { pattern: /arrow\s+(whistle|whoosh|fly|streak)/gi, type: 'arrow', intensity: 'medium' },
    // Atmospheric
    { pattern: /heartbeat|pulse/gi, type: 'heartbeat', intensity: 'soft' },
    { pattern: /silence|quiet|still/gi, type: 'silence', intensity: 'soft' },
    { pattern: /crowd\s+(gasp|roar|murmur|cheer)s?/gi, type: 'crowd', intensity: 'medium' },
    { pattern: /footstep|boot|step/gi, type: 'footsteps', intensity: 'soft' },
    // Magic/Energy
    { pattern: /energy\s+(surge|pulse|crackle|hum)s?|magic|arcane/gi, type: 'magic', intensity: 'medium' },
    { pattern: /rumbl(e|ing)|tremor|quake/gi, type: 'rumble', intensity: 'medium' },
  ];

  for (const { pattern, type, intensity } of soundPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(narrationText);
    if (match) {
      events.push({
        type,
        trigger_phrase: match[0],
        intensity,
      });
    }
  }

  // Deduplicate by type
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
    const supabaseAdmin = createClient(
      ctx.supabase_url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Batch: sentiment + campaign state + world simulation data in parallel
    const [sentimentResult, campaignResult, worldEventsResult, worldRumorsResult, worldStateResult] = await Promise.all([
      supabaseAdmin
        .from('narrator_sentiments')
        .select('*')
        .eq('character_id', characterId)
        .maybeSingle(),
      campaignId
        ? supabaseAdmin
            .from('campaigns')
            .select('world_state, story_context, environment_tags, current_zone, time_of_day, day_count, difficulty_scale')
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
      };
    }

    // Attach living world data to context
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
    // Inject narrator sentiment AND living world context into the request
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

    // Extract sound events from narration text
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
    // Fallback narration
    ctx.narration_result = { narration: 'The world responds to your actions...' };
  }
}

// ─── Build Living World Context for Narrator ───────────────────
function buildLivingWorldContext(ctx: OrchestratorContext): string {
  const parts: string[] = [];
  const ws = ctx.world_state;

  // Active world events (high impact first)
  const events = ws.active_world_events || [];
  if (events.length > 0) {
    const highImpact = events.filter((e: any) => e.impact_level >= 5);
    const nearby = events.filter((e: any) => e.player_proximity >= 5);
    if (highImpact.length > 0) {
      parts.push('MAJOR WORLD EVENTS (reference naturally when appropriate):');
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

  // Rumors
  const rumors = ws.world_rumors || [];
  if (rumors.length > 0) {
    parts.push('WORLD RUMORS (NPCs may mention, travelers may whisper about):');
    for (const r of rumors.slice(0, 3)) {
      parts.push(`- "${r.rumor_text}" (from ${r.origin_location})`);
    }
  }

  // Regional states
  const regions = ws.regional_states || [];
  if (regions.length > 0) {
    parts.push('REGIONAL CONDITIONS:');
    for (const r of regions) {
      const conds = (r.environment_conditions as any)?.conditions || [];
      parts.push(`- ${r.region_name}: danger ${r.danger_level}/10${conds.length ? ', ' + conds.join(', ') : ''}`);
      if (r.npc_activity_summary) parts.push(`  NPC activity: ${r.npc_activity_summary}`);
      if (r.faction_activity_summary) parts.push(`  Factions: ${r.faction_activity_summary}`);
    }
  }

  // DM Situation Frame with integrated systems awareness
  if (parts.length > 0) {
    const dangerMax = (ws.regional_states || []).reduce((max: number, r: any) => Math.max(max, r.danger_level || 0), 0);
    const hasHighEvents = events.some((e: any) => e.impact_level >= 7);
    const hasNearbyActivity = events.some((e: any) => e.player_proximity >= 5);
    
    parts.push('\nDM SITUATION FRAME (integrated narrative intelligence):');
    if (hasHighEvents) parts.push('- Major world events are unfolding. Reference them when narratively appropriate to reinforce the living world.');
    if (hasNearbyActivity) parts.push('- Nearby activity creates immediate situational hooks the narrator can weave into the scene.');
    if (dangerMax >= 7) parts.push('- Regional danger is HIGH. Pacing should lean toward tension and urgency. Injuries are more likely. Economy prices elevated.');
    else if (dangerMax >= 4) parts.push('- Regional danger is MODERATE. Balance exploration with alertness. NPCs may be nervous.');
    else parts.push('- Regional danger is LOW. Favor atmospheric exploration and character-driven moments. NPCs are relaxed.');
    if (rumors.length > 0) parts.push('- Active rumors exist. NPCs should naturally mention them in conversation to provide story hooks.');
    
    // Integrated systems guidance
    parts.push('\nINTEGRATED NARRATIVE SYSTEMS (apply automatically):');
    parts.push('- CHARACTER RELATIONSHIPS: Track trust, respect, fear, rivalry between characters. NPCs remember past interactions and behave accordingly.');
    parts.push('- NPC MEMORY: NPCs remember help, trade, insults, violence, betrayal. Their behavior changes based on history with the player.');
    parts.push('- STORY ARCS: Track ongoing narrative arcs through stages (seed→active→escalating→climax→resolved). Reference active arcs naturally.');
    parts.push('- LIVING LOCATIONS: Locations remember battles fought, structures destroyed, and NPC deaths. Narration should reflect location history.');
    parts.push('- LIVING ECONOMY: Shop prices shift based on danger levels and trade disruptions. Merchants reference supply issues when relevant.');
    parts.push('- INJURY SYSTEM: Combat consequences include arm/leg injuries, bleeding, fatigue, broken weapons. Injuries affect capabilities.');
    parts.push('- TACTICAL ENVIRONMENT: Combat narration must reference terrain, lighting, cover, elevation, and obstacles.');
    parts.push('- EXPLORATION DISCOVERIES: Players discover caves, ruins, camps, paths dynamically. Store in world memory.');
    parts.push('- PLAYER INFLUENCE: Major actions change the world (defeat bandits → safer trade routes). World simulation must reflect these changes.');
    parts.push('- CREATIVITY RECOGNITION: Reward creative player actions with richer narrative responses and unexpected positive outcomes.');
    parts.push('- NARRATIVE ATTENTION: Evaluate events by importance, danger, story relevance, rarity, and emotional impact. Only high-priority events get emphasis.');
    parts.push('- CAMPAIGN JOURNAL: Automatically record major discoveries, alliances, battles, decisions, and new locations.');
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
    const supabaseAdmin = createClient(
      ctx.supabase_url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const prev = ctx.cached_sentiment || {};
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const clamp100 = (v: number) => clamp(v, 0, 100);

    // Calculate new values
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

    // Derive relationship stage
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

    // Build observations and nickname history
    const observations = [...(prev.narrator_observations || [])];
    if (su.narrator_observation) observations.push(su.narrator_observation);
    const nicknameHistory = [...(prev.nickname_history || [])];
    if (su.nickname && su.nickname !== prev.nickname && su.nickname !== nicknameHistory[nicknameHistory.length - 1]) {
      nicknameHistory.push(su.nickname);
    }
    // Build memorable moments
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

    // Verify auth
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

    // AI subscription check
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

    // ─── Initialize Pipeline Context ───────────────────────────
    const ctx: OrchestratorContext = {
      player_action: narratorPayload.playerAction || '',
      character_state: narratorPayload.playerCharacter || {},
      world_state: narratorPayload.worldState || {},
      campaign_state: {},
      npc_context: narratorPayload.knownNpcs || [],
      active_enemies: narratorPayload.activeEnemies || [],
      conversation_history: narratorPayload.conversationHistory || [],
      event_priority: 'ambient',
      battle_results: null,
      narrator_sentiment: null,
      narration_result: null,
      sound_events: [],
      errors: [],
      cached_sentiment: null,
      auth_header: authHeader,
      api_key: LOVABLE_API_KEY,
      supabase_url: SUPABASE_URL,
    };

    // ─── Step 1: Classify Event Priority ───────────────────────
    ctx.event_priority = classifyEventPriority(
      ctx.player_action,
      { diceResult: narratorPayload.diceResult, defenseResult: narratorPayload.defenseResult, activeEnemies: ctx.active_enemies, knownNpcs: ctx.npc_context },
    );

    // ─── Step 2: Fetch World Context (sentiment + campaign state) ──
    if (characterId) {
      await fetchWorldContext(ctx, characterId, campaignId);
    }

    // ─── Step 3: Call Battle Narrator (the core narration engine) ──
    await callBattleNarrator(ctx, narratorPayload);

    // ─── Step 4: Update Sentiment in DB (async, non-blocking for response) ──
    if (characterId && ctx.narration_result?.sentimentUpdate) {
      // Fire and don't await — let it complete in background
      updateSentimentInDb(ctx, characterId).catch((e) => {
        console.error('Background sentiment update failed:', e);
      });
    }

    // ─── Step 5: Build Orchestrated Response ───────────────────
    const orchestratedResponse = {
      // Pass through all original narration result fields
      ...ctx.narration_result,

      // Orchestrator additions
      _orchestrator: {
        event_priority: ctx.event_priority,
        sound_events: ctx.sound_events,
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
          active_events_count: (ctx.world_state.active_world_events || []).length,
          rumors_count: (ctx.world_state.world_rumors || []).length,
          danger_level: (ctx.world_state.regional_states || []).reduce((max: number, r: any) => Math.max(max, r.danger_level || 0), 0),
        },
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
