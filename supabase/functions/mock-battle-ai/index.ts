import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    skill: number;
    personality?: string | null;
    mentality?: string | null;
  };
  opponent: {
    id: string;
    name: string;
    level: number;
    personality: string;
    powers: string;
    skill?: number;
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
  hazardEvent?: string;
  userGoesFirst?: boolean;
  isFirstMove?: boolean;
  characterStoryLore?: string;
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

    const { 
      userCharacter, 
      opponent, 
      userMessage, 
      channel, 
      messageHistory, 
      battleLocation, 
      dynamicEnvironment, 
      environmentEffects, 
      hazardEvent,
      userGoesFirst,
      isFirstMove,
      characterStoryLore,
    }: BattleRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build location context with optional dynamic environment effects
    let locationContext = battleLocation ? `\n\nBATTLE LOCATION: ${battleLocation}` : '';
    
    if (dynamicEnvironment && environmentEffects) {
      locationContext += environmentEffects;
    } else if (battleLocation) {
      locationContext += `\nIncorporate this environment naturally into your actions.`;
    }

    // Add hazard event if triggered
    let hazardContext = '';
    if (hazardEvent) {
      hazardContext = hazardEvent;
    }

    // Build character personality context for portraying the user's character
    let characterPersonalityContext = '';
    if (userCharacter.personality || userCharacter.mentality) {
      characterPersonalityContext = `\n\nUSER CHARACTER PERSONALITY & MENTALITY (Use this heavily to understand how ${userCharacter.name} acts, thinks, and fights):`;
      if (userCharacter.personality) {
        characterPersonalityContext += `\nPersonality: ${userCharacter.personality}`;
      }
      if (userCharacter.mentality) {
        characterPersonalityContext += `\nMentality: ${userCharacter.mentality}`;
      }
      characterPersonalityContext += `\n\nWhen ${userCharacter.name} takes an action, interpret it through their personality. A cold, calculating character attacks differently than a hot-headed berserker.`;
    }

    // Build character story lore context
    let storyLoreContext = '';
    if (characterStoryLore) {
      storyLoreContext = `\n\nCHARACTER STORY LORE (Use this to understand ${userCharacter.name}'s history, motivations, and past experiences):
${characterStoryLore}

INSTRUCTIONS: Reference this lore when appropriate - mention past events, use established relationships, acknowledge character growth and experiences from their stories. This makes the battle feel connected to the character's larger narrative.`;
    }

    // Handle first move when opponent goes first
    let firstMoveContext = '';
    if (isFirstMove && !userGoesFirst) {
      firstMoveContext = `\n\nFIRST MOVE: The initiative roll determined that YOU (${opponent.name}) strike first! Open with an aggressive action or tactical positioning. The opponent must react to your opening move.`;
    }

    const systemPrompt = channel === 'in_universe'
      ? `You are roleplaying as ${opponent.name}, a ${opponent.personality}

Your character details:
- Name: ${opponent.name}
- Power Tier: ${opponent.level}
- Powers: ${opponent.powers}
${opponent.skill ? `- Skill Proficiency: ${opponent.skill}/100` : ''}

You are in a practice battle against ${userCharacter.name} (Tier ${userCharacter.level}).
Their powers: ${userCharacter.powers || 'Unknown'}
Their abilities: ${userCharacter.abilities || 'Unknown'}
Their skill: ${userCharacter.skill || 50}/100${characterPersonalityContext}${locationContext}${storyLoreContext}${firstMoveContext}

WRITING STYLE - CRITICAL:
- Write naturally and organically. No over-the-top theatrics.
- NO physics talk. Characters don't mention momentum, gravity, force calculations. They just act.
- Keep it punchy - one strong sentence can hit harder than a paragraph.
- Let the world react naturally (ground cracks, dust rises) without narrating it separately.

COMBAT FLOW - EVERY ATTACK TURN:
- When the opponent attacks you, your response should include:
  1. A DEFENSIVE MANEUVER (if applicable) - brief, not wordy. Block, dodge, absorb, deflect - just a quick action.
  2. A COUNTERATTACK - strike back. Keep it tight, one or two sentences with flair.
- Not every attack needs a perfect defense. Sometimes you take the hit. Sometimes you power through.
- The flow should feel like: they swing → you react → you counter. Quick. Organic.

RULES FOR ROLEPLAY:
1. Stay in character as ${opponent.name} - your personality drives HOW you fight
2. React to ${userCharacter.name}'s actions based on THEIR personality and fighting style
3. Use *asterisks* for action descriptions
4. Use "quotes" for speech (keep dialogue punchy, in-character)
5. Mix defense and offense naturally - don't auto-dodge everything
6. If outmatched by tier, show it through struggle, not exposition
7. Keep responses concise (2-3 short paragraphs max)
8. Follow R.O.K. rules: one base power, no godmodding
9. Environment affects the fight naturally without calling attention to it
${hazardEvent ? '10. An environmental hazard occurs! Weave it into your action naturally.' : ''}
${userCharacter.skill && userCharacter.skill <= 30 ? '11. The opponent is inexperienced - their techniques falter sometimes. Show this through action.' : ''}
${opponent.skill && opponent.skill <= 30 ? '12. You\'re still learning - occasionally overextend or stumble.' : ''}
${characterStoryLore ? '13. Reference their history when it fits naturally.' : ''}`
      : `You are ${opponent.name} speaking out-of-character (OOC) to help a player learn the Realm of Kings battle system.

Provide helpful feedback about:
- Their roleplay technique
- R.O.K. rule compliance (one power, conjunction limits, etc.)
- Strategic suggestions
- Encouragement and tips

Keep responses friendly and constructive. Use [OOC: ...] format.`;

    // Add hazard event as a system-level instruction if present
    const messages = [
      { role: "system", content: systemPrompt },
      ...(hazardEvent ? [{ role: "system", content: hazardContext }] : []),
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
