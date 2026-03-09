import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation constants
const MAX_NAME_LENGTH = 100;
const MAX_POWERS_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 500;
const MAX_TURN_COUNT = 20;
const MIN_TURN_COUNT = 1;

interface Character {
  name: string;
  level: number;
  powers: string | null;
  abilities: string | null;
  personality?: string | null;
  mentality?: string | null;
  stat_speed?: number | null;
  stat_strength?: number | null;
  stat_skill?: number | null;
}

interface SimulationRequest {
  character1: Character;
  character2: Character;
  battleLocation?: string;
  turnCount?: number;
  character1AINotes?: string;
  character2AINotes?: string;
}

function validateCharacter(char: Character | undefined, fieldName: string): string | null {
  if (!char || typeof char !== 'object') {
    return `${fieldName} is required and must be an object`;
  }
  if (!char.name || typeof char.name !== 'string' || char.name.length > MAX_NAME_LENGTH) {
    return `${fieldName}.name is required and must be under ${MAX_NAME_LENGTH} characters`;
  }
  if (typeof char.level !== 'number' || char.level < 1 || char.level > 10) {
    return `${fieldName}.level must be a number between 1 and 10`;
  }
  if (char.powers && (typeof char.powers !== 'string' || char.powers.length > MAX_POWERS_LENGTH)) {
    return `${fieldName}.powers must be under ${MAX_POWERS_LENGTH} characters`;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    // --- AI Subscription Check ---
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
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
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let requestData: SimulationRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { character1, character2, battleLocation, turnCount = 10, character1AINotes, character2AINotes } = requestData;

    // Validate characters
    const char1Error = validateCharacter(character1, 'character1');
    if (char1Error) {
      return new Response(
        JSON.stringify({ error: char1Error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const char2Error = validateCharacter(character2, 'character2');
    if (char2Error) {
      return new Response(
        JSON.stringify({ error: char2Error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate turn count
    if (typeof turnCount !== 'number' || turnCount < MIN_TURN_COUNT || turnCount > MAX_TURN_COUNT) {
      return new Response(
        JSON.stringify({ error: `turnCount must be between ${MIN_TURN_COUNT} and ${MAX_TURN_COUNT}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate battle location
    if (battleLocation && (typeof battleLocation !== 'string' || battleLocation.length > MAX_LOCATION_LENGTH)) {
      return new Response(
        JSON.stringify({ error: `battleLocation must be under ${MAX_LOCATION_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build character profiles with truncation
    const buildProfile = (char: Character) => {
      let profile = `Name: ${char.name} (Tier ${char.level})`;
      if (char.powers) profile += `\nPowers: ${char.powers.slice(0, MAX_POWERS_LENGTH)}`;
      if (char.abilities) profile += `\nAbilities: ${(char.abilities || '').slice(0, MAX_POWERS_LENGTH)}`;
      if (char.personality) profile += `\nPersonality: ${(char.personality || '').slice(0, 500)}`;
      if (char.mentality) profile += `\nMentality: ${(char.mentality || '').slice(0, 500)}`;
      return profile;
    };

    const systemPrompt = `You are a battle simulation engine for the Realm of Kings (R.O.K.) combat system.

Generate an exciting ${turnCount}-turn battle simulation between two characters. Each turn consists of one character attacking and the other responding with defense + counter.

CHARACTER 1:
${buildProfile(character1)}

CHARACTER 2:
${buildProfile(character2)}

${battleLocation ? `BATTLE LOCATION: ${battleLocation}\nIncorporate environmental elements naturally.` : ''}
${character1AINotes ? `\nCHARACTER 1 CREATOR NOTES (MUST OBEY):${character1AINotes.slice(0, 1000)}` : ''}
${character2AINotes ? `\nCHARACTER 2 CREATOR NOTES (MUST OBEY):${character2AINotes.slice(0, 1000)}` : ''}

SIMULATION RULES:
1. Alternate turns - Character 1 attacks first, then Character 2 responds with defense + counter, then Character 1 responds, etc.
2. Each response must include:
   - Brief defensive reaction (if applicable)
   - A counter-attack or strategic move
3. Write in roleplay format using *asterisks* for actions and "quotes" for dialogue
4. Keep each turn 2-3 sentences MAX - punchy and dynamic
5. Use simple, plain language a middle schooler can follow. No fancy words, no poetry, no dramatic flair.
6. Say "punches" not "delivers a devastating blow." Say "dodges" not "narrowly evades with fluid grace."
7. Show character personality through HOW they fight
8. Tier differences should affect the battle realistically
9. Don't narrate outcomes - let actions speak
10. No physics explanations - just raw action
11. Environment reacts naturally (dust, cracks, energy) without separate narration
12. Battle should feel like a natural exchange, not predetermined

OUTPUT FORMAT - Return a JSON object with this exact structure:
{
  "turns": [
    {
      "turnNumber": 1,
      "attacker": "Character1Name",
      "action": "The attack/action description"
    },
    {
      "turnNumber": 2,
      "attacker": "Character2Name",
      "action": "Defense + counter-attack description"
    }
    // Continue for ${turnCount * 2} total turns (${turnCount} per character)
  ],
  "summary": "Brief 1-2 sentence battle summary - who had the upper hand, key moments"
}

Generate exactly ${turnCount} actions per character (${turnCount * 2} total turns), alternating between them. Return ONLY valid JSON.`;

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
          { role: "user", content: `Generate the ${turnCount}-turn battle simulation between ${character1.name} and ${character2.name}. Remember: ${turnCount} attacks each, ${turnCount * 2} total turns. Return only valid JSON.` }
        ],
        max_tokens: 3000,
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

    // Parse the JSON response
    let simulationResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = aiResponse;
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      simulationResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate simulation",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(simulationResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Battle simulation error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
