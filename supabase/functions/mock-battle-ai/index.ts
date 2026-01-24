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
    skill: number;
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
  physicsContext?: string;
  skillContext?: string;
  userGoesFirst?: boolean;
  isFirstMove?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      physicsContext,
      skillContext,
      userGoesFirst,
      isFirstMove,
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
      locationContext += `\nIncorporate this environment into your actions and descriptions. Use the terrain, elements, and atmosphere of this location in your combat responses.`;
    }

    // Add hazard event if triggered
    let hazardContext = '';
    if (hazardEvent) {
      hazardContext = hazardEvent;
    }

    // Build physics and skill context
    let advancedContext = '';
    if (physicsContext) {
      advancedContext += physicsContext;
    }
    if (skillContext) {
      advancedContext += skillContext;
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
Their skill: ${userCharacter.skill || 50}/100${locationContext}${advancedContext}${firstMoveContext}

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
${dynamicEnvironment ? '12. CRITICAL: When describing any physical action (throwing, jumping, running, lifting), explicitly describe how the environmental conditions affect that action. Be specific about the physics.' : ''}
${hazardEvent ? '13. CRITICAL PRIORITY: An environmental hazard has just occurred! You MUST start your response by narrating this hazard event dramatically, then show how BOTH fighters react to it before continuing the battle. The hazard affects both combatants equally.' : ''}
${userCharacter.skill && userCharacter.skill <= 30 ? '14. SKILL FACTOR: The opponent has LOW SKILL. Occasionally describe their attacks misfiring, powers behaving erratically, or techniques failing mid-execution. They are learning!' : ''}
${opponent.skill && opponent.skill <= 30 ? '15. YOUR SKILL: You have LOW SKILL proficiency. Occasionally let your own attacks falter, powers surge unexpectedly, or show inexperience. Struggle realistically!' : ''}`
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
