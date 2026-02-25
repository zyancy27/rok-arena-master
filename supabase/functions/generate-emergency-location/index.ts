import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      character1Name,
      character2Name,
      battleType,
      character1Level,
      character2Level,
      planetName,
      planetDescription,
      planetGravity,
      previousLocations,
    } = await req.json();

    const lvl1 = typeof character1Level === 'number' ? character1Level : 3;
    const lvl2 = typeof character2Level === 'number' ? character2Level : 3;
    const avgLevel = Math.round((lvl1 + lvl2) / 2);

    // === RARITY DISTRIBUTION ===
    // 75% grounded/planet-based, 20% advanced sci-fi, 5% mythic/cosmic
    const rarityRoll = Math.random();
    let rarityTier: string;
    let rarityInstruction: string;
    if (rarityRoll < 0.75) {
      rarityTier = "GROUNDED";
      rarityInstruction = `RARITY: GROUNDED (75% chance)
Generate a realistic, planet-based emergency scenario. Think real-world disasters adapted to the setting: collapsing structures, natural disasters, industrial accidents, vehicle crashes, military facility meltdowns, cave-ins, floods, fires, chemical spills.
DO NOT generate: off-planet scenarios, cosmic events, dimensional rifts, mythic phenomena.
Keep it visceral, immediate, and believable.`;
    } else if (rarityRoll < 0.95) {
      rarityTier = "ADVANCED";
      rarityInstruction = `RARITY: ADVANCED SCI-FI (20% chance)
Generate a plausible sci-fi emergency: space station failures, reactor overloads, warp drive malfunctions, orbital decay, terraforming gone wrong, AI facility lockdown.
Keep it grounded in sci-fi logic — no pure fantasy or cosmic horror. It should feel technologically plausible.`;
    } else {
      rarityTier = "MYTHIC";
      rarityInstruction = `RARITY: MYTHIC / COSMIC (5% chance — EXTREMELY RARE)
This is a legendary-tier scenario. Go all out: collapsing stars, dimensional tears, ancient sealed entities awakening, reality fractures.
This should feel momentous and awe-inspiring — once-in-a-lifetime crisis.`;
    }

    // === PLANET-LINKED CONSTRAINT ===
    let planetConstraint = "";
    if (planetName) {
      planetConstraint = `\n\nPLANET CONSTRAINT — MANDATORY:
This emergency MUST take place on the planet "${planetName}".
${planetDescription ? `Planet description: ${planetDescription}` : ""}
${planetGravity ? `Planet gravity: ${planetGravity}g` : ""}
All hazards, terrain, structures, and environmental details must be consistent with this planet's conditions.
DO NOT generate off-planet or space-based emergencies. The crisis happens ON this world.
Reflect the planet's climate, terrain, tech level, and atmosphere in the emergency.`;
    }

    // === DEDUPLICATION ===
    let dedupConstraint = "";
    if (previousLocations && Array.isArray(previousLocations) && previousLocations.length > 0) {
      dedupConstraint = `\n\nDEDUPLICATION — CRITICAL:
The following emergencies have ALREADY been generated this session. You MUST NOT reuse the same base location type + threat combination.
Generate something DRASTICALLY different in setting, threat type, and mood.
Previous locations:
${previousLocations.map((loc: string, i: number) => `${i + 1}. ${loc}`).join("\n")}`;
    }

    // === SURVIVABILITY SCALING ===
    let survivabilityGuidance: string;
    if (avgLevel <= 1) {
      survivabilityGuidance = `SURVIVABILITY: VERY LOW (Tier 1 — Common Humans)
Ordinary humans with NO supernatural abilities. Emergency must be survivable by normal humans.
GOOD: collapsing building, sinking ship, wildfire, avalanche, flooding subway, crumbling bridge.`;
    } else if (avgLevel <= 2) {
      survivabilityGuidance = `SURVIVABILITY: LOW (Tier 2 — Enhanced Humans)
Peak humans. Can survive extreme but physically possible scenarios.
GOOD: crashing helicopter, collapsing skyscraper, runaway train, military base self-destruct, sinking submarine.`;
    } else if (avgLevel <= 3) {
      survivabilityGuidance = `SURVIVABILITY: MODERATE (Tier 3 — Super Humans)
Superhuman abilities. Can survive extreme heat, pressure, toxins.
GOOD: submarine imploding, volcanic eruption, energy cannon overload, crashing space station, nuclear plant meltdown.`;
    } else if (avgLevel <= 4) {
      survivabilityGuidance = `SURVIVABILITY: HIGH (Tier 4 — Legends)
Control mass and energy. Can survive planet-scale threats.
GOOD: sun going supernova, collapsing star core, dimensional rift, dying planet core, asteroid impact zone.`;
    } else {
      survivabilityGuidance = `SURVIVABILITY: EXTREME (Tier 5+ — Reality Warpers)
Can warp reality. Almost nothing is unsurvivable.
GOOD: black hole event horizon, colliding dimensions, big bang recreation, void between realities, multiverse tear.`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an emergency battle location generator for the Realm of Kings (R.O.K.) combat system.

Generate a HIGH-INTENSITY, TIME-SENSITIVE battle environment. These are CRISIS SCENARIOS that force adaptation.

${rarityInstruction}

POWER SCALING:
Fighters are Tier ${lvl1} and Tier ${lvl2} (average Tier ${avgLevel}).
${survivabilityGuidance}
${planetConstraint}
${dedupConstraint}

MODULAR CONSTRUCTION — Build the emergency from these components:
1. BASE LOCATION TYPE: facility, vehicle, structure, terrain zone, natural formation
2. IMMEDIATE THREAT TRIGGER: countdown, collapse, overload, breach, eruption
3. ENVIRONMENTAL HAZARD LAYER: fire, radiation, flooding, vacuum, debris, toxins, ice
4. TIME PRESSURE MECHANIC: what happens if fighters don't act fast
5. MOVEMENT CONSTRAINT: how terrain limits or changes movement options
6. OPTIONAL DYNAMIC FACTOR: aftershock, power failure, terrain shifting, secondary explosion

Each emergency must:
- Influence movement options
- Affect skill usage and strategy
- Create adaptive combat decisions
- Feel situational, unique, and purpose-built
- Be concise — no text walls

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "name": "Short location name (3-6 words)",
  "description": "2-3 sentence vivid description",
  "hazards": "Specific environmental hazards affecting combat",
  "urgency": "The ticking clock consequence",
  "countdownTurns": <number 10-30>,
  "tags": ["tag1", "tag2", "tag3"],
  "rarityTier": "${rarityTier.toLowerCase()}"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate an emergency battle location for a ${battleType || 'PvE'} fight${character1Name ? ` between ${character1Name} (Tier ${lvl1})` : ''}${character2Name ? ` and ${character2Name} (Tier ${lvl2})` : ''}. Rarity tier: ${rarityTier}. Make it unique and intense. Return only valid JSON.` },
        ],
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";

    let locationResult;
    try {
      let jsonStr = aiResponse;
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      locationResult = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", aiResponse);
      return new Response(
        JSON.stringify({ error: "Failed to generate location" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(locationResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate emergency location error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while generating the location" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
