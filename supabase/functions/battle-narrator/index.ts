import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { userCharacter, opponent, userAction, opponentResponse, battleLocation, turnNumber }: NarratorRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an EPIC BATTLE NARRATOR for cosmic combat encounters. Your job is to provide dramatic, cinematic commentary on the battle exchange that just occurred.

STYLE GUIDELINES:
- Write like a legendary sports commentator mixed with an anime narrator
- Use dramatic exclamations: "INCREDIBLE!", "WHAT A MOVE!", "UNBELIEVABLE!"
- Reference the environment and how it enhances the battle
- Build tension and hype for both combatants
- Keep commentary to 2-3 punchy sentences
- Use CAPS for emphasis on key moments
- Include sound effects like *BOOM*, *CRACK*, *WHOOSH*
- End with a teaser about what might come next

EXAMPLE OUTPUTS:
"*BOOM!* ${userCharacter.name} UNLEASHES a devastating strike! ${opponent.name} barely manages to respond—the ${battleLocation} TREMBLES under the force of their clash! Round ${turnNumber} is HEATING UP!"

"OH MY STARS! What we're witnessing here in the ${battleLocation} is LEGENDARY! ${opponent.name}'s counter was BRILLIANT but can they keep up with ${userCharacter.name}'s relentless assault?!"

Keep it SHORT, PUNCHY, and EXCITING!`;

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
