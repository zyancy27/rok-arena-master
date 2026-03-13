import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// WORLD SIMULATION — Living World Engine
//
// Generates evolving world events, NPC activity, faction behavior,
// and environmental changes that feed into the story-orchestrator.
//
// Triggered every 6 player messages from CampaignView.
// ═══════════════════════════════════════════════════════════════

const EVENT_TYPES = [
  'npc_conflict', 'faction_skirmish', 'creature_migration',
  'environmental_disaster', 'ancient_artifact_activation',
  'ruin_discovery', 'lost_expedition', 'magical_anomaly',
  'trade_disruption', 'territorial_dispute', 'mysterious_traveler',
  'plague_outbreak', 'celestial_event', 'resource_discovery',
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
    const { campaignId, currentZone, dayCount, difficultyScale, partyLevel, timeOfDay, environmentTags } = body;

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
    ] = await Promise.all([
      supabaseAdmin.from('world_events').select('*').eq('campaign_id', campaignId).eq('resolved', false).limit(20),
      supabaseAdmin.from('campaign_npcs').select('*').eq('campaign_id', campaignId).eq('status', 'alive').limit(30),
      supabaseAdmin.from('factions').select('*').eq('campaign_id', campaignId).limit(10),
      supabaseAdmin.from('world_state').select('*').eq('campaign_id', campaignId).limit(5),
      supabaseAdmin.from('world_rumors').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(10),
    ]);

    // ─── AI-powered world simulation ──────────────────────────
    const simulationPrompt = `You are a World Simulation Engine for a living fantasy world. Generate evolving world events that happen INDEPENDENTLY of player actions.

CURRENT WORLD STATE:
- Current Zone: ${currentZone}
- Day: ${dayCount}
- Time: ${timeOfDay}
- Difficulty Scale: ${difficultyScale}
- Party Level: ${partyLevel}
- Environment Tags: ${JSON.stringify(environmentTags || [])}

ACTIVE EVENTS (do not duplicate):
${JSON.stringify((existingEvents || []).map(e => ({ type: e.event_type, location: e.location, description: e.description })), null, 2)}

KNOWN NPCs:
${JSON.stringify((npcs || []).map(n => ({
  name: n.name, role: n.role, zone: n.current_zone,
  goal: n.npc_goal, activity: n.npc_current_activity,
})), null, 2)}

FACTIONS:
${JSON.stringify((factions || []).map(f => ({
  name: f.faction_name, goals: f.faction_goals,
  territory: f.territory_regions, strength: f.military_strength,
  conflicts: f.current_conflicts,
})), null, 2)}

RECENT RUMORS:
${JSON.stringify((existingRumors || []).map(r => r.rumor_text).slice(0, 5))}

Generate 1-3 new world events and 1-2 rumors. Make them feel like a living world evolving on its own.
NPCs should occasionally pursue their goals, factions should have minor conflicts.
Events should be varied — not always combat. Include discoveries, anomalies, trade issues, migrations, etc.

Respond ONLY with valid JSON:
{
  "world_events": [
    {
      "event_type": "<one of: npc_conflict, faction_skirmish, creature_migration, environmental_disaster, ancient_artifact_activation, ruin_discovery, lost_expedition, magical_anomaly, trade_disruption, territorial_dispute, mysterious_traveler, celestial_event, resource_discovery>",
      "location": "<region or zone name>",
      "participants": ["<names of involved NPCs or factions>"],
      "description": "<1-2 sentence vivid description>",
      "impact_level": <1-10>,
      "story_relevance": <1-10>,
      "player_proximity": <0-10 how close to current zone>
    }
  ],
  "rumors": [
    {
      "rumor_text": "<what travelers/villagers whisper about>",
      "origin_location": "<where the rumor started>",
      "spread_level": <1-5>
    }
  ],
  "npc_updates": [
    {
      "npc_name": "<name of existing NPC>",
      "new_activity": "<what they are doing now>",
      "new_zone": "<where they moved to, or null>"
    }
  ],
  "environment_update": {
    "conditions": ["<condition tags>"],
    "danger_level": <0-10>,
    "summary": "<brief description of current environment state>"
  },
  "faction_updates": [
    {
      "faction_name": "<name>",
      "new_conflict": "<brief description or null>",
      "strength_change": <-5 to +5>
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
        max_tokens: 2000,
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

    // Update NPC activities
    if (simulation.npc_updates?.length > 0 && npcs?.length) {
      for (const update of simulation.npc_updates.slice(0, 5)) {
        const matchingNpc = npcs.find(n => n.name.toLowerCase() === update.npc_name?.toLowerCase());
        if (matchingNpc) {
          const updateData: any = {};
          if (update.new_activity) updateData.npc_current_activity = update.new_activity;
          if (update.new_zone) updateData.current_zone = update.new_zone;
          if (Object.keys(updateData).length > 0) {
            dbOps.push(
              supabaseAdmin.from('campaign_npcs').update(updateData).eq('id', matchingNpc.id)
            );
          }
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
          environment_conditions: { conditions: env.conditions || [], summary: env.summary || '' },
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
          dbOps.push(
            supabaseAdmin.from('factions').update({
              military_strength: newStrength,
              current_conflicts: newConflicts.slice(-10),
              updated_at: new Date().toISOString(),
            }).eq('id', matchingFaction.id)
          );
        }
      }
    }

    // Resolve old events (older than 10 simulation cycles / stale)
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
