import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NarratorRequest {
  userCharacter: {
    name: string;
    level: number;
  };
  opponent: {
    name: string;
    level: number;
  };
  userAction: string;
  opponentResponse: string;
  battleLocation: string;
  turnNumber: number;
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
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userCharacter, opponent, userAction, opponentResponse, battleLocation, turnNumber }: NarratorRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a battle narrator providing atmospheric commentary on combat encounters. Your job is to set the scene and describe the world around the fighters.

STYLE GUIDELINES:
- Focus on the ENVIRONMENT reacting to the battle: dust clouds, shockwaves rippling through the air, cracks spreading across the ground
- Paint the atmosphere: the tension in the air, distant rumbles, shifting light
- Keep it grounded and immersive - describe what an observer would see and feel
- 1-2 sentences max. Less is more.
- No physics explanations. No play-by-play of moves. The fighters handle their own actions.
- Occasional dramatic flair is fine, but don't overdo exclamations or ALL CAPS
- Sound effects sparingly: a single *crack* or *rumble* can punctuate the moment

EXAMPLE OUTPUTS:
"The ground beneath them splinters as the shockwave rolls outward, dust spiraling into the ${battleLocation}'s darkening sky."

"For a heartbeat, silence—then the air itself seems to shudder from the force of their clash."

"Debris scatters across the battlefield as ${opponent.name} is driven back, the ${battleLocation} bearing fresh scars from this exchange."

You describe the WORLD. Let the fighters speak for themselves.`;

    const userPrompt = `Battle Location: ${battleLocation}
Turn: ${turnNumber}

${userCharacter.name} (Tier ${userCharacter.level}) just did:
"${userAction}"

${opponent.name} (Tier ${opponent.level}) responded with:
"${opponentResponse}"

Provide epic narrator commentary for this exchange!`;

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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
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
    const narration = data.choices?.[0]?.message?.content || "The battle rages on...";

    return new Response(
      JSON.stringify({ narration }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Battle narrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
