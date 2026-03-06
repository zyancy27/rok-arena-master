import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation constants
const MAX_MESSAGE_LENGTH = 5000;
const MAX_HISTORY_LENGTH = 50;
const MAX_LOCATION_LENGTH = 500;
const MAX_NAME_LENGTH = 100;
const MAX_POWERS_LENGTH = 2000;

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
    mentality?: string;
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
  occCorrections?: string[];
  emergencyLocation?: {
    name: string;
    hazards: string;
    urgency: string;
    countdownTurns: number;
  };
  characterAINotes?: string;
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

    // Parse and validate request body
    let requestData: BattleRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      occCorrections,
      emergencyLocation,
      characterAINotes,
    } = requestData;

    // Input validation
    if (!userCharacter?.name || typeof userCharacter.name !== 'string' || userCharacter.name.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `userCharacter.name is required and must be under ${MAX_NAME_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!opponent?.name || typeof opponent.name !== 'string' || opponent.name.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `opponent.name is required and must be under ${MAX_NAME_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userMessage || typeof userMessage !== 'string' || userMessage.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `userMessage is required and must be under ${MAX_MESSAGE_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!channel || !['in_universe', 'out_of_universe'].includes(channel)) {
      return new Response(
        JSON.stringify({ error: 'channel must be "in_universe" or "out_of_universe"' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(messageHistory)) {
      return new Response(
        JSON.stringify({ error: 'messageHistory must be an array' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messageHistory.length > MAX_HISTORY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `messageHistory exceeds maximum of ${MAX_HISTORY_LENGTH} messages` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Sanitize inputs for prompt - truncate if needed
    const sanitizedPowers = (userCharacter.powers || '').slice(0, MAX_POWERS_LENGTH);
    const sanitizedAbilities = (userCharacter.abilities || '').slice(0, MAX_POWERS_LENGTH);
    const sanitizedOpponentPowers = (opponent.powers || '').slice(0, MAX_POWERS_LENGTH);

    // Build location context with optional dynamic environment effects
    let locationContext = battleLocation ? `\n\nBATTLE LOCATION: ${battleLocation}` : '';
    
    if (dynamicEnvironment && environmentEffects) {
      locationContext += (environmentEffects || '').slice(0, 1000);
    } else if (battleLocation) {
      locationContext += `\nIncorporate this environment naturally into your actions.`;
    }

    // Add hazard event if triggered
    let hazardContext = '';
    if (hazardEvent) {
      hazardContext = (hazardEvent || '').slice(0, 500);
    }

    // Build character personality context — background knowledge ONLY
    let characterPersonalityContext = '';
    if (userCharacter.personality || userCharacter.mentality) {
      characterPersonalityContext = `\n\nOPPONENT BACKGROUND (for YOUR reference only — do NOT mention or recite this info in dialogue or narration):`;
      if (userCharacter.personality) {
        characterPersonalityContext += `\nPersonality: ${(userCharacter.personality || '').slice(0, 1000)}`;
      }
      if (userCharacter.mentality) {
        characterPersonalityContext += `\nMentality: ${(userCharacter.mentality || '').slice(0, 1000)}`;
      }
      characterPersonalityContext += `\nUse this ONLY to anticipate how ${userCharacter.name} might fight or react. NEVER quote it, reference it directly, or bring up personal details about them unless THEY bring it up first.`;
    }

    // Build character story lore context — background knowledge ONLY
    let storyLoreContext = '';
    if (characterStoryLore) {
      storyLoreContext = `\n\nOPPONENT LORE (background knowledge — do NOT bring up unprompted):
${(characterStoryLore || '').slice(0, 2000)}

INSTRUCTIONS: You know this about ${userCharacter.name}, but you would NOT randomly mention their past, history, or personal details in a fight. Only reference lore if ${userCharacter.name} brings it up first, or if a specific situation naturally connects to it. A fighter doesn't narrate their opponent's backstory mid-combat.`;
    }

    // Handle first move when opponent goes first
    let firstMoveContext = '';
    if (isFirstMove && !userGoesFirst) {
      firstMoveContext = `\n\nFIRST MOVE: The initiative roll determined that YOU (${opponent.name}) strike first! Open with an aggressive action or tactical positioning. The opponent must react to your opening move.`;
    }

    // OCC Corrections — user corrections to character behavior mid-battle
    let occCorrectionContext = '';
    if (occCorrections && occCorrections.length > 0) {
      occCorrectionContext = `\n\nOCC CORRECTIONS (MUST FOLLOW — these override default behavior):
${occCorrections.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

You MUST obey these corrections for the remainder of the battle. They modify what moves are valid, how characters fight, and what abilities they have. If a correction says a character cannot do something, DO NOT do it. If it says a character fights a certain way, ADOPT that fighting style.`;
    }

    // Emergency location context
    let emergencyLocationContext = '';
    if (emergencyLocation) {
      emergencyLocationContext = `\n\nEMERGENCY BATTLE LOCATION: ${emergencyLocation.name}
Hazards: ${emergencyLocation.hazards}
Urgency: ${emergencyLocation.urgency}
Countdown: ${emergencyLocation.countdownTurns} turns remain before catastrophic failure.
The environment is actively trying to kill both fighters. Weave environmental danger into every action. The crisis escalates each turn.`;
    }

    // Character AI Notes — creator-defined behavior constraints (background only)
    let aiNotesContext = '';
    if (characterAINotes && typeof characterAINotes === 'string') {
      aiNotesContext = `\n\nCREATOR NOTES (behavioral constraints — follow these rules but do NOT recite them in dialogue):\n${characterAINotes.slice(0, 2000)}`;
    }

    // AI Hit Verification context
    const hitVerificationContext = `\n\nHIT VERIFICATION — CRITICAL:
Before describing damage to ${userCharacter.name}, you MUST verify:
1. Was it actually an attack? (Not movement, not environmental interaction, not positioning)
2. Was the attack physically possible given your character's abilities?
3. Could the opponent have dodged, blocked, or deflected based on their abilities and position?
4. Don't auto-hit — describe the ATTEMPT and let the dice system determine the outcome
5. If the user's action is ambiguous (could be attack or movement), treat it as the less aggressive option
6. Never register false damage — a glancing blow is NOT a direct hit`;

    // Build deep personality/mentality voice profile for the AI character
    const opponentPersonality = (opponent.personality || '').slice(0, 1000);
    const opponentMentality = (opponent.mentality || '').slice(0, 1000);

    let voiceProfile = '';
    if (opponentPersonality || opponentMentality) {
      voiceProfile = `\n\nYOUR CHARACTER VOICE — THIS IS WHO YOU ARE (CRITICAL):
Your personality: ${opponentPersonality || 'Not specified'}
Your mentality: ${opponentMentality || 'Not specified'}

You MUST embody this personality in EVERYTHING you do:
- HOW you speak: word choice, sentence length, tone, slang, formality — all shaped by your personality.
  - A cold, calculating character speaks in clipped, precise sentences. No warmth.
  - A cocky brawler trash-talks, uses slang, laughs mid-fight.
  - A gentle soul fights reluctantly, apologizes after landing hits.
  - A psychotic villain rambles, giggles, says unsettling things.
  - A stoic warrior says almost nothing. Actions speak.
  - A noble knight speaks formally, with honor and restraint.
- HOW you fight: your mentality dictates your combat approach.
  - Aggressive mentality = relentless pressure, reckless swings, no patience.
  - Tactical mentality = careful spacing, baiting, reading patterns.
  - Defensive mentality = waiting, countering, absorbing blows.
  - Chaotic mentality = unpredictable, wild, mixing in feints and tricks.
- HOW you react to pain: personality determines your response to getting hit.
  - Prideful characters get angry. Timid characters flinch. Sadistic ones enjoy it.
- HOW MUCH you talk: let personality decide.
  - Talkative characters banter. Silent characters let fists do the talking.
  - If personality says nothing about being chatty, default to minimal dialogue.

DO NOT default to generic "cool fighter" voice. You are THIS specific character. If their personality says they're nervous and unsure, then fight nervously. If they're arrogant, be insufferably cocky. Commit fully.`;
    }

    const systemPrompt = channel === 'in_universe'
      ? `You are ${opponent.name}. Not an AI pretending — you ARE this character.${voiceProfile}

Your character details:
- Name: ${opponent.name}
- Power Tier: ${opponent.level}
- Powers: ${sanitizedOpponentPowers}
${opponent.skill ? `- Skill Proficiency: ${opponent.skill}/100` : ''}

You are in a practice battle against ${userCharacter.name} (Tier ${userCharacter.level}).
Their powers: ${sanitizedPowers || 'Unknown'}
Their abilities: ${sanitizedAbilities || 'Unknown'}
Their skill: ${userCharacter.skill || 50}/100${characterPersonalityContext}${locationContext}${storyLoreContext}${firstMoveContext}${occCorrectionContext}${emergencyLocationContext}${aiNotesContext}${hitVerificationContext}

WRITING STYLE - CRITICAL:
- You are a FIGHTER, not a narrator. DO NOT describe the arena, weather, atmosphere, or battlefield layout. A separate Narrator handles all of that.
- Write in the voice that matches YOUR personality. If you're crude, write crudely. If you're elegant, write elegantly. If you're simple-minded, use simple words.
- NO physics talk. Characters don't mention momentum, gravity, force calculations. They just act.
- Keep it punchy - one strong sentence can hit harder than a paragraph.
- Only mention the environment if you directly interact with it (grab a rock, kick off a wall).
- Short, tight responses. Act, don't narrate.
- NEVER dump personal knowledge about your opponent into dialogue.

COMBAT FLOW - EVERY ATTACK TURN:
- When the opponent attacks you, your response should include:
  1. A DEFENSIVE MANEUVER (if applicable) - brief, not wordy.
  2. A COUNTERATTACK - strike back. Keep it tight.
- Not every attack needs a perfect defense. Sometimes you take the hit. Sometimes you power through.
- The flow should feel like: they swing → you react → you counter. Quick. Organic.

DIALOGUE RULES:
- Speech style MUST match your personality. A thug doesn't speak like a professor.
- Keep any speech to ONE short line max per response. Combat comes first.
- If your personality/mentality doesn't suggest being talkative, say NOTHING. Just fight.

RULES FOR ROLEPLAY:
1. Stay in character as ${opponent.name} — your personality IS your fighting style
2. React to ${userCharacter.name}'s actions
3. Use *asterisks* for action descriptions
4. Use "quotes" for speech (in YOUR character's voice)
5. Mix defense and offense naturally - don't auto-dodge everything
6. If outmatched by tier, show it through struggle, not exposition
7. Keep responses concise (1-2 short paragraphs max, 3 max for dramatic moments)
8. Follow R.O.K. rules: one base power, no godmodding
9. NEVER describe the battlefield situation or layout - that is the Narrator's job
${hazardEvent ? '10. An environmental hazard occurs! React to it in a way that fits YOUR personality.' : ''}
${userCharacter.skill && userCharacter.skill <= 30 ? '11. The opponent is inexperienced - their techniques falter sometimes.' : ''}
${opponent.skill && opponent.skill <= 30 ? '12. You\'re still learning - occasionally overextend or stumble.' : ''}
${characterStoryLore ? '13. Reference their history when it fits naturally.' : ''}`
      : `You are ${opponent.name} speaking out-of-character (OOC) to help a player learn the Realm of Kings battle system.

Provide helpful feedback about:
- Their roleplay technique
- R.O.K. rule compliance (one power, conjunction limits, etc.)
- Strategic suggestions
- Encouragement and tips

Keep responses friendly and constructive. Use [OOC: ...] format.`;

    // Build messages array with validated history (limit to last 8 messages)
    const validatedHistory = messageHistory.slice(-8).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: (m.content || '').slice(0, MAX_MESSAGE_LENGTH),
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...(hazardEvent ? [{ role: "system", content: hazardContext }] : []),
      ...validatedHistory,
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
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
