import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const {
      npcName,
      npcRole,
      npcPersonality,
      npcAppearance,
      npcBackstory,
      characterName,
      characterLevel,
      characterPersonality,
      playerMessage,
      conversationHistory,
      campaignContext,
      currentZone,
      timeOfDay,
      disposition,
      trustLevel,
    } = body;

    if (!npcName || !playerMessage || !characterName) {
      return new Response(
        JSON.stringify({
          error: "npcName, characterName, and playerMessage are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trustLabel =
      trustLevel >= 8
        ? "deeply trusted ally"
        : trustLevel >= 5
        ? "trusted acquaintance"
        : trustLevel >= 2
        ? "cautious but willing to talk"
        : trustLevel >= 0
        ? "neutral stranger"
        : "distrustful or hostile";

    const systemPrompt = `You are ${npcName}, an NPC in a campaign world. You speak in-character at all times. You are NOT an AI assistant — you are a living person in this world.

CHARACTER PROFILE:
- Name: ${npcName}
- Role: ${npcRole || "civilian"}
- Personality: ${npcPersonality || "neutral and reserved"}
- Appearance: ${npcAppearance || "unremarkable"}
- Backstory: ${npcBackstory || "unknown"}
- Current disposition toward ${characterName}: ${disposition || "neutral"} (${trustLabel}, trust level ${trustLevel ?? 0}/10)

SCENE CONTEXT:
- Location: ${currentZone || "unknown area"}
- Time: ${timeOfDay || "day"}
- Campaign context: ${campaignContext || "an ongoing adventure"}

SPEAKING TO: ${characterName} (Tier ${characterLevel || 1})${characterPersonality ? `, personality: ${characterPersonality}` : ""}

RULES:
1. Stay in character. Speak as ${npcName} would — use their voice, mannerisms, and knowledge level.
2. React based on trust level. Low trust = evasive, short, suspicious. High trust = open, helpful, warm.
3. You know ONLY what ${npcName} would know. Don't reveal information they wouldn't have.
4. Keep responses 2-4 sentences normally. Up to 6 for important reveals or emotional moments.
5. If asked about things outside your knowledge, deflect naturally ("I wouldn't know about that" / "That's above my pay grade").
6. React to the player's tone. Rudeness lowers your willingness to help. Respect earns more.
7. You may offer quests, hints, rumors, trade offers, or warnings if it fits your role and trust level.
8. NEVER break character. NEVER mention game mechanics, dice, or stats.
9. Use simple, natural dialogue. No flowery prose. Speak like a real person in a fantasy/sci-fi world.`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.sender === "player" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: playerMessage });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 400,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errText = await response.text();
      throw new Error(`AI gateway error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const dialogue = data.choices?.[0]?.message?.content || "";

    // Determine if trust should shift based on the interaction
    let trustDelta = 0;
    const lower = playerMessage.toLowerCase();
    if (
      lower.includes("thank") ||
      lower.includes("please") ||
      lower.includes("help")
    ) {
      trustDelta = 1;
    } else if (
      lower.includes("threaten") ||
      lower.includes("attack") ||
      lower.includes("shut up")
    ) {
      trustDelta = -2;
    }

    return new Response(
      JSON.stringify({
        dialogue,
        trustDelta,
        npcName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("NPC dialogue error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate NPC dialogue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
