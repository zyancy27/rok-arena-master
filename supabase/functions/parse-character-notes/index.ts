import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation constants
const MAX_NOTES_LENGTH = 50000; // 50KB max for notes input

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { notes } = body;
    
    // Input validation
    if (!notes || typeof notes !== 'string') {
      return new Response(
        JSON.stringify({ error: "Character notes are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Notes exceed maximum length of ${MAX_NOTES_LENGTH} characters` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (notes.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Character notes cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a character sheet parser for a fictional roleplay game. Your job is to extract character information from user notes and fill out a character sheet.

The character sheet has the following fields:
- name: The character's name
- race: The species/race of the character
- sub_race: A sub-category or variant of the race (if mentioned)
- age: The character's age as a number
- home_planet: Where the character is from
- powers: Their main supernatural/special power (should be ONE core power)
- abilities: Specific techniques or skills derived from their power
- personality: How they act, behave, interact with others
- mentality: Their mindset, beliefs, motivations, psychological traits
- lore: Their backstory, history, and origins
- level: Power tier from 1-10 (1=human level, 10=cosmic/omnipotent level)

IMPORTANT:
- Only include fields that are clearly mentioned or strongly implied in the notes
- Keep powers focused on ONE main power as per game rules
- Combine related information into cohesive paragraphs
- If multiple characters are mentioned, focus on the MAIN character being described
- For power level, estimate based on described abilities (1-3 normal, 4-6 superhuman, 7-9 godlike, 10 omnipotent)`;

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
          { role: "user", content: `Parse these character notes and extract the character information:\n\n${notes}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_character_sheet",
              description: "Fill out the character sheet with extracted information",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Character's name" },
                  race: { type: "string", description: "Character's species/race" },
                  sub_race: { type: "string", description: "Sub-race or variant" },
                  age: { type: "string", description: "Character's age" },
                  home_planet: { type: "string", description: "Home world/planet" },
                  powers: { type: "string", description: "Main supernatural power" },
                  abilities: { type: "string", description: "Specific techniques and abilities" },
                  personality: { type: "string", description: "Personality traits and behavior" },
                  mentality: { type: "string", description: "Mindset and psychological traits" },
                  lore: { type: "string", description: "Backstory and history" },
                  level: { type: "number", description: "Power tier 1-10" },
                },
                required: ["name"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_character_sheet" } },
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
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "fill_character_sheet") {
      throw new Error("Failed to parse character notes");
    }

    const characterData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: characterData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse character notes error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
