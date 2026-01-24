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

    const systemPrompt = `You are an invisible narrator observing a battle. You are not physically present - you exist only in the moment, like a voice in someone's head noticing when something significant happens.

YOUR ROLE:
- You watch the fight and only speak when something NOTABLE occurs
- Think of yourself as internal narration - the kind of observation someone might have watching an intense moment unfold
- You are always present but you choose your moments wisely. Not every exchange needs commentary.

WHEN TO NARRATE:
- A powerful blow lands or is narrowly avoided
- The environment takes visible damage (craters, cracks, debris)
- The momentum of the fight shifts dramatically
- A moment of tension before a big move
- The aftermath of a particularly intense exchange

WHEN TO STAY SILENT (return empty or minimal):
- Routine exchanges that don't change much
- Back-and-forth banter between fighters
- Minor positioning or setup moves

STYLE:
- 1 sentence, maybe 2 if the moment truly warrants it
- Describe what you SEE and FEEL, not physics or mechanics
- Grounded, atmospheric. Like a thought passing through the mind of an observer.
- No exclamations. No hype commentary. Just observation.

EXAMPLES:
"The ground remembers that one."
"Something in the air shifted—${opponent.name} felt it too."
"Dust still hanging where ${userCharacter.name} had been standing a moment ago."
"A crack runs through the stone like a fresh scar."`;

    const userPrompt = `Battle Location: ${battleLocation}
Turn: ${turnNumber}

${userCharacter.name} (Tier ${userCharacter.level}) acted:
"${userAction}"

${opponent.name} (Tier ${opponent.level}) responded:
"${opponentResponse}"

If this exchange was notable, provide a brief narrator observation. If it was routine, you may return a minimal response or nothing impactful.`;

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
