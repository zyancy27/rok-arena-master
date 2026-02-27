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
    // 70% grounded realistic, 20% advanced sci-fi, 8% extreme planetary, 2% mythic/cosmic
    const rarityRoll = Math.random();
    let rarityTier: string;
    let rarityInstruction: string;
    if (rarityRoll < 0.70) {
      rarityTier = "GROUNDED";
      rarityInstruction = `RARITY: GROUNDED REALISTIC EMERGENCY (70% chance — DOMINANT TIER)
Generate a HIGH-INTENSITY, CINEMATIC, REALISTIC emergency scenario. This is the most common tier and must work for ALL character levels.

You MUST assemble the emergency from these GROUNDED BUILDING BLOCKS — pick one or two from each category and combine them into a unique crisis:

CIVILIAN DENSITY MODIFIER (pick one):
- Rush hour traffic gridlock
- Packed subway station
- Airport terminal mid-evacuation
- Stadium crowd panic
- Downtown pedestrian crush
- School dismissal zone
- Industrial workforce shift change
- Hospital at full capacity
- Shopping mall during holiday rush

STRUCTURAL INSTABILITY TRIGGER (pick one):
- Building about to collapse
- Suspension bridge cables snapping
- Skyscraper windows shattering outward
- Parking garage cave-in
- Oil rig structural failure
- Dam cracking under pressure
- Power plant overload cascade
- Construction crane falling
- Highway overpass buckling
- Subway tunnel ceiling crumbling

NATURAL DISASTER LAYER (pick one):
- Earthquake tremors intensifying
- Tsunami wave incoming
- Flash flood surging through streets
- Tornado touching down
- Hurricane landfall with debris
- Volcano erupting nearby
- Wildfire spreading rapidly
- Avalanche cascading downhill
- Landslide burying infrastructure
- Sinkhole opening

MECHANICAL / INFRASTRUCTURE CRISIS (pick one):
- Train derailment mid-city
- Plane losing altitude over populated area
- Ship capsizing in harbor
- Nuclear reactor approaching meltdown
- Chemical plant explosion imminent
- Highway tanker spill with ignition risk
- Power grid cascading failure / citywide blackout
- Elevator freefall in skyscraper
- Gas main rupture chain
- Water treatment plant toxic leak

TIME PRESSURE MECHANIC (pick one):
- 30-second structural collapse window
- Countdown to detonation
- Aftershock timer before next quake
- Cable snapping sequence (one by one)
- Reactor temperature climbing past safe limits
- Structural integrity percentage visibly dropping
- Floodwater rising toward electrical systems
- Fire spreading room by room

COMBINE these blocks into one cohesive, cinematic crisis. The result must feel like a disaster movie scene — intense, grounded, plausible.
Even for high-level characters, grounded emergencies create tactical and moral tension (civilians, infrastructure, collateral damage).
DO NOT generate: off-planet scenarios, cosmic events, dimensional rifts, mythic phenomena, or abstract sci-fi.
If a non-Earth planet is selected, ADAPT grounded logic to that planet's infrastructure (e.g., desert mining collapse, alien city bridge failure, terraforming station meltdown).`;
    } else if (rarityRoll < 0.90) {
      rarityTier = "ADVANCED";
      rarityInstruction = `RARITY: ADVANCED SCI-FI INDUSTRIAL (20% chance)
Generate a plausible sci-fi emergency: space station failures, reactor overloads, warp drive malfunctions, orbital decay, terraforming gone wrong, AI facility lockdown, orbital elevator collapse, antimatter containment breach.
Keep it grounded in sci-fi logic — no pure fantasy or cosmic horror. It should feel technologically plausible.`;
    } else if (rarityRoll < 0.98) {
      rarityTier = "EXTREME";
      rarityInstruction = `RARITY: EXTREME PLANETARY SCALE (8% chance)
Generate a planet-scale emergency: supervolcano chain eruption, global tectonic shift, planetary core destabilization, continent-splitting earthquake, planet-wide electromagnetic storm, ocean boiling event.
Massive scale but still physically grounded — no magic or cosmic entities.`;
    } else {
      rarityTier = "MYTHIC";
      rarityInstruction = `RARITY: MYTHIC / COSMIC (2% chance — EXTREMELY RARE)
This is a legendary-tier scenario. Go all out: collapsing stars, dimensional tears, ancient sealed entities awakening, reality fractures, black hole proximity event.
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

    // === URGENCY TIER ===
    // 30% immediate (2 turns), 50% soon (3-6 turns), 20% later (7-12 turns)
    const urgencyRoll = Math.random();
    let urgencyTier: string;
    let urgencyCountdown: number;
    let urgencyInstruction: string;
    if (urgencyRoll < 0.30) {
      urgencyTier = "immediate";
      urgencyCountdown = 2;
      urgencyInstruction = `URGENCY TIER: IMMEDIATE (2 turns before disaster strikes)
The crisis is ALREADY happening. Players have only 2 turns before catastrophic failure.
The environment should feel like it's actively collapsing/exploding/flooding RIGHT NOW.
Every second counts — no setup time, no warning phase. Pure reaction mode.
Examples: building mid-collapse, reactor seconds from meltdown, floodwater already chest-high, fissure splitting the ground beneath them.`;
    } else if (urgencyRoll < 0.80) {
      urgencyTier = "soon";
      urgencyCountdown = 3 + Math.floor(Math.random() * 4); // 3-6 turns
      urgencyInstruction = `URGENCY TIER: SOON (${urgencyCountdown} turns before disaster strikes)
The crisis is building rapidly. Players have ${urgencyCountdown} turns to act before the worst hits.
There are clear warning signs escalating — cracks spreading, alarms blaring, pressure rising.
Players have a narrow window to strategize but must act decisively.
Examples: dam cracking with water seeping through, reactor temp climbing, tremors intensifying, structure groaning under stress.`;
    } else {
      urgencyTier = "later";
      urgencyCountdown = 7 + Math.floor(Math.random() * 6); // 7-12 turns
      urgencyInstruction = `URGENCY TIER: LATER (${urgencyCountdown} turns before disaster strikes)
The crisis is approaching but not yet critical. Players have ${urgencyCountdown} turns.
The threat is visible on the horizon — smoke in the distance, early tremors, distant sirens, readings going abnormal.
Players can plan and position, but the clock IS ticking and conditions will worsen each turn.
Examples: storm approaching, lava flow advancing, structural fatigue accumulating, containment slowly failing.`;
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

URGENCY TIER:
${urgencyInstruction}

MODULAR CONSTRUCTION — Build the emergency from these components:
1. BASE LOCATION TYPE: facility, vehicle, structure, terrain zone, natural formation, urban center, industrial complex
2. IMMEDIATE THREAT TRIGGER: countdown, collapse, overload, breach, eruption, derailment, rupture, meltdown
3. ENVIRONMENTAL HAZARD LAYER: fire, radiation, flooding, vacuum, debris, toxins, ice, smoke, shrapnel, electrical arcing
4. TIME PRESSURE MECHANIC: what happens if fighters don't act fast — structural integrity dropping, floodwater rising, fire spreading, countdown ticking
5. MOVEMENT CONSTRAINT: how terrain limits or changes movement — rubble blocking paths, flooded corridors, crumbling floors, falling debris zones, crowd obstruction
6. CIVILIAN/COLLATERAL FACTOR: civilian presence, infrastructure at risk, collateral damage potential, moral tension
7. OPTIONAL DYNAMIC FACTOR: aftershock, power failure, terrain shifting, secondary explosion, gas ignition, cascade failure

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
  "countdownTurns": ${urgencyCountdown},
  "urgencyTier": "${urgencyTier}",
  "tags": ["tag1", "tag2", "tag3"],
  "rarityTier": "${rarityTier.toLowerCase()}"
}
IMPORTANT: "countdownTurns" MUST be exactly ${urgencyCountdown}. "urgencyTier" MUST be exactly "${urgencyTier}". Do NOT change these values.`;

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
