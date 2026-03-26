import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN-CREATE — Narrator-owned campaign genesis
//
// 1. Parse user description
// 2. Generate story spine + campaign brain via AI
// 3. Generate 100 unique NPCs in batches
// 4. Persist everything
// 5. Return campaign brain + opening narration
// ═══════════════════════════════════════════════════════════════

interface CampaignCreateRequest {
  campaignId: string;
  description: string;
  name: string;
  location: string;
  campaignLength: "short" | "medium" | "long";
  genre?: string;
  tone?: string;
  characterName: string;
  characterLevel: number;
  characterPowers?: string;
  characterPersonality?: string;
}

async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model = "google/gemini-2.5-flash",
  maxTokens = 8000
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI call failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJSON(raw: string): any {
  // Try to extract JSON from markdown code blocks or raw text
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim();
  return JSON.parse(jsonStr);
}

// ─── Story Spine System Prompt ─────────────────────────────────
const STORY_SPINE_PROMPT = `You are the Narrator — the single authoritative intelligence that creates, owns, and runs campaigns. You are building the COMPLETE campaign brain from a user's description.

Your job:
1. Parse what the user explicitly provided
2. Intelligently fill in everything missing to create a rich, coherent, playable campaign
3. Build the full story spine BEFORE play starts

RULES:
- Enrich thin prompts without contradicting player intent
- Respect strong user-provided details exactly
- Never generate generic empty campaigns
- The campaign must feel like it existed before the players arrived
- Create a story with real stakes, real tensions, real NPCs who have lives and agendas
- Every campaign must feel distinct from any other

You MUST respond with valid JSON matching this schema:
{
  "premise": "string — 2-3 sentence campaign premise",
  "genre": "string — primary genre (e.g. noir, frontier, survival horror, political intrigue, war, mystery)",
  "tone": "string — emotional tone (e.g. gritty, hopeful, tense, darkly humorous, melancholic)",
  "campaign_objective": "string — what players are ultimately trying to achieve",
  "core_storyline": "string — the full story arc summarized in 3-5 sentences",
  "victory_conditions": ["string array — 2-4 ways the campaign can end well"],
  "failure_conditions": ["string array — 2-3 ways things can go very wrong"],
  "major_arcs": [
    {"name": "string", "summary": "string", "order": 1}
  ],
  "current_arc": "string — name of the first arc",
  "active_story_beats": ["string array — 3-5 immediate story beats for act 1"],
  "unresolved_threads": ["string array — 2-4 threads that exist from the start"],
  "known_truths": ["string array — things the world openly knows"],
  "hidden_truths": ["string array — secrets the players don't know yet"],
  "future_pressures": ["string array — things that will escalate if ignored"],
  "remaining_narrative_runway": "string — where the story stands relative to its arc",
  "world_summary": "string — 2-3 sentence description of the world/setting state",
  "faction_state": [
    {"name": "string", "stance": "string", "goals": "string", "power_level": "string"}
  ],
  "current_location": "string",
  "current_pressure": "string — what's pressing right now",
  "opening_hook": "string — the opening narration (3-5 paragraphs, immersive, immediate)",
  "opening_time_block": "string — morning/afternoon/evening/night",
  "naming_culture": "string — what kind of names fit this setting (e.g. 'modern American', 'Latin-influenced frontier', 'Eastern European rural')"
}`;

// ─── NPC Generation System Prompt ──────────────────────────────
const NPC_GEN_PROMPT = `You are the Narrator generating NPCs for a campaign population pool. These NPCs exist in the world whether or not the player has met them yet.

NAMING RULES (CRITICAL):
- Generate realistic, grounded names appropriate to the setting/region/culture
- Avoid fantasy-sounding names unless the campaign explicitly calls for them
- Every NPC needs a distinct, memorable first name
- NO duplicate or near-duplicate names in the batch
- Provide both full_name and first_name separately
- Prefer names that are easy to read and remember

PERSONALITY TRAIT RULES:
- Include standard traits: aggressive, calm, strategic, loyal, curious, cowardly, prideful, manipulative, merciful, vengeful, impulsive, protective, territorial, honorable
- ALSO include these NEW traits where appropriate:
  - "outgoing" — more likely to initiate interactions, pull players into scenes, spread information
  - "chaotic" — less predictable, may destabilize situations, create complications or opportunities unexpectedly

DIVERSITY REQUIREMENTS:
- Mix of ages, genders, occupations, social classes
- Mix of helpful, hostile, neutral, and ambiguous NPCs
- Some outgoing, some reserved. Some chaotic, some orderly.
- Varied story relevance: some are key players, most are background/supporting
- NPCs should have distinct fears, goals, secrets — not generic placeholder text

You MUST respond with a valid JSON array of NPC objects:
[{
  "full_name": "string",
  "first_name": "string",
  "title_honorific": "string or null",
  "role": "string — their role in the community/world",
  "occupation": "string",
  "home_zone": "string — where they normally are",
  "current_zone": "string — where they are right now",
  "age_range": "string — e.g. 'young adult', 'middle-aged', 'elderly'",
  "gender_presentation": "string",
  "personality": "string — brief personality description",
  "personality_traits": ["string array of trait keywords"],
  "temperament": "string — e.g. 'steady', 'volatile', 'withdrawn', 'warm'",
  "faction_ties": ["string array"],
  "social_ties": ["string array — relationships to other NPCs by first name"],
  "goals": ["string array — 1-3 personal goals"],
  "fears": ["string array — 1-2 fears"],
  "secrets": ["string array — 0-2 secrets"],
  "trust_disposition": "number — -5 (hostile) to 5 (friendly) toward strangers",
  "relationship_summary": "string — initial stance toward players",
  "notable_hooks": ["string array — interesting things about them"],
  "status": "alive",
  "mobility": "string — sedentary/local/mobile/nomadic",
  "story_relevance_level": "string — key/supporting/background",
  "knows_key_facts": ["string array — what campaign secrets they know"],
  "likely_to_initiate": "boolean",
  "is_outgoing": "boolean",
  "is_chaotic": "boolean",
  "appearance": "string — brief physical description",
  "backstory": "string — 1-2 sentence backstory"
}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: CampaignCreateRequest = await req.json();
    const {
      campaignId,
      description,
      name,
      location,
      campaignLength,
      genre,
      tone,
      characterName,
      characterLevel,
      characterPowers,
      characterPersonality,
    } = body;

    if (!campaignId || !name) {
      return new Response(JSON.stringify({ error: "campaignId and name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Step 1: Generate Story Spine ────────────────────────────
    const spineUserPrompt = `Create a complete campaign brain for this campaign:

CAMPAIGN NAME: ${name}
DESCRIPTION: ${description || "(Player provided no description — you must create something compelling based on the name and location)"}
STARTING LOCATION: ${location}
CAMPAIGN LENGTH: ${campaignLength} (${campaignLength === "short" ? "2-10 in-world days, tight focused story" : campaignLength === "medium" ? "moderate arc with room for exploration and side threads" : "extended arc with travel, investigation, multiple conflicts, faction changes"})
${genre ? `GENRE PREFERENCE: ${genre}` : ""}
${tone ? `TONE PREFERENCE: ${tone}` : ""}

PLAYER CHARACTER:
- Name: ${characterName}
- Level/Tier: ${characterLevel}
${characterPowers ? `- Powers/Abilities: ${characterPowers}` : ""}
${characterPersonality ? `- Personality: ${characterPersonality}` : ""}

Generate a rich, coherent campaign brain. Fill in everything the player didn't specify. Make it feel like a real world with real stakes.`;

    console.log("[campaign-create] Generating story spine...");
    const spineRaw = await callAI(LOVABLE_API_KEY, STORY_SPINE_PROMPT, spineUserPrompt, "google/gemini-2.5-pro", 6000);
    let spine: any;
    try {
      spine = extractJSON(spineRaw);
    } catch (e) {
      console.error("[campaign-create] Failed to parse spine JSON:", spineRaw.substring(0, 500));
      throw new Error("Failed to parse campaign brain from AI");
    }

    console.log("[campaign-create] Story spine generated. Generating NPCs...");

    // ─── Step 2: Generate 100 NPCs in 4 batches of 25 ───────────
    const namingCulture = spine.naming_culture || "grounded, realistic";
    const allNpcs: any[] = [];
    const usedNames = new Set<string>();

    // Generate in parallel batches of 25
    const batchPromises = [1, 2, 3, 4].map(async (batchNum) => {
      const relevanceDistribution =
        batchNum === 1
          ? "5 key NPCs, 10 supporting NPCs, 10 background NPCs"
          : batchNum === 2
          ? "2 key NPCs, 8 supporting NPCs, 15 background NPCs"
          : "1 key NPC, 6 supporting NPCs, 18 background NPCs";

      const prevNames = allNpcs.map((n) => n.first_name).join(", ");
      const npcUserPrompt = `Generate exactly 25 unique NPCs for this campaign (batch ${batchNum} of 4).

CAMPAIGN: ${name}
PREMISE: ${spine.premise}
GENRE: ${spine.genre}
TONE: ${spine.tone}
WORLD: ${spine.world_summary}
LOCATION: ${location}
NAMING CULTURE: ${namingCulture}
FACTIONS: ${JSON.stringify(spine.faction_state || [])}

DISTRIBUTION FOR THIS BATCH: ${relevanceDistribution}

${prevNames ? `NAMES ALREADY USED (do NOT repeat): ${prevNames}` : ""}
${usedNames.size > 0 ? `ALSO AVOID: ${[...usedNames].join(", ")}` : ""}

Generate 25 diverse, grounded NPCs. Each must feel like a real person who lives in this world.`;

      const npcRaw = await callAI(LOVABLE_API_KEY, NPC_GEN_PROMPT, npcUserPrompt, "google/gemini-2.5-flash", 12000);
      try {
        const npcs = extractJSON(npcRaw);
        if (Array.isArray(npcs)) {
          for (const npc of npcs) {
            if (npc.first_name && !usedNames.has(npc.first_name.toLowerCase())) {
              usedNames.add(npc.first_name.toLowerCase());
              allNpcs.push(npc);
            }
          }
        }
      } catch (e) {
        console.error(`[campaign-create] Failed to parse NPC batch ${batchNum}:`, e);
      }
    });

    // Run batches 1+2 in parallel, then 3+4 (so later batches can avoid earlier names)
    await Promise.all([batchPromises[0], batchPromises[1]]);
    await Promise.all([batchPromises[2], batchPromises[3]]);

    console.log(`[campaign-create] Generated ${allNpcs.length} unique NPCs`);

    // ─── Step 3: Persist campaign brain ──────────────────────────
    const { error: brainError } = await supabase.from("campaign_brain").insert({
      campaign_id: campaignId,
      premise: spine.premise || "",
      genre: spine.genre || genre || null,
      tone: spine.tone || tone || null,
      campaign_objective: spine.campaign_objective || null,
      core_storyline: spine.core_storyline || null,
      victory_conditions: spine.victory_conditions || [],
      failure_conditions: spine.failure_conditions || [],
      major_arcs: spine.major_arcs || [],
      current_arc: spine.current_arc || null,
      active_story_beats: spine.active_story_beats || [],
      unresolved_threads: spine.unresolved_threads || [],
      known_truths: spine.known_truths || [],
      hidden_truths: spine.hidden_truths || [],
      future_pressures: spine.future_pressures || [],
      campaign_length_target: campaignLength,
      remaining_narrative_runway: spine.remaining_narrative_runway || null,
      current_day: 1,
      current_time_block: spine.opening_time_block || "morning",
      elapsed_hours: 0,
      world_summary: spine.world_summary || null,
      faction_state: spine.faction_state || [],
      npc_roster_summary: [],
      current_location: location,
      current_pressure: spine.current_pressure || null,
      player_impact_log: [],
      opening_hook: spine.opening_hook || null,
    });

    if (brainError) {
      console.error("[campaign-create] Brain insert error:", brainError);
      throw new Error(`Failed to save campaign brain: ${brainError.message}`);
    }

    // ─── Step 4: Persist NPCs ────────────────────────────────────
    if (allNpcs.length > 0) {
      const npcRows = allNpcs.map((npc) => ({
        campaign_id: campaignId,
        name: npc.full_name || npc.first_name || "Unknown",
        full_name: npc.full_name || null,
        first_name: npc.first_name || null,
        title_honorific: npc.title_honorific || null,
        role: npc.role || "civilian",
        occupation: npc.occupation || null,
        home_zone: npc.home_zone || location,
        current_zone: npc.current_zone || location,
        age_range: npc.age_range || null,
        gender_presentation: npc.gender_presentation || null,
        personality: npc.personality || null,
        personality_traits: npc.personality_traits || [],
        temperament: npc.temperament || null,
        faction_ties: npc.faction_ties || [],
        social_ties: npc.social_ties || [],
        goals: npc.goals || [],
        fears: npc.fears || [],
        secrets: npc.secrets || [],
        trust_disposition: typeof npc.trust_disposition === "number" ? npc.trust_disposition : 0,
        relationship_summary: npc.relationship_summary || null,
        notable_hooks: npc.notable_hooks || [],
        status: "alive",
        mobility: npc.mobility || "sedentary",
        story_relevance_level: npc.story_relevance_level || "background",
        knows_key_facts: npc.knows_key_facts || [],
        likely_to_initiate: npc.likely_to_initiate === true,
        is_outgoing: npc.is_outgoing === true,
        is_chaotic: npc.is_chaotic === true,
        appearance: npc.appearance || null,
        backstory: npc.backstory || null,
        first_met_day: 0,
        metadata: {},
      }));

      // Insert in chunks to avoid payload limits
      const CHUNK = 25;
      for (let i = 0; i < npcRows.length; i += CHUNK) {
        const chunk = npcRows.slice(i, i + CHUNK);
        const { error: npcError } = await supabase.from("campaign_npcs").insert(chunk);
        if (npcError) {
          console.error(`[campaign-create] NPC insert error (chunk ${i / CHUNK + 1}):`, npcError);
        }
      }
    }

    // ─── Step 5: Update campaign with brain-derived fields ───────
    await supabase
      .from("campaigns")
      .update({
        campaign_length: campaignLength,
        genre: spine.genre || genre || null,
        tone: spine.tone || tone || null,
        story_context: {
          ...(spine.faction_state ? { factions: spine.faction_state } : {}),
          campaignBrainGenerated: true,
          premise: spine.premise,
        },
      })
      .eq("id", campaignId);

    // ─── Step 6: Generate opening narration ──────────────────────
    let openingNarration = spine.opening_hook || "";
    if (!openingNarration) {
      openingNarration = `The campaign begins in ${location}. ${spine.premise || ""}`;
    }

    // Insert opening narration as first message
    await supabase.from("campaign_messages").insert({
      campaign_id: campaignId,
      sender_type: "narrator",
      content: openingNarration,
      channel: "in_universe",
    });

    // ─── Step 7: Create initial world_state row ──────────────────
    await supabase.from("world_state").insert({
      campaign_id: campaignId,
      region_name: location,
      active_events: spine.active_story_beats?.slice(0, 3) || [],
      environment_conditions: { time_block: spine.opening_time_block || "morning", weather: "clear" },
      danger_level: 1,
    });

    console.log("[campaign-create] Campaign creation complete");

    return new Response(
      JSON.stringify({
        success: true,
        npcCount: allNpcs.length,
        brain: {
          premise: spine.premise,
          genre: spine.genre,
          tone: spine.tone,
          campaign_objective: spine.campaign_objective,
          current_arc: spine.current_arc,
          opening_time_block: spine.opening_time_block || "morning",
        },
        openingNarration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[campaign-create] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Campaign creation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
