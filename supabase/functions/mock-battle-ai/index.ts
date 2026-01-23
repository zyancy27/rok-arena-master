import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BattleRequest {
  userCharacter: {
    name: string;
    level: number;
    powers: string | null;
    abilities: string | null;
  };
  opponent: {
    id: string;
    name: string;
    level: number;
    personality: string;
    powers: string;
  };
  userMessage: string;
  channel: 'in_universe' | 'out_of_universe';
  messageHistory: Array<{
    role: 'user' | 'ai';
    content: string;
    channel: string;
  }>;
  battleLocation?: string;
  dynamicEnvironment?: boolean;
  environmentEffects?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userCharacter, opponent, userMessage, channel, messageHistory, battleLocation, dynamicEnvironment, environmentEffects }: BattleRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build location context with optional dynamic environment effects
    let locationContext = battleLocation ? `\n\nBATTLE LOCATION: ${battleLocation}` : '';
    
    if (dynamicEnvironment && environmentEffects) {
      locationContext += environmentEffects;
    } else if (battleLocation) {
      locationContext += `\nIncorporate this environment into your actions and descriptions. Use the terrain, elements, and atmosphere of this location in your combat responses.`;
    }

    const systemPrompt = channel === 'in_universe'
      ? `You are roleplaying as ${opponent.name}, a ${opponent.personality}

Your character details:
- Name: ${opponent.name}
- Power Tier: ${opponent.level}
- Powers: ${opponent.powers}

You are in a practice battle against ${userCharacter.name} (Tier ${userCharacter.level}).
Their powers: ${userCharacter.powers || 'Unknown'}
Their abilities: ${userCharacter.abilities || 'Unknown'}${locationContext}

RULES FOR ROLEPLAY:
1. Stay in character as ${opponent.name}
2. React appropriately to the opponent's actions
3. Use *asterisks* for action descriptions
4. Use "quotes" for speech
5. Be theatrical and engaging
6. If they attack, respond with defense/counter (don't auto-dodge everything)
7. If outmatched by tier difference, acknowledge the power gap
8. Keep responses concise (2-4 paragraphs max)
9. Follow R.O.K. rules: one base power, no godmodding
10. Make the battle fun and educational
11. Use the battle environment creatively in your actions
${dynamicEnvironment ? '12. CRITICAL: When describing any physical action (throwing, jumping, running, lifting), explicitly describe how the environmental conditions affect that action. Be specific about the physics.' : ''}`
      : `You are ${opponent.name} speaking out-of-character (OOC) to help a player learn the Realm of Kings battle system.

Provide helpful feedback about:
- Their roleplay technique
- R.O.K. rule compliance (one power, conjunction limits, etc.)
- Strategic suggestions
- Encouragement and tips

Keep responses friendly and constructive. Use [OOC: ...] format.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
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
    const aiResponse = data.choices?.[0]?.message?.content || "The opponent stands ready, awaiting your next move...";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mock battle AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
