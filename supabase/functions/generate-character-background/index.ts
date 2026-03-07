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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Optional hints the user can provide
    const { name, race, theme, powerTier, previousNames } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const hintLines: string[] = [];
    if (name) hintLines.push(`Character name: ${name}`);
    if (race) hintLines.push(`Race/species: ${race}`);
    if (theme) hintLines.push(`Theme/vibe the user wants: ${theme}`);
    if (powerTier) hintLines.push(`Power tier (1-10): ${powerTier}`);

    let dedupBlock = "";
    if (previousNames && Array.isArray(previousNames) && previousNames.length > 0) {
      dedupBlock = `\n\nDEDUPLICATION — CRITICAL:
The following characters have ALREADY been generated. You MUST NOT reuse similar names, races, planets, powers, or backstory themes.
Generate something DRASTICALLY different in species, aesthetic, personality, and origin.
Previously generated: ${previousNames.join(", ")}`;
    }

    const hintsBlock = hintLines.length > 0
      ? `The user provided these optional hints:\n${hintLines.join("\n")}\n\nUse these as starting points but feel free to expand creatively.`
      : "The user has no ideas at all. Generate a completely original and interesting character from scratch.";

    const systemPrompt = `You are a creative character designer for R.O.K. (Realm of Kings), a sci-fi/fantasy roleplay game set across galaxies, alien civilizations, and cosmic powers.

Your job is to generate a complete, compelling, and original character background from scratch (or from minimal hints).

Design a character that feels unique, has depth, and would be fun to roleplay. Avoid generic tropes — aim for characters with interesting contradictions, memorable details, and narrative hooks.

Guidelines:
- Name: Something distinctive that fits the character's culture/species
- Race: An alien species or fantastical race (be creative — not just "elf" or "human")
- Home planet: A named world with personality (e.g. "Vetha-9, a storm-wracked mining colony")
- Powers: ONE core supernatural power (not a grab-bag of abilities)
- Abilities: 2-4 specific techniques derived from or complementing their power
- Weapons/items: 1-3 signature weapons or notable possessions with descriptions
- Personality: Distinct behavioral traits, quirks, how they interact with others
- Mentality: Their worldview, beliefs, motivations, fears
- Lore: A 2-4 paragraph backstory with at least one defining event, a conflict, and a goal
- Level: Power tier 1-10 (1=human, 4-6=superhuman, 7-9=godlike, 10=omnipotent). Default to 3-5 range unless specified.

${hintsBlock}`;

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
          { role: "user", content: "Generate a complete original character for me." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_character",
              description: "Generate a complete character profile",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Character's name" },
                  race: { type: "string", description: "Species/race" },
                  sub_race: { type: "string", description: "Sub-race or variant if applicable" },
                  age: { type: "string", description: "Character's age" },
                  home_planet: { type: "string", description: "Home world name and brief descriptor" },
                  home_moon: { type: "string", description: "Home moon if relevant" },
                  powers: { type: "string", description: "ONE core supernatural power" },
                  abilities: { type: "string", description: "Specific techniques and skills" },
                  weapons_items: { type: "string", description: "JSON array of {name, description} objects" },
                  personality: { type: "string", description: "Personality traits and behavior" },
                  mentality: { type: "string", description: "Mindset, beliefs, motivations" },
                  lore: { type: "string", description: "Backstory — 2-4 paragraphs" },
                  level: { type: "number", description: "Power tier 1-10" },
                },
                required: ["name", "race", "powers", "abilities", "personality", "mentality", "lore", "level"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_character" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_character") {
      throw new Error("Failed to generate character");
    }

    const character = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ success: true, data: character }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate character background error:", error);
    return new Response(JSON.stringify({ error: "An error occurred while generating the character" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
