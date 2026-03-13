import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// WORLD SIMULATION — Living World Engine (v2)
//
// Generates evolving world events, NPC activity, faction behavior,
// economy shifts, rumor propagation, location history, exploration
// discoveries, story arc progression, and player influence effects.
//
// This is the "behind-the-scenes" world that evolves independently
// of player actions, then feeds into the story-orchestrator so the
// battle-narrator can reference a living, breathing world.
//
// Triggered every 6-15 player messages from CampaignView.
// ═══════════════════════════════════════════════════════════════

const EVENT_TYPES = [
  'npc_conflict', 'faction_skirmish', 'creature_migration',
  'environmental_disaster', 'ancient_artifact_activation',
  'ruin_discovery', 'lost_expedition', 'magical_anomaly',
  'trade_disruption', 'territorial_dispute', 'mysterious_traveler',
  'plague_outbreak', 'celestial_event', 'resource_discovery',
  'economy_shift', 'exploration_discovery', 'reputation_event',
  'story_arc_progression', 'npc_autonomous_action', 'location_change',
];

const ENVIRONMENT_CONDITIONS = [
  'storm_approaching', 'heavy_fog', 'earthquake_tremors',
  'volcanic_activity', 'magical_disturbance', 'flooding',
  'wildfire_nearby', 'aurora_phenomenon', 'blood_moon',
  'creature_migration_path', 'toxic_spores', 'intense_heat',
  'blizzard', 'sandstorm', 'calm_and_clear',
];

interface SimulationRequest {
  campaignId: string;
  currentZone: string;
  dayCount: number;
  difficultyScale: number;
  partyLevel: number;
  timeOfDay: string;
  environmentTags?: string[];
  /** Recent player actions summary for influence tracking */
  recentPlayerActions?: string[];
  /** Character names in the party */
  partyMembers?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body: SimulationRequest = await req.json();
    const {
      campaignId, currentZone, dayCount, difficultyScale,
      partyLevel, timeOfDay, environmentTags,
      recentPlayerActions, partyMembers,
    } = body;

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'campaignId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Fetch existing world context in parallel ─────────────
    const [
      { data: existingEvents },
      { data: npcs },
      { data: factions },
      { data: existingState },
      { data: existingRumors },
      { data: campaignData },
      { data: recentLogs },
    ] = await Promise.all([
      supabaseAdmin.from('world_events').select('*').eq('campaign_id', campaignId).eq('resolved', false).limit(20),
      supabaseAdmin.from('campaign_npcs').select('*').eq('campaign_id', campaignId).eq('status', 'alive').limit(30),
      supabaseAdmin.from('factions').select('*').eq('campaign_id', campaignId).limit(10),
      supabaseAdmin.from('world_state').select('*').eq('campaign_id', campaignId).limit(5),
      supabaseAdmin.from('world_rumors').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('campaigns').select('story_context, world_state').eq('id', campaignId).maybeSingle(),
      supabaseAdmin.from('campaign_logs').select('event_type, event_data').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(15),
    ]);

    // Extract story arcs and location history from campaign story_context
    const storyContext = (campaignData?.story_context as any) || {};
    const worldStateJson = (campaignData?.world_state as any) || {};
    const activeArcs = storyContext.active_arcs || [];
    const locationHistory = worldStateJson.location_history || {};
    const economyState = worldStateJson.economy || {};
    const playerInfluence = worldStateJson.player_influence || [];

    // ─── AI-powered world simulation with all 28 systems ──────
    const simulationPrompt = `You are a COMPREHENSIVE World Simulation Engine for a living fantasy world. You simulate ALL aspects of the world evolving INDEPENDENTLY of player actions.

You must think like a Dungeon Master maintaining a living world behind the scenes. Everything you generate becomes context that the narrator uses to make the world feel alive.

CURRENT WORLD STATE:
- Current Zone: ${currentZone}
- Day: ${dayCount}
- Time: ${timeOfDay}
- Difficulty Scale: ${difficultyScale}
- Party Level: ${partyLevel}
- Party Members: ${(partyMembers || []).join(', ') || 'Unknown'}
- Environment Tags: ${JSON.stringify(environmentTags || [])}

ACTIVE EVENTS (do not duplicate):
${JSON.stringify((existingEvents || []).map(e => ({ type: e.event_type, location: e.location, description: e.description })), null, 2)}

KNOWN NPCs (with personalities, goals, memory):
${JSON.stringify((npcs || []).map(n => ({
  name: n.name, role: n.role, zone: n.current_zone,
  goal: n.npc_goal, motivation: n.npc_motivation,
  activity: n.npc_current_activity, personality: n.personality,
  relationships: n.npc_relationships,
  backstory: n.backstory ? n.backstory.substring(0, 100) : null,
})), null, 2)}

FACTIONS:
${JSON.stringify((factions || []).map(f => ({
  name: f.faction_name, goals: f.faction_goals,
  territory: f.territory_regions, strength: f.military_strength,
  conflicts: f.current_conflicts, allies: f.allies, rivals: f.rivals,
})), null, 2)}

RECENT RUMORS:
${JSON.stringify((existingRumors || []).map(r => r.rumor_text).slice(0, 5))}

ACTIVE STORY ARCS:
${JSON.stringify(activeArcs.length > 0 ? activeArcs : 'No active arcs — consider seeding one')}

LOCATION HISTORY (what happened at key places):
${JSON.stringify(locationHistory)}

ECONOMY STATE:
${JSON.stringify(economyState)}

PLAYER INFLUENCE LOG (major player actions that changed the world):
${JSON.stringify(playerInfluence.slice(-10))}

RECENT PLAYER ACTIONS (for influence tracking):
${JSON.stringify(recentPlayerActions || [])}

RECENT CAMPAIGN EVENTS:
${JSON.stringify((recentLogs || []).map(l => ({ type: l.event_type, data: l.event_data })).slice(0, 8))}

─── YOUR SIMULATION TASKS ───

Generate ALL of the following in a single JSON response. Each system feeds into the narrator's world knowledge.

1. WORLD EVENTS (1-3): New events happening in the world. Varied — not always combat. Include discoveries, anomalies, trade issues, migrations, NPC autonomous actions, economy shifts, etc.

2. RUMORS (1-2): What travelers, villagers, and merchants whisper about. Rumors should hint at world events, NPC activities, or mysteries. Some may be true, some exaggerated, some false.

3. NPC UPDATES (0-5): NPCs pursuing their OWN goals independently. A merchant travels to restock. A guard investigates a disturbance. A scholar researches something. NPCs have lives beyond the player.

4. NPC MEMORY UPDATES (0-3): Based on recent player actions, update how NPCs feel about the party. If players helped someone, that NPC remembers. If players caused destruction, nearby NPCs notice.

5. ENVIRONMENT UPDATE: Current weather, danger level, environmental conditions for the region.

6. FACTION UPDATES (0-3): Faction conflicts, alliances, territorial changes. Factions act on their goals.

7. STORY ARC PROGRESSION (0-2): Advance existing story arcs by one stage, or seed a new arc if none exist. Arcs have stages: seed → developing → escalating → climax → resolved.

8. ECONOMY SHIFTS (0-2): Price changes based on trade disruptions, resource discoveries, faction conflicts. What's expensive? What's cheap? What's unavailable?

9. EXPLORATION DISCOVERIES (0-2): New locations, ruins, camps, hidden paths that exist in the world now — discoverable if the player explores in that direction.

10. LOCATION HISTORY UPDATES (0-2): Record what has happened at specific locations (battles, destruction, NPC deaths, environmental changes).

11. PLAYER INFLUENCE EFFECTS (0-2): Consequences of recent player actions on the world. If players defeated bandits, trade routes are safer. If players destroyed something, it stays destroyed.

12. CREATURE ACTIVITY (0-1): What wildlife, monsters, or creatures are doing in the region. Migrations, territorial behavior, nesting, hunting patterns.

13. REGIONAL GRID UPDATE (1-3): Independent simulation data for nearby regions. Each region has its own danger_level, weather, faction_presence, and events that evolve independently.

14. STORY GRAVITY EVENTS (0-2): Events that should naturally pull player attention. Each has a gravity_score (1-10) based on danger, NPC involvement, proximity, story importance. Higher gravity events evolve if ignored.

15. CHARACTER PSYCHOLOGY EVENTS (0-2): Based on recent actions, infer psychological impacts on the player character. Combat damage increases fear, ally support increases confidence, betrayal decreases trust.

16. RELATIONSHIP UPDATES (0-3): How NPCs' relationships with the player and each other have shifted. Track trust, respect, fear, loyalty changes.

17. LORE CONSISTENCY RULES (0-2): Any new world rules or lore facts established by narration that should be enforced going forward.

18. EMERGENT EVENTS (0-2): Unscripted events that emerge LOGICALLY from world conditions. A bandit camp forms because guards are stretched thin. A market shortage appears because a road became unsafe. A creature migrates due to environmental change. A flooded route reveals an old ruin. Each event must have a clear cause, affected NPCs, and an escalation path if ignored.

19. CHARACTER IDENTITY OBSERVATIONS (0-3): Based on recent player actions, observe behavioral patterns WITHOUT assigning destiny. Track tendencies like: protective, curious, cautious, reckless, compassionate, cold, stubborn, prideful, loyal, self_sacrificing, opportunistic. These are evolving observations, not fixed traits. Include a confidence percentage and a brief example action. If a pattern is strong enough, suggest a subtle narrator reflection line.

20. CHARACTER CONTRADICTIONS (0-2): Detect when recent player actions CONTRADICT established behavioral tendencies. If the character is usually cautious but just charged recklessly, note it. Include whether it indicates growth, stress, emotional shift, or surprise. These are NOT judgments — they are observations.

21. VALUES UNDER PRESSURE (0-3): Based on choices made during intense moments (combat, danger, moral dilemmas), identify what the character PROTECTS or PRIORITIZES. Values: survival, loyalty, honor, truth, mercy, power, freedom, duty, justice, curiosity, family, knowledge, pride, compassion, order. Track what was chosen OVER what.

22. PERSONAL TRIGGERS (0-3): Using character timeline and past events, identify keywords, locations, symbols, sounds, or objects in the current environment that connect to character history. Generate a subtle resonance line the narrator can use.

23. SILENCE PATTERNS (0-2): If the player has been avoiding certain topics, people, or decisions, note the pattern. Silence is storytelling.

24. REPUTATION UPDATES (0-3): Track how the world's perception of the character changes based on actions. Reputation traits: dangerous, heroic, reckless, honorable, unpredictable, merciless, wise, cowardly, mysterious, trustworthy, cunning, generous, ruthless, kind, feared, respected.

25. MEMORY WEIGHT EVENTS (0-2): Determine which recent events are significant enough to become weighted memories. Factor in: emotional intensity, first experiences, relationship changes, identity revelations, survival threats, loss, betrayal, sacrifice, discovery, moral choices. Assign weight 0-100 and mark truly pivotal ones as defining.

Respond ONLY with valid JSON:
{
  "world_events": [
    {
      "event_type": "<type>",
      "location": "<region or zone>",
      "participants": ["<names>"],
      "description": "<1-2 sentences>",
      "impact_level": <1-10>,
      "story_relevance": <1-10>,
      "player_proximity": <0-10>
    }
  ],
  "rumors": [
    {
      "rumor_text": "<what people whisper>",
      "origin_location": "<where it started>",
      "spread_level": <1-5>,
      "is_true": <true|false>,
      "related_event": "<event_type or null>"
    }
  ],
  "npc_updates": [
    {
      "npc_name": "<name>",
      "new_activity": "<what they are doing>",
      "new_zone": "<where they moved, or null>",
      "new_goal": "<updated goal, or null>",
      "mood": "<current emotional state>"
    }
  ],
  "npc_memory_updates": [
    {
      "npc_name": "<name>",
      "memory_type": "<help|trade|insult|violence|betrayal|kindness|reputation>",
      "memory_description": "<what they remember>",
      "disposition_shift": <-10 to 10>
    }
  ],
  "environment_update": {
    "conditions": ["<condition tags>"],
    "danger_level": <0-10>,
    "summary": "<brief environment description>",
    "weather": "<current weather>",
    "time_feeling": "<how the time of day feels>"
  },
  "faction_updates": [
    {
      "faction_name": "<name>",
      "new_conflict": "<description or null>",
      "strength_change": <-5 to 5>,
      "territory_change": "<gained or lost territory, or null>",
      "new_ally": "<faction name or null>",
      "new_rival": "<faction name or null>"
    }
  ],
  "story_arc_updates": [
    {
      "arc_title": "<title>",
      "new_stage": "<seed|developing|escalating|climax|resolved>",
      "stage_description": "<what happened in this stage>",
      "locations_involved": ["<location names>"],
      "participants_involved": ["<NPC or faction names>"],
      "stakes": "<what's at risk>",
      "is_new_arc": <true|false>
    }
  ],
  "economy_shifts": [
    {
      "item_category": "<weapons|armor|consumables|services|rare_materials>",
      "price_modifier": <0.5 to 2.0>,
      "reason": "<why prices changed>",
      "affected_zone": "<zone name or 'all'>"
    }
  ],
  "exploration_discoveries": [
    {
      "discovery_type": "<cave|ruin|camp|path|battlefield|shrine|settlement|anomaly>",
      "location": "<where it can be found>",
      "description": "<1-2 sentences>",
      "danger_level": <1-10>,
      "loot_potential": "<none|low|medium|high>"
    }
  ],
  "location_history_updates": [
    {
      "location": "<place name>",
      "event": "<what happened here>",
      "day": ${dayCount},
      "permanent": <true|false>
    }
  ],
  "player_influence_effects": [
    {
      "cause": "<what the player did>",
      "effect": "<how the world changed>",
      "affected_zone": "<zone or 'regional'>",
      "permanence": "<temporary|lasting|permanent>"
    }
  ],
  "creature_activity": {
    "description": "<what creatures are doing in the region>",
    "threat_level": <0-5>,
    "creature_types": ["<types>"]
  },
  "regional_grid": [
    {
      "region_id": "<region_name>",
      "danger_level": <0-10>,
      "weather": "<current weather>",
      "faction_presence": [{"name": "<faction>", "control": <0-100>, "hostility": <0-10>}],
      "active_event": "<brief description or null>",
      "evolving_threat": "<description of threat that worsens if ignored, or null>",
      "gravity_score": <1-10>
    }
  ],
  "story_gravity_events": [
    {
      "event_description": "<what's pulling attention>",
      "gravity_score": <1-10>,
      "evolution_if_ignored": "<what happens if players don't engage>",
      "location": "<where>"
    }
  ],
  "psychology_events": [
    {
      "event_type": "<combat_damage|ally_support|betrayal|victory|defeat|death_witnessed|rescue|threat|kindness|loss>",
      "severity": <1-10>,
      "description": "<what happened psychologically>"
    }
  ],
  "relationship_updates": [
    {
      "source": "<character/NPC name>",
      "target": "<character/NPC name>",
      "tone": "<fearful|hostile|respectful|friendly|suspicious|loyal|neutral>",
      "trust_change": <-10 to 10>,
      "respect_change": <-10 to 10>,
      "fear_change": <-10 to 10>,
      "reason": "<why>"
    }
  ],
  "lore_rules": [
    {
      "category": "<technology_level|world_lore|faction_history|power_rules>",
      "rule": "<rule text>",
      "priority": <1-10>
    }
  ],
  "emergent_events": [
    {
      "title": "<event name>",
      "category": "<security|economy|environment|social|discovery|faction|creature|infrastructure>",
      "description": "<1-2 sentences>",
      "cause": "<clear reason this happened>",
      "urgency": "<background|developing|imminent|active>",
      "gravity": <1-10>,
      "affected_npcs": ["<names>"],
      "escalation": "<what happens if ignored>",
      "region": "<region name>"
    }
  ],
  "character_identity_observations": [
    {
      "tendency": "<protective|curious|cautious|reckless|compassionate|cold|stubborn|prideful|loyal|self_sacrificing|opportunistic|diplomatic|analytical|instinctive|defiant>",
      "confidence": <0-100>,
      "example_action": "<brief description of what the player did>",
      "observation_count": <number>,
      "narrator_reflection": "<subtle reflection line or null>"
    }
  ],
  "character_contradictions": {
    "recurring_shifts": [
      {
        "tendency": "<established tendency being contradicted>",
        "contradicted_by": "<what the action signals instead>",
        "count": <number of times>,
        "interpretation": "<growth|stress|emotional_shift|surprise>"
      }
    ]
  },
  "values_under_pressure": {
    "top_values": [
      {
        "value": "<survival|loyalty|honor|truth|mercy|power|freedom|duty|justice|curiosity|family|knowledge|pride|compassion|order>",
        "count": <times chosen under pressure>,
        "avg_pressure": <0-100>,
        "chosen_over": ["<competing values>"]
      }
    ],
    "recent_dilemma": {
      "chosen": "<value>",
      "rejected": "<value>",
      "context": "<brief description>"
    }
  },
  "personal_triggers": {
    "active_triggers": [
      {
        "category": "<location|symbol|sound|smell|object|faction|phrase|weather|creature|name>",
        "keywords": ["<trigger words>"],
        "origin": "<timeline event this relates to>",
        "weight": <1-5>,
        "valence": "<positive|negative|complex>",
        "resonance_line": "<subtle narrator line when triggered>"
      }
    ]
  },
  "silence_patterns": {
    "patterns": [
      {
        "subject": "<what is being avoided>",
        "category": "<topic|person|question|confrontation|emotion|decision>",
        "count": <avoidance count>
      }
    ]
  },
  "reputation_updates": [
    {
      "trait": "<dangerous|heroic|reckless|honorable|unpredictable|merciless|wise|cowardly|mysterious|trustworthy|cunning|generous|ruthless|kind|feared|respected>",
      "strength": <0-100>,
      "source": "<what caused this reputation>",
      "region": "<region or 'global'>"
    }
  ],
  "memory_weight_events": [
    {
      "event": "<what happened>",
      "weight": <0-100>,
      "factors": ["<emotional_intensity|first_experience|relationship_change|identity_revelation|survival_threat|loss|victory|betrayal|sacrifice|discovery|world_impact|moral_choice|witnessed_death|promise_made|fear_confronted>"],
      "valence": "<positive|negative|complex|neutral>",
      "is_defining": <true|false>
    }
  ]
}`;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: simulationPrompt }],
        temperature: 0.9,
        max_tokens: 4500,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI call failed: ${aiResponse.status} ${errText.substring(0, 200)}`);
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || '{}';
    
    // Parse AI response
    let simulation: any;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      simulation = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error('Failed to parse simulation response:', rawContent.substring(0, 500));
      simulation = {};
    }

    // ─── Persist results in parallel ──────────────────────────
    const dbOps: Promise<any>[] = [];

    // Insert world events
    if (simulation.world_events?.length > 0) {
      const eventsToInsert = simulation.world_events.slice(0, 3).map((e: any) => ({
        campaign_id: campaignId,
        event_type: EVENT_TYPES.includes(e.event_type) ? e.event_type : 'unknown',
        location: e.location || currentZone,
        participants: Array.isArray(e.participants) ? e.participants : [],
        description: e.description || '',
        impact_level: Math.min(10, Math.max(1, e.impact_level || 1)),
        story_relevance: Math.min(10, Math.max(1, e.story_relevance || 1)),
        player_proximity: Math.min(10, Math.max(0, e.player_proximity || 0)),
      }));
      dbOps.push(supabaseAdmin.from('world_events').insert(eventsToInsert));
    }

    // Insert rumors
    if (simulation.rumors?.length > 0) {
      const rumorsToInsert = simulation.rumors.slice(0, 2).map((r: any) => ({
        campaign_id: campaignId,
        rumor_text: r.rumor_text || '',
        origin_location: r.origin_location || currentZone,
        spread_level: Math.min(5, Math.max(1, r.spread_level || 1)),
      }));
      dbOps.push(supabaseAdmin.from('world_rumors').insert(rumorsToInsert));
    }

    // Update NPC activities and memory
    if (simulation.npc_updates?.length > 0 && npcs?.length) {
      for (const update of simulation.npc_updates.slice(0, 5)) {
        const matchingNpc = npcs.find(n => n.name.toLowerCase() === update.npc_name?.toLowerCase());
        if (matchingNpc) {
          const updateData: any = { updated_at: new Date().toISOString() };
          if (update.new_activity) updateData.npc_current_activity = update.new_activity;
          if (update.new_zone) updateData.current_zone = update.new_zone;
          if (update.new_goal) updateData.npc_goal = update.new_goal;
          if (Object.keys(updateData).length > 1) {
            dbOps.push(supabaseAdmin.from('campaign_npcs').update(updateData).eq('id', matchingNpc.id));
          }
        }
      }
    }

    // Apply NPC memory updates (store in npc_relationships metadata)
    if (simulation.npc_memory_updates?.length > 0 && npcs?.length) {
      for (const memUpdate of simulation.npc_memory_updates.slice(0, 3)) {
        const matchingNpc = npcs.find(n => n.name.toLowerCase() === memUpdate.npc_name?.toLowerCase());
        if (matchingNpc) {
          const existingMeta = (matchingNpc.metadata as any) || {};
          const memories = existingMeta.player_memories || [];
          memories.push({
            type: memUpdate.memory_type,
            description: memUpdate.memory_description,
            day: dayCount,
            disposition_shift: memUpdate.disposition_shift || 0,
          });
          dbOps.push(
            supabaseAdmin.from('campaign_npcs').update({
              metadata: { ...existingMeta, player_memories: memories.slice(-20) },
              updated_at: new Date().toISOString(),
            }).eq('id', matchingNpc.id)
          );
        }
      }
    }

    // Update world state
    if (simulation.environment_update) {
      const env = simulation.environment_update;
      dbOps.push(
        supabaseAdmin.from('world_state').upsert({
          campaign_id: campaignId,
          region_name: currentZone,
          environment_conditions: {
            conditions: env.conditions || [],
            summary: env.summary || '',
            weather: env.weather || '',
            time_feeling: env.time_feeling || '',
            creature_activity: simulation.creature_activity || null,
          },
          danger_level: Math.min(10, Math.max(0, env.danger_level || 0)),
          npc_activity_summary: simulation.npc_updates?.map((u: any) => `${u.npc_name}: ${u.new_activity}`).join('; ') || null,
          faction_activity_summary: simulation.faction_updates?.map((f: any) => `${f.faction_name}: ${f.new_conflict || 'stable'}`).join('; ') || null,
          active_events: (simulation.world_events || []).map((e: any) => e.event_type),
          last_simulated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'campaign_id,region_name' })
      );
    }

    // Update faction data
    if (simulation.faction_updates?.length > 0 && factions?.length) {
      for (const fu of simulation.faction_updates.slice(0, 5)) {
        const matchingFaction = factions.find(f => f.faction_name.toLowerCase() === fu.faction_name?.toLowerCase());
        if (matchingFaction) {
          const newStrength = Math.min(100, Math.max(0, matchingFaction.military_strength + (fu.strength_change || 0)));
          const newConflicts = [...(matchingFaction.current_conflicts as any[] || [])];
          if (fu.new_conflict) newConflicts.push(fu.new_conflict);
          const newAllies = [...(matchingFaction.allies as any[] || [])];
          if (fu.new_ally) newAllies.push(fu.new_ally);
          const newRivals = [...(matchingFaction.rivals as any[] || [])];
          if (fu.new_rival) newRivals.push(fu.new_rival);
          dbOps.push(
            supabaseAdmin.from('factions').update({
              military_strength: newStrength,
              current_conflicts: newConflicts.slice(-10),
              allies: [...new Set(newAllies)].slice(-10),
              rivals: [...new Set(newRivals)].slice(-10),
              updated_at: new Date().toISOString(),
            }).eq('id', matchingFaction.id)
          );
        }
      }
    }

    // Persist story arcs, economy, location history, and player influence into campaign.world_state
    const updatedWorldState: any = { ...worldStateJson };

    // Story arc updates
    if (simulation.story_arc_updates?.length > 0) {
      const arcs = [...(storyContext.active_arcs || [])];
      for (const arcUpdate of simulation.story_arc_updates.slice(0, 2)) {
        if (arcUpdate.is_new_arc) {
          arcs.push({
            title: arcUpdate.arc_title,
            stage: arcUpdate.new_stage || 'seed',
            stage_description: arcUpdate.stage_description,
            locations: arcUpdate.locations_involved || [],
            participants: arcUpdate.participants_involved || [],
            stakes: arcUpdate.stakes || '',
            started_day: dayCount,
          });
        } else {
          const existing = arcs.find((a: any) => a.title?.toLowerCase() === arcUpdate.arc_title?.toLowerCase());
          if (existing) {
            existing.stage = arcUpdate.new_stage || existing.stage;
            existing.stage_description = arcUpdate.stage_description || existing.stage_description;
            if (arcUpdate.locations_involved) existing.locations = [...new Set([...(existing.locations || []), ...arcUpdate.locations_involved])];
            if (arcUpdate.participants_involved) existing.participants = [...new Set([...(existing.participants || []), ...arcUpdate.participants_involved])];
          }
        }
      }
      // Remove resolved arcs (keep in history)
      const resolvedArcs = arcs.filter((a: any) => a.stage === 'resolved');
      const activeArcsFinal = arcs.filter((a: any) => a.stage !== 'resolved');
      updatedWorldState.resolved_arcs = [...(updatedWorldState.resolved_arcs || []), ...resolvedArcs].slice(-20);
      storyContext.active_arcs = activeArcsFinal.slice(-10);
    }

    // Economy shifts
    if (simulation.economy_shifts?.length > 0) {
      const economy = updatedWorldState.economy || {};
      for (const shift of simulation.economy_shifts.slice(0, 2)) {
        economy[shift.item_category] = {
          price_modifier: Math.min(2.0, Math.max(0.5, shift.price_modifier || 1.0)),
          reason: shift.reason,
          affected_zone: shift.affected_zone || 'all',
          updated_day: dayCount,
        };
      }
      updatedWorldState.economy = economy;
    }

    // Exploration discoveries
    if (simulation.exploration_discoveries?.length > 0) {
      const discoveries = updatedWorldState.discoverable_locations || [];
      for (const disc of simulation.exploration_discoveries.slice(0, 2)) {
        discoveries.push({
          type: disc.discovery_type,
          location: disc.location,
          description: disc.description,
          danger_level: disc.danger_level || 1,
          loot_potential: disc.loot_potential || 'low',
          discovered: false,
          generated_day: dayCount,
        });
      }
      updatedWorldState.discoverable_locations = discoveries.slice(-20);
    }

    // Location history
    if (simulation.location_history_updates?.length > 0) {
      const locHistory = updatedWorldState.location_history || {};
      for (const locUpdate of simulation.location_history_updates.slice(0, 2)) {
        const key = locUpdate.location || currentZone;
        if (!locHistory[key]) locHistory[key] = [];
        locHistory[key].push({
          event: locUpdate.event,
          day: locUpdate.day || dayCount,
          permanent: locUpdate.permanent || false,
        });
        locHistory[key] = locHistory[key].slice(-10);
      }
      updatedWorldState.location_history = locHistory;
    }

    // Player influence effects
    if (simulation.player_influence_effects?.length > 0) {
      const influences = updatedWorldState.player_influence || [];
      for (const inf of simulation.player_influence_effects.slice(0, 2)) {
        influences.push({
          cause: inf.cause,
          effect: inf.effect,
          zone: inf.affected_zone,
          permanence: inf.permanence || 'temporary',
          day: dayCount,
        });
      }
      updatedWorldState.player_influence = influences.slice(-30);
    }

    // Creature activity
    if (simulation.creature_activity) {
      updatedWorldState.creature_activity = {
        ...simulation.creature_activity,
        updated_day: dayCount,
      };
    }

    // Regional grid data
    if (simulation.regional_grid?.length > 0) {
      const grid = updatedWorldState.regional_grid || {};
      for (const region of simulation.regional_grid.slice(0, 3)) {
        grid[region.region_id] = {
          danger_level: Math.min(10, Math.max(0, region.danger_level || 0)),
          weather: region.weather || 'clear',
          faction_presence: region.faction_presence || [],
          active_event: region.active_event || null,
          evolving_threat: region.evolving_threat || null,
          gravity_score: Math.min(10, Math.max(1, region.gravity_score || 1)),
          updated_day: dayCount,
        };
      }
      updatedWorldState.regional_grid = grid;
    }

    // Story gravity events
    if (simulation.story_gravity_events?.length > 0) {
      const gravityEvents = updatedWorldState.story_gravity_events || [];
      for (const ge of simulation.story_gravity_events.slice(0, 2)) {
        gravityEvents.push({
          description: ge.event_description,
          gravity_score: ge.gravity_score,
          evolution_if_ignored: ge.evolution_if_ignored,
          location: ge.location,
          day: dayCount,
          resolved: false,
        });
      }
      updatedWorldState.story_gravity_events = gravityEvents.slice(-15);
    }

    // Character psychology events
    if (simulation.psychology_events?.length > 0) {
      const psych = updatedWorldState.character_psychology || { events: [] };
      for (const pe of simulation.psychology_events.slice(0, 2)) {
        psych.events = [...(psych.events || []), { ...pe, day: dayCount }].slice(-20);
      }
      psych.dominant_emotion = simulation.psychology_events[0]?.event_type === 'combat_damage' ? 'fear' : 
        simulation.psychology_events[0]?.event_type === 'victory' ? 'confidence' : psych.dominant_emotion;
      updatedWorldState.character_psychology = psych;
    }

    // Relationship updates
    if (simulation.relationship_updates?.length > 0) {
      const rels = updatedWorldState.character_relationships || [];
      for (const ru of simulation.relationship_updates.slice(0, 3)) {
        const existing = rels.find((r: any) => r.source === ru.source && r.target === ru.target);
        if (existing) {
          existing.tone = ru.tone;
          existing.trust = Math.min(100, Math.max(0, (existing.trust || 50) + (ru.trust_change || 0)));
          existing.respect = Math.min(100, Math.max(0, (existing.respect || 50) + (ru.respect_change || 0)));
          existing.fear = Math.min(100, Math.max(0, (existing.fear || 10) + (ru.fear_change || 0)));
          existing.reason = ru.reason;
        } else {
          rels.push({ source: ru.source, target: ru.target, tone: ru.tone, trust: 50 + (ru.trust_change || 0), respect: 50 + (ru.respect_change || 0), fear: 10 + (ru.fear_change || 0), reason: ru.reason });
        }
      }
      updatedWorldState.character_relationships = rels.slice(-30);
    }

    // Lore consistency rules
    if (simulation.lore_rules?.length > 0) {
      const lore = updatedWorldState.lore_rules || { world_rules: [] };
      for (const lr of simulation.lore_rules.slice(0, 2)) {
        if (lr.category === 'technology_level') lore.technology_level = lr.rule;
        else lore.world_rules = [...(lore.world_rules || []), lr.rule].slice(-20);
      }
      updatedWorldState.lore_rules = lore;
    }

    // Emergent events (from world conditions)
    if (simulation.emergent_events?.length > 0) {
      const emergent = updatedWorldState.emergent_events || [];
      for (const ee of simulation.emergent_events.slice(0, 2)) {
        emergent.push({
          title: ee.title,
          category: ee.category,
          description: ee.description,
          cause: ee.cause,
          urgency: ee.urgency || 'developing',
          gravity: Math.min(10, Math.max(1, ee.gravity || 5)),
          affected_npcs: ee.affected_npcs || [],
          escalation: ee.escalation || '',
          region: ee.region || currentZone,
          day: dayCount,
          resolved: false,
        });
      }
      // Keep only recent unresolved + cap
      updatedWorldState.emergent_events = emergent
        .filter((e: any) => !e.resolved)
        .slice(-15);
    }

    // Character identity discovery observations
    if (simulation.character_identity_observations?.length > 0) {
      const identity = updatedWorldState.character_identity_discovery || {
        emerging_tendencies: [],
        pending_reflection: null,
      };
      const tendencies = identity.emerging_tendencies || [];
      for (const obs of simulation.character_identity_observations.slice(0, 3)) {
        const existing = tendencies.find((t: any) => t.tendency === obs.tendency);
        if (existing) {
          existing.confidence = Math.min(100, Math.max(0, obs.confidence || existing.confidence));
          existing.count = (existing.count || 0) + (obs.observation_count || 1);
          existing.last_example = obs.example_action || existing.last_example;
        } else {
          tendencies.push({
            tendency: obs.tendency,
            confidence: Math.min(100, Math.max(0, obs.confidence || 15)),
            count: obs.observation_count || 1,
            last_example: obs.example_action || '',
          });
        }
        // Set reflection if provided and confidence is high enough
        if (obs.narrator_reflection && (obs.confidence || 0) >= 40) {
          identity.pending_reflection = obs.narrator_reflection;
        }
      }
      // Sort by confidence, keep top tendencies
      identity.emerging_tendencies = tendencies
        .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 8);
      updatedWorldState.character_identity_discovery = identity;
    }

    // Character contradictions
    if (simulation.character_contradictions?.recurring_shifts?.length > 0) {
      updatedWorldState.character_contradictions = {
        recurring_shifts: simulation.character_contradictions.recurring_shifts.slice(0, 5),
      };
    }

    // Values under pressure
    if (simulation.values_under_pressure?.top_values?.length > 0) {
      updatedWorldState.character_values = {
        top_values: simulation.values_under_pressure.top_values.slice(0, 5),
        recent_dilemma: simulation.values_under_pressure.recent_dilemma || null,
      };
    }

    // Personal triggers
    if (simulation.personal_triggers?.active_triggers?.length > 0) {
      updatedWorldState.personal_triggers = {
        active_triggers: simulation.personal_triggers.active_triggers.slice(0, 8),
      };
    }

    // Silence patterns
    if (simulation.silence_patterns?.patterns?.length > 0) {
      const existing = updatedWorldState.character_silence?.patterns || [];
      for (const sp of simulation.silence_patterns.patterns) {
        const ex = existing.find((e: any) => e.subject === sp.subject);
        if (ex) { ex.count = (ex.count || 0) + (sp.count || 1); }
        else { existing.push({ subject: sp.subject, category: sp.category, count: sp.count || 1 }); }
      }
      updatedWorldState.character_silence = { patterns: existing.slice(0, 10) };
    }

    // Reputation updates
    if (simulation.reputation_updates?.length > 0) {
      const repId = updatedWorldState.reputation_vs_identity || { reputation: [], conflicts: [] };
      for (const ru of simulation.reputation_updates.slice(0, 3)) {
        const ex = repId.reputation.find((r: any) => r.trait === ru.trait && r.region === ru.region);
        if (ex) { ex.strength = Math.min(100, (ex.strength || 0) + (ru.strength || 10) * 0.3); }
        else { repId.reputation.push({ trait: ru.trait, strength: ru.strength || 30, source: ru.source, region: ru.region }); }
      }
      // Detect conflicts with identity
      const tendencies = (updatedWorldState.character_identity_discovery?.emerging_tendencies || []).map((t: any) => t.tendency);
      if (tendencies.length > 0) {
        const OPPOSITES: Record<string, string[]> = {
          dangerous: ['compassionate', 'diplomatic', 'protective'],
          merciless: ['compassionate', 'self_sacrificing', 'protective'],
          feared: ['compassionate', 'diplomatic'],
          cowardly: ['defiant', 'protective', 'self_sacrificing'],
          heroic: ['cold', 'opportunistic'],
        };
        repId.conflicts = [];
        for (const r of repId.reputation) {
          const opps = OPPOSITES[r.trait] || [];
          for (const t of tendencies) {
            if (opps.includes(t)) {
              repId.conflicts.push({ reputation: r.trait, identity: t, divergence: Math.min(100, (r.strength || 30) * 0.7 + 30) });
            }
          }
        }
      }
      updatedWorldState.reputation_vs_identity = repId;
    }

    // Memory weight events
    if (simulation.memory_weight_events?.length > 0) {
      const memWeight = updatedWorldState.memory_weight || { defining_moments: [], major_memories: [] };
      for (const mw of simulation.memory_weight_events.slice(0, 2)) {
        const entry = { event: mw.event, weight: mw.weight, factors: mw.factors, valence: mw.valence, day: dayCount };
        if (mw.is_defining || mw.weight >= 70) {
          memWeight.defining_moments = [...(memWeight.defining_moments || []), entry].slice(-5);
        } else {
          memWeight.major_memories = [...(memWeight.major_memories || []), entry].slice(-10);
        }
      }
      updatedWorldState.memory_weight = memWeight;
    }

    // Persist updated world_state and story_context to campaign
    dbOps.push(
      supabaseAdmin.from('campaigns').update({
        world_state: updatedWorldState,
        story_context: storyContext,
        updated_at: new Date().toISOString(),
      }).eq('id', campaignId)
    );

    // Log major simulation events to campaign_logs
    const logEntries: any[] = [];
    if (simulation.story_arc_updates?.length > 0) {
      logEntries.push({
        campaign_id: campaignId,
        event_type: 'world_simulation_arc',
        event_data: { arcs: simulation.story_arc_updates },
      });
    }
    if (simulation.player_influence_effects?.length > 0) {
      logEntries.push({
        campaign_id: campaignId,
        event_type: 'world_simulation_influence',
        event_data: { effects: simulation.player_influence_effects },
      });
    }
    if (logEntries.length > 0) {
      dbOps.push(supabaseAdmin.from('campaign_logs').insert(logEntries));
    }

    // Resolve old events (older than 7 days)
    dbOps.push(
      supabaseAdmin.from('world_events')
        .update({ resolved: true, updated_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .eq('resolved', false)
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    );

    // Execute all DB operations
    await Promise.allSettled(dbOps);

    return new Response(
      JSON.stringify({
        success: true,
        events_generated: simulation.world_events?.length || 0,
        rumors_generated: simulation.rumors?.length || 0,
        npc_updates: simulation.npc_updates?.length || 0,
        arcs_updated: simulation.story_arc_updates?.length || 0,
        economy_shifts: simulation.economy_shifts?.length || 0,
        discoveries: simulation.exploration_discoveries?.length || 0,
        influence_effects: simulation.player_influence_effects?.length || 0,
        simulation_summary: simulation,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('World simulation error:', error);
    return new Response(
      JSON.stringify({ error: 'World simulation failed', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
