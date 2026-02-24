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

    const { character1Name, character2Name, battleType, character1Level, character2Level } = await req.json();

    // Determine average combatant level for survivability scaling
    const lvl1 = typeof character1Level === 'number' ? character1Level : 3;
    const lvl2 = typeof character2Level === 'number' ? character2Level : 3;
    const avgLevel = Math.round((lvl1 + lvl2) / 2);

    // Build survivability guidance based on average level
    let survivabilityGuidance: string;
    if (avgLevel <= 1) {
      survivabilityGuidance = `SURVIVABILITY LEVEL: VERY LOW (Tier 1 — Common Humans)
The fighters are ordinary humans with NO supernatural abilities. The emergency must be survivable by normal humans with skill and resourcefulness.
DO NOT generate: exploding suns, nuclear cores, deep space vacuum, planet-cracking events, dimensional rifts, or anything requiring superhuman durability.
GOOD examples: collapsing building, sinking ship, wildfire spreading, avalanche zone, flooding subway, crumbling bridge over a gorge.`;
    } else if (avgLevel <= 2) {
      survivabilityGuidance = `SURVIVABILITY LEVEL: LOW (Tier 2 — Enhanced Humans)
The fighters are peak humans (like Batman or Captain America). They can survive extreme but physically possible scenarios.
DO NOT generate: stellar explosions, black holes, dimensional tears, nuclear detonations at ground zero.
GOOD examples: crashing helicopter, collapsing skyscraper, speeding runaway train, military base self-destruct, sinking submarine at moderate depth.`;
    } else if (avgLevel <= 3) {
      survivabilityGuidance = `SURVIVABILITY LEVEL: MODERATE (Tier 3 — Super Humans)
The fighters have superhuman abilities. They can survive scenarios that would kill normal humans — extreme heat, pressure, toxins.
GOOD examples: submarine imploding at depth, volcanic eruption, inside a charging energy cannon, crashing space station entering atmosphere, nuclear plant meltdown.`;
    } else if (avgLevel <= 4) {
      survivabilityGuidance = `SURVIVABILITY LEVEL: HIGH (Tier 4 — Legends)
The fighters control mass and energy intrinsically. They can survive planet-scale threats.
GOOD examples: sun about to go supernova, inside a collapsing star, dimensional rift tearing reality, core of a dying planet, asteroid impact zone.`;
    } else {
      survivabilityGuidance = `SURVIVABILITY LEVEL: EXTREME (Tier 5+ — Reality Warpers)
The fighters can warp reality itself. Almost nothing is unsurvivable. Go ALL OUT with cosmic-scale threats.
GOOD examples: inside a black hole's event horizon, colliding dimensions, big bang singularity recreation, void between realities collapsing, multiverse tear.`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an emergency battle location generator for the Realm of Kings (R.O.K.) combat system.

Generate a HIGH-INTENSITY, TIME-SENSITIVE battle environment that requires immediate action. These are not calm arenas — they are CRISIS SCENARIOS.

CRITICAL — SCALE DANGER TO COMBATANT POWER LEVEL:
The fighters are Tier ${lvl1} and Tier ${lvl2} (average Tier ${avgLevel}).

${survivabilityGuidance}

The location MUST be something the fighters could realistically survive and fight in given their power level. A Tier 1 human should never be placed inside an exploding sun. A Tier 5 reality warper should never be challenged by a mere house fire.

REQUIREMENTS:
1. Location must be URGENT — there's a ticking clock or escalating danger
2. Environment must influence combat (environmental hazards, consequences for inaction)
3. Include a countdown or trigger mechanic (e.g., "30 turns before meltdown")
4. The location should force fighters to adapt their strategies
5. Be creative and cinematic — this should feel like an action movie climax
6. MATCH the intensity to the power tier of the combatants

OUTPUT FORMAT — Return a JSON object:
{
  "name": "Short location name (3-6 words)",
  "description": "2-3 sentence vivid description of the location and its crisis",
  "hazards": "Specific environmental hazards that affect combat (e.g., 'Radiation bursts every 3 turns deal damage to both fighters')",
  "urgency": "What happens if fighters don't act fast (the ticking clock)",
  "countdownTurns": <number 10-30>,
  "tags": ["tag1", "tag2", "tag3"]
}

Return ONLY valid JSON.`;

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
          { role: "user", content: `Generate an emergency battle location for a ${battleType || 'PvE'} fight${character1Name ? ` between ${character1Name} (Tier ${lvl1})` : ''}${character2Name ? ` and ${character2Name} (Tier ${lvl2})` : ''}. The location must be survivable for Tier ${avgLevel} fighters. Make it unique and intense. Return only valid JSON.` },
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
