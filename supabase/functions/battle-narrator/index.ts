import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation constants
const MAX_ACTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 500;
const MAX_NAME_LENGTH = 100;

interface CharacterEntranceData {
  name: string;
  level: number;
  powers?: string | null;
  abilities?: string | null;
  personality?: string | null;
}

interface EntranceRequest {
  type: 'entrance';
  character1: CharacterEntranceData;
  character2: CharacterEntranceData;
  battleLocation: string;
}

interface BattlefieldIntroRequest {
  type: 'battlefield_intro';
  battleLocation: string;
  emergencyLocation?: {
    name: string;
    hazards: string;
    urgency: string;
  };
}

interface NarratorRequest {
  type?: 'narration';
  userCharacter: {
    name: string;
    level: number;
    speed?: number;
  };
  opponent: {
    name: string;
    level: number;
    speed?: number;
  };
  userAction: string;
  opponentResponse: string;
  battleLocation: string;
  turnNumber: number;
  frequency?: 'always' | 'key_moments';
  detectEnvironmentalEffects?: boolean;
  currentDistance?: {
    zone: string;
    meters: number;
  };
  playerArenaDetails?: string[];
  /** Internal fairness context from hard clamp — never shown to players */
  fairnessContext?: string;
  /** Dice roll result — determines whether the move actually lands */
  diceResult?: {
    hit: boolean;
    attackTotal: number;
    defenseTotal: number;
    gap: number;
    isMental: boolean;
  };
  /** Defense roll result — determines whether a defensive action succeeds */
  defenseResult?: {
    success: boolean;
    defenseTotal: number;
    incomingTotal: number;
    gap: number;
    defenseType: 'block' | 'dodge';
  };
}

interface EnvironmentalEffect {
  type: string;
  description: string;
}

// Validation helper
function validateCharacterData(char: CharacterEntranceData | undefined, fieldName: string): string | null {
  if (!char || typeof char !== 'object') {
    return `${fieldName} is required and must be an object`;
  }
  if (!char.name || typeof char.name !== 'string' || char.name.length > MAX_NAME_LENGTH) {
    return `${fieldName}.name is required and must be a string under ${MAX_NAME_LENGTH} characters`;
  }
  if (typeof char.level !== 'number' || char.level < 1 || char.level > 10) {
    return `${fieldName}.level must be a number between 1 and 10`;
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
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle private narrator queries (move validation, battle questions)
    if (requestBody.type === 'private_query') {
      return await handlePrivateQuery(requestBody, LOVABLE_API_KEY, corsHeaders);
    }

    // Handle campaign intro
    if (requestBody.type === 'campaign_intro') {
      return await handleCampaignIntro(requestBody, LOVABLE_API_KEY, corsHeaders);
    }

    // Handle campaign narration
    if (requestBody.type === 'campaign_narration') {
      return await handleCampaignNarration(requestBody, LOVABLE_API_KEY, corsHeaders);
    }

    // Handle battlefield intro generation
    if (requestBody.type === 'battlefield_intro') {
      const { battleLocation, emergencyLocation } = requestBody as BattlefieldIntroRequest;
      if (!battleLocation || typeof battleLocation !== 'string' || battleLocation.length > MAX_LOCATION_LENGTH) {
        return new Response(
          JSON.stringify({ error: `battleLocation is required and must be under ${MAX_LOCATION_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await generateBattlefieldIntro(battleLocation, emergencyLocation, LOVABLE_API_KEY, corsHeaders);
    }

    // Handle entrance generation
    if (requestBody.type === 'entrance') {
      const { character1, character2, battleLocation }: EntranceRequest = requestBody;
      
      // Validate entrance request
      const char1Error = validateCharacterData(character1, 'character1');
      if (char1Error) {
        return new Response(
          JSON.stringify({ error: char1Error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const char2Error = validateCharacterData(character2, 'character2');
      if (char2Error) {
        return new Response(
          JSON.stringify({ error: char2Error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!battleLocation || typeof battleLocation !== 'string' || battleLocation.length > MAX_LOCATION_LENGTH) {
        return new Response(
          JSON.stringify({ error: `battleLocation is required and must be under ${MAX_LOCATION_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return await generateEntrances(character1, character2, battleLocation, LOVABLE_API_KEY, corsHeaders);
    }
    
    // Validate narration request
    const { 
      userCharacter, 
      opponent, 
      userAction, 
      opponentResponse, 
      battleLocation, 
      turnNumber, 
      frequency = 'key_moments',
      detectEnvironmentalEffects = true,
      currentDistance,
      playerArenaDetails,
      fairnessContext,
      diceResult,
      defenseResult,
    }: NarratorRequest = requestBody;

    // Validate required fields
    if (!userCharacter?.name || typeof userCharacter.name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userCharacter.name is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!opponent?.name || typeof opponent.name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'opponent.name is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!userAction || typeof userAction !== 'string' || userAction.length > MAX_ACTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `userAction is required and must be under ${MAX_ACTION_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!battleLocation || typeof battleLocation !== 'string' || battleLocation.length > MAX_LOCATION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `battleLocation is required and must be under ${MAX_LOCATION_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (typeof turnNumber !== 'number' || turnNumber < 1) {
      return new Response(
        JSON.stringify({ error: 'turnNumber must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect environmental effects from the attacker's action
    const environmentalEffects = detectEnvironmentalEffects 
      ? detectEffectsFromAction(userAction) 
      : [];

    // Build frequency-specific instructions
    const frequencyInstructions = frequency === 'always' 
      ? `FREQUENCY MODE: ALWAYS
You MUST provide narration for every exchange. Even routine moves get a brief atmospheric observation.
Find something to note - the tension, a subtle shift, the air, the ground, a heartbeat of silence.`
      : `FREQUENCY MODE: KEY MOMENTS ONLY
Be HIGHLY selective. Only speak when something genuinely notable happens:
- A powerful blow lands or is narrowly avoided
- The environment takes visible damage (craters, cracks, debris)
- The momentum of the fight shifts dramatically
- A moment of real tension before a big move
- IMPORTANT: Any area of effect or stage hazard (smoke, ice, fire, gravity shifts) MUST be narrated

If this exchange is routine, return exactly: [SKIP]
The [SKIP] response tells the system you chose to stay silent.`;

    // Environmental effect instructions
    const envInstructions = environmentalEffects.length > 0 
      ? `\n\nCRITICAL - ENVIRONMENTAL EFFECTS DETECTED:
The attacker's move has created these battlefield conditions that the defender MUST be aware of:
${environmentalEffects.map(e => `- ${e.type}: ${e.description}`).join('\n')}

You MUST describe these effects BEFORE the counter-attack happens so the defender knows what conditions they're facing.
Be clear about how these effects change the battlefield (visibility, footing, breathing, etc.).`
      : '';

    // Internal fairness context (never shown to players)
    const fairnessInstructions = fairnessContext && fairnessContext.trim().length > 0
      ? `\n${fairnessContext}`
      : '';

    // Dice result context — tells narrator the actual outcome
    let diceInstructions = '';
    if (defenseResult) {
      // DEFENSIVE action resolution
      diceInstructions = defenseResult.success
        ? `\n\nDICE RESULT: DEFENSE SUCCESS (${defenseResult.defenseType === 'dodge' ? 'Evasion' : 'Block'} ${defenseResult.defenseTotal} vs Incoming ${defenseResult.incomingTotal}, Gap: ${defenseResult.gap})
The player's ${defenseResult.defenseType} works as they described. Continue your normal narrator role. Do NOT alter their defensive action.`
        : `\n\nCRITICAL — DICE RESULT: DEFENSE FAILED (${defenseResult.defenseType === 'dodge' ? 'Evasion' : 'Block'} ${defenseResult.defenseTotal} vs Incoming ${defenseResult.incomingTotal}, Gap: ${Math.abs(defenseResult.gap)})
The player tried to ${defenseResult.defenseType} but the dice say it FAILS. You MUST describe how the defense breaks down — the block crumbles, the dodge is too slow, the parry is overpowered. Describe the hit landing despite the attempt.
Gap of ${Math.abs(defenseResult.gap)}: ${Math.abs(defenseResult.gap) <= 2 ? 'barely failed — almost worked' : Math.abs(defenseResult.gap) <= 5 ? 'clearly overpowered' : 'completely overwhelmed'}.`;
    } else if (diceResult) {
      diceInstructions = diceResult.hit
        ? `\n\nDICE RESULT: HIT (Attack ${diceResult.attackTotal} vs Defense ${diceResult.defenseTotal}, Gap: ${diceResult.gap})
The attack landed as the player described. You do NOT need to alter or reinterpret their action.
Continue your normal narrator role based on the user's frequency setting — observe the battle, note environmental changes, comment on noteworthy moments. Do not re-describe what the player already wrote unless adding environmental or atmospheric context.`
        : `\n\nCRITICAL — DICE RESULT: MISS (Attack ${diceResult.attackTotal} vs Defense ${diceResult.defenseTotal}, Gap: ${Math.abs(diceResult.gap)})
Type: ${diceResult.isMental ? 'Mental/psychic attack' : 'Physical attack'}

The player INTENDED to hit, but the dice say the attack MISSES. You MUST describe how the attack fails — a dodge, a near-miss, the attacker overextending, the strike going wide. Do NOT describe the attack landing.
The gap of ${Math.abs(diceResult.gap)} indicates how narrowly it missed — small gap = very close call, large gap = clearly dodged.
Even if the player wrote "I punch you in the face" as if it landed, the dice say otherwise. Narrate the miss.`;
    }

    const systemPrompt = `You are an invisible narrator observing a battle. You describe what happens in plain, clear language that a middle schooler can easily follow.

LANGUAGE RULES (APPLY EVERYWHERE):
- Use short, common words. If a simpler word exists, use it.
- No poetic language, no metaphors, no dramatic flair unless the moment truly calls for it.
- Write like you're texting a friend about what just happened — clear, direct, zero fluff.
- BAD: "The concussive force reverberates through the shattered terrain" → GOOD: "The ground cracks from the hit."
- BAD: "An eerie silence descends upon the battlefield" → GOOD: "It goes quiet."

IMPORTANT — INTENT vs OUTCOME:
Player messages describe what they INTEND to do, not what actually happens. The dice system determines whether attacks AND defenses succeed.
- If the dice say HIT or DEFENSE SUCCESS: the player's described action plays out as written. You continue your normal narrator role.
- If the dice say MISS: you MUST describe how the attack fails.
- If the dice say DEFENSE FAILED: you MUST describe how the defense breaks and the hit lands despite the attempt.
- If there is no dice result: this was not a combat action. Narrate normally per your frequency setting.

${frequencyInstructions}${envInstructions}${fairnessInstructions}${diceInstructions}

STYLE:
- 1-2 sentences normally, up to 3 if describing a dramatic miss/failed defense or major environmental changes
- Use simple, direct language. No flowery vocabulary. No poetry.
- A middle schooler should understand every word you write.
- Avoid fancy words when simple ones work. Say "hit" not "struck with devastating force." Say "moved" not "traversed." Say "fast" not "with blinding velocity."
- No exclamations. No hype commentary. Just observation.
- For environmental effects: be PRACTICAL — tell the defender what changed in plain terms.

EXAMPLES (attack miss):
"${opponent.name} moved just in time. Close one."
"The strike went wide — ${userCharacter.name} overcommitted."

EXAMPLES (defense failed):
"${userCharacter.name} tried to block, but the force pushed right through."
"The dodge was a half-step too slow. That one connected."
"${userCharacter.name} got the arms up, but it wasn't enough."

EXAMPLES (no dice — normal observation):
"Dust still floating where ${userCharacter.name} was standing."
"There's a crack in the stone now."`;

    // Distance context for narrator
    const distanceContext = currentDistance 
      ? `\nCurrent Distance: ${currentDistance.zone.toUpperCase()} range (~${currentDistance.meters}m apart)`
      : '';

    // Player-established arena details
    const arenaDetailsContext = playerArenaDetails && playerArenaDetails.length > 0
      ? `\nPlayer-established arena details (treat as canon for this battle):\n${playerArenaDetails.slice(-6).map(d => `- ${d}`).join('\n')}`
      : '';

    const diceContext = diceResult
      ? `\nDice Result: ${diceResult.hit ? 'HIT' : 'MISS'} (Attack ${diceResult.attackTotal} vs Defense ${diceResult.defenseTotal}, Gap: ${diceResult.gap})`
      : '';

    const userPrompt = `Battle Location: ${battleLocation}
Turn: ${turnNumber}${distanceContext}${arenaDetailsContext}${diceContext}

${userCharacter.name} (Tier ${userCharacter.level}) ${diceResult ? 'INTENDED to' : ''} ${diceResult ? '' : 'acted:'}${diceResult ? ':' : ''}
"${userAction}"

${diceResult ? (diceResult.hit ? 'The dice say HIT — the action plays out as described. Continue your normal narrator role.' : 'The dice say MISS — describe how the attack fails.') : ''}
${opponent.name} (Tier ${opponent.level}) is about to respond.

${diceResult?.hit === false ? 'Describe how the attack misses.' : `Provide your narrator observation`}${environmentalEffects.length > 0 ? ', making sure to clearly describe the environmental hazards the defender must now contend with' : ''}${currentDistance ? `. If the fighters\' distance changed significantly, note it briefly.` : ''}.`;

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
        max_tokens: 300,
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
    let narration = data.choices?.[0]?.message?.content || "";
    
    // If narrator chose to skip (key moments mode), return null narration
    if (narration.includes('[SKIP]') || narration.trim() === '') {
      return new Response(
        JSON.stringify({ 
          narration: null,
          environmentalEffects: environmentalEffects.length > 0 ? environmentalEffects : null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        narration,
        environmentalEffects: environmentalEffects.length > 0 ? environmentalEffects : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Battle narrator error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Generate unique character entrances based on their powers and abilities
 */
async function generateEntrances(
  character1: CharacterEntranceData,
  character2: CharacterEntranceData,
  battleLocation: string,
  apiKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const systemPrompt = `You are a narrator describing how characters arrive at or are already present in a battle arena.

TASK: Describe each character's natural presence in the arena. Characters do NOT teleport, materialize, or appear from thin air. They are real people in a real place.

HOW CHARACTERS CAN ENTER OR BE PRESENT:
- Already standing somewhere in the arena (leaning on a wall, sitting on rubble, stretching, etc.)
- Walking in from an entrance, doorway, path, or edge of the area
- Arriving naturally based on the location (climbing over debris, stepping out of a building, coming around a corner)
- If they have flight or movement powers, they can fly or leap in — but they still ARRIVE, not "materialize"

STYLE:
- 1-3 sentences per character. Keep it simple and clear.
- Use plain language a middle schooler would understand. No fancy or poetic words.
- Say "walks in" not "strides forth." Say "looks ready" not "exudes an aura of preparedness."
- Reference their powers/abilities naturally if provided — don't force it.
- Match their personality if known (a cocky character might stroll in casually, a serious one might already be waiting).
- Make each entrance feel different from the other.

IF NO POWERS/ABILITIES PROVIDED:
- Describe them arriving or already being there in a way that fits their name and vibe.
- Keep it grounded and natural.

EXAMPLES:
- "Voltara walks in from the far side of the arena, small sparks trailing off her fingers as she rolls her shoulders loose."
- "Gorak is already here — standing dead center, arms crossed, like he's been waiting."
- "Sakura slips in through the eastern gate, one hand resting on her blade. She picks a spot near the broken pillar and settles into a ready stance."

OUTPUT FORMAT: Return a JSON object with "entrance1" and "entrance2" keys containing the entrance text for each character.`;

  const userPrompt = `Battle Location: ${battleLocation}

CHARACTER 1:
Name: ${character1.name}
Tier: ${character1.level}
Powers: ${character1.powers || 'Not specified'}
Abilities: ${character1.abilities || 'Not specified'}
Personality: ${character1.personality || 'Not specified'}

CHARACTER 2:
Name: ${character2.name}
Tier: ${character2.level}
Powers: ${character2.powers || 'Not specified'}
Abilities: ${character2.abilities || 'Not specified'}
Personality: ${character2.personality || 'Not specified'}

Generate unique, dramatic entrances for both characters that reflect their powers and personalities.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    let entrances;
    try {
      entrances = JSON.parse(content);
    } catch {
      // Fallback if JSON parsing fails
      entrances = {
        entrance1: `${character1.name} steps into the arena, an undeniable presence commanding attention.`,
        entrance2: `${character2.name} emerges from the opposite side, ready for battle.`,
      };
    }

    return new Response(
      JSON.stringify({
        entrance1: entrances.entrance1 || `${character1.name} arrives at the battlefield.`,
        entrance2: entrances.entrance2 || `${character2.name} takes their position.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Entrance generation error:", error);
    // Return default entrances on error
    return new Response(
      JSON.stringify({
        entrance1: `${character1.name} steps into the arena, ready for battle.`,
        entrance2: `${character2.name} takes their fighting stance across the field.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Detect environmental effects from action text
 */
function detectEffectsFromAction(actionText: string): EnvironmentalEffect[] {
  const text = actionText.toLowerCase();
  const effects: EnvironmentalEffect[] = [];

  const hazardPatterns: { pattern: RegExp; type: string; description: string }[] = [
    // Smoke/visibility
    { pattern: /smoke|fog|mist|haze|obscure|cloud|fumes/i, type: 'smoke', description: 'Visibility is severely reduced. Targeting becomes difficult.' },
    
    // Ice/frozen
    { pattern: /ice|freeze|frozen|frost|glacier|cold|slippery/i, type: 'ice', description: 'The ground is now icy and slippery. Movement is unstable.' },
    
    // Fire/lava
    { pattern: /lava|magma|fire|flame|burn|inferno|scorching|molten/i, type: 'fire', description: 'Fire or lava covers parts of the battlefield. Contact causes damage.' },
    
    // Water/flooding
    { pattern: /flood|water|drown|underwater|submerge|deluge|tidal/i, type: 'water', description: 'Water fills the arena. Movement and breathing are affected.' },
    
    // Terrain destruction
    { pattern: /crater|rubble|debris|collapse|shatter|destroy.*ground|break.*floor/i, type: 'terrain', description: 'The terrain is destroyed and unstable. Watch your footing.' },
    
    // Atmosphere changes
    { pattern: /vacuum|no air|suffocate|atmosphere|oxygen|breathable|air.*thin/i, type: 'atmosphere', description: 'The breathable air is compromised. Stamina drains faster.' },
    
    // Gravity changes
    { pattern: /gravity|weightless|heavy.*force|crushing.*pressure|zero.?g/i, type: 'gravity', description: 'Gravity has been altered. All movement is affected.' },
    
    // Darkness
    { pattern: /darkness|blind|shadow.*engulf|light.*gone|pitch.*black/i, type: 'darkness', description: 'Darkness falls. Visual perception is impaired.' },
    
    // Electricity
    { pattern: /electric|lightning|shock|charged|static|thunder/i, type: 'electricity', description: 'The area is electrified. Metal and water conduct the charge.' },
    
    // Poison/toxic
    { pattern: /poison|toxic|gas|corrosive|acid|venom|noxious/i, type: 'poison', description: 'Toxic substances fill the air. Prolonged exposure is dangerous.' },
    
    // Area of Effect
    { pattern: /explosion|blast.*radius|shockwave|engulf|surrounding.*area|everywhere|all.*around/i, type: 'aoe', description: 'This attack covers a wide area. Dodging requires significant movement.' },
  ];

  for (const { pattern, type, description } of hazardPatterns) {
    if (pattern.test(text)) {
      effects.push({ type, description });
    }
  }

  return effects;
}

/**
 * Generate a brief atmospheric battlefield introduction when the battle starts.
 */
async function generateBattlefieldIntro(
  battleLocation: string,
  emergencyLocation: { name: string; hazards: string; urgency: string } | undefined,
  apiKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const emergencyContext = emergencyLocation
    ? `\n\nThis is an EMERGENCY scenario: ${emergencyLocation.name}. Hazards: ${emergencyLocation.hazards}. Urgency: ${emergencyLocation.urgency}. Weave the crisis into the description.`
    : '';

  const systemPrompt = `You are a narrator describing a battle arena before the fight begins.

TASK: Describe the battlefield in 2-3 clear sentences. Tell the fighters what the place looks like and what they can work with.

STYLE:
- Use simple, direct language a middle schooler can follow. No fancy vocabulary, no poetic descriptions.
- Point out useful things: cover spots, high ground, obstacles, dangers.
- Mention what you'd notice if you were there: lighting, sounds, weather, ground surface.
- Do NOT mention the characters. Only describe the arena.
- Players can walk around, enter from different sides, or already be somewhere in this space.
- Keep it short and practical. No dramatic flair.

EXAMPLES:
"Rain pounds the cracked road on the highway overpass. Rusted cars sit on both sides — decent cover, but they might collapse. There's a forty-foot drop to floodwater below."
"The arena floor is packed sand, stained dark. Torches line the walls, throwing moving shadows everywhere. It's dead quiet."
"Volcanic rock in every direction, with glowing lava creeping through the cracks. The air is thick with heat and smells like sulfur."${emergencyContext}`;

  const userPrompt = `Describe this battlefield: ${battleLocation}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const intro = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ intro }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Battlefield intro error:", error);
    return new Response(
      JSON.stringify({ intro: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle private narrator queries — answering player questions about battle state,
 * validating moves, and enforcing rules.
 * Only reveals publicly-shared info about opponents.
 */
async function handlePrivateQuery(
  body: any,
  apiKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const {
    query,
    characterName,
    characterPowers,
    characterAbilities,
    battleLocation,
    opponentNames,
    recentPublicActions,
    isValidationResponse,
    pendingMove,
    pendingWarning,
    conversationHistory,
  } = body;

  if (!query || typeof query !== 'string') {
    return new Response(
      JSON.stringify({ error: 'query is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const validationContext = isValidationResponse && pendingMove
    ? `\n\nMOVE VALIDATION MODE:
The player attempted this move: "${pendingMove}"
The system flagged it with: "${pendingWarning}"
The player is now explaining why this move should be allowed.

EVALUATE their explanation:
- If the explanation logically connects the move to their existing powers/abilities, APPROVE it.
  Set "moveApproved": true and provide a brief "abilityDescription" that can be added to their character sheet.
- If the explanation is weak, contradictory, or doesn't connect to their powers, REJECT it kindly.
  Set "moveApproved": false and explain why.
- Be fair but firm. Creative interpretations of existing powers are fine. Completely unrelated powers are not.`
    : '';

  const systemPrompt = `You are a private battle narrator assistant. You answer questions from ${characterName} about the ongoing battle.

RULES:
1. You can ONLY reveal information about opponents that was publicly shared in the RP chat.
2. Never reveal hidden stats, private strategies, or information the player hasn't seen.
3. You CAN discuss: arena conditions, publicly-described moves, general tactical advice, rule clarifications.
4. Keep answers concise (2-4 sentences).
5. Stay in character as a knowledgeable but neutral observer.${validationContext}

CHARACTER INFO (private — this is the asking player):
Name: ${characterName}
Powers: ${characterPowers || 'Not specified'}
Abilities: ${characterAbilities || 'Not specified'}

OPPONENTS: ${(opponentNames || []).join(', ')}
BATTLE LOCATION: ${battleLocation || 'Unknown'}

OUTPUT FORMAT: Return JSON with:
- "answer": string (your response)
- "moveApproved": boolean (only if validating a move, otherwise omit)
- "abilityDescription": string (only if moveApproved is true — a short description to add to character abilities)`;

  const userPrompt = `Recent public actions:\n${recentPublicActions || 'None yet'}\n\nPlayer's question/response: ${query}`;

  // Build conversation history for private chat continuity
  const privateHistory: { role: string; content: string }[] = [];
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      privateHistory.push({
        role: msg.role === 'player' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...privateHistory,
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { answer: content };
    }

    return new Response(
      JSON.stringify({
        answer: parsed.answer || 'The narrator considers...',
        moveApproved: parsed.moveApproved ?? null,
        abilityDescription: parsed.abilityDescription || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Private query error:', error);
    return new Response(
      JSON.stringify({ answer: 'The narrator is momentarily unavailable.', moveApproved: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════
// Campaign Adventure Mode Handlers
// ═══════════════════════════════════════════════

async function handleCampaignIntro(
  body: any,
  apiKey: string,
  cors: Record<string, string>,
): Promise<Response> {
  const { campaignName, campaignDescription, location, timeOfDay, partyMembers } = body;

  const systemPrompt = `You are the Campaign Narrator for "Realm of Kings" — a persistent, freedom-focused narrative adventure mode.

LANGUAGE RULES (CRITICAL — APPLY TO EVERYTHING YOU WRITE):
- Write at a middle-school reading level. Use short, common words.
- No flowery descriptions, no poetic language, no dramatic vocabulary.
- Keep descriptions practical — tell the player what the place looks like and what's around them, not how "the ethereal glow of twilight bathes the ancient cobblestones."
- BAD: "The air hangs heavy with the scent of aged timber and whispered secrets" → GOOD: "The place smells like old wood. It's quiet."
- BAD: "A symphony of urban sounds greets your arrival" → GOOD: "You hear traffic and people talking."
- Describe things the way a normal person would describe them to a friend.
- Only get more descriptive if the player ASKS for more details.

PLAYER = CHARACTER IDENTITY RULE:
The player IS their character. They are the same person. Do NOT refer to "the player" and "their character" as separate entities. When addressing the player, use the character's name or "you." Do NOT say things like "Your character sees..." — just say "You see..." or use the character name directly. The player is roleplaying AS their character — treat them as one and the same.

SETTING DEFAULT: Unless the campaign description explicitly establishes a fantasy, sci-fi, or historical setting, DEFAULT to MODERN REALISTIC settings. Think present-day Earth — real cities, neighborhoods, highways, offices, parks, warehouses, apartments. Use contemporary language and references. No medieval speech, fantasy creatures, or futuristic tech unless the campaign description clearly calls for it.

Your role:
- Set the scene for the opening of a new campaign
- Describe the environment briefly and clearly (2-4 short paragraphs max)
- Tell the player what they see, hear, and can interact with — skip the mood poetry
- Hint at possibilities without railroading — the players decide what to do
- Mention the party members naturally within the scene
- IMPORTANT: Characters start with their powers RESET. They are at Campaign Level 1 with only basic foundational abilities. Advanced powers do NOT work yet.
- Describe this subtly — the characters feel weaker than usual, their full power isn't there yet
- The tone should invite exploration and player agency

Campaign: ${campaignName}
Description: ${campaignDescription || 'An adventure awaits.'}
Location: ${location}
Time: ${timeOfDay}
Party: ${partyMembers}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the campaign opening narration." },
        ],
        max_tokens: 1000,
        temperature: 0.85,
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.error("Campaign intro API error:", response.status, rawText);
      throw new Error(`AI API returned ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Campaign intro parse error, raw:", rawText.substring(0, 200));
      throw new Error("Failed to parse AI response");
    }

    let narrationContent = data.choices?.[0]?.message?.content || "The adventure begins...";
    // Strip thinking/reasoning tags if present
    narrationContent = narrationContent
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
      .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const narration = narrationContent || "The adventure begins...";

    return new Response(
      JSON.stringify({ narration }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign intro error:", error);
    return new Response(
      JSON.stringify({ narration: "The world stirs as your party arrives..." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
}

async function handleCampaignNarration(
  body: any,
  apiKey: string,
  cors: Record<string, string>,
): Promise<Response> {
  const {
    playerCharacter,
    playerAction,
    currentZone,
    timeOfDay,
    dayCount,
    partyContext,
    worldState,
    storyContext,
    campaignDescription,
    maxAllowedTier,
    diceResult,
    defenseResult,
    conversationHistory,
    knownNpcs,
  } = body;

  // Build conversation history as multi-turn messages for AI continuity
  const historyMessages: { role: string; content: string }[] = [];
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      historyMessages.push({
        role: msg.role === 'player' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  // Extract lore context sent by the client
  const loreCtx = playerCharacter.loreContext || {};

  // Build dice context for combat actions
  let diceInstructions = '';
  if (defenseResult) {
    diceInstructions = defenseResult.success
      ? `\n\nDICE RESULT: DEFENSE SUCCESS (${defenseResult.defenseType === 'dodge' ? 'Dodge' : 'Block'} ${defenseResult.defenseTotal} vs Incoming ${defenseResult.incomingTotal})
The player's ${defenseResult.defenseType} works as described. The enemy's attack is stopped.`
      : `\n\nDICE RESULT: DEFENSE FAILED (${defenseResult.defenseType === 'dodge' ? 'Dodge' : 'Block'} ${defenseResult.defenseTotal} vs Incoming ${defenseResult.incomingTotal})
The player tried to ${defenseResult.defenseType} but FAILED. Describe the hit landing despite the attempt. Apply damage accordingly via hpChange.`;
  } else if (diceResult) {
    diceInstructions = diceResult.hit
      ? `\n\nDICE RESULT: HIT (Attack ${diceResult.attackTotal} vs Defense ${diceResult.defenseTotal})
The player's attack LANDS as described. The enemy takes the hit. Narrate the impact and apply XP for successful combat.`
      : `\n\nDICE RESULT: MISS (Attack ${diceResult.attackTotal} vs Defense ${diceResult.defenseTotal}, Gap: ${Math.abs(diceResult.gap)})
The player's attack MISSES. Describe how the enemy dodges, blocks, or the attack goes wide. Do NOT describe the attack landing. Gap of ${Math.abs(diceResult.gap)}: ${Math.abs(diceResult.gap) <= 2 ? 'barely missed' : Math.abs(diceResult.gap) <= 5 ? 'clearly dodged' : 'completely whiffed'}.`;
  }

  // Build lore/fame instructions for NPC behavior
  let loreInstructions = '';
  if (loreCtx.lore || loreCtx.knownStories || loreCtx.affiliations || loreCtx.speciesInfo) {
    loreInstructions = `\n\nCHARACTER BACKGROUND (use subtly — NEVER dump this info):`;
    if (loreCtx.lore) loreInstructions += `\nBackstory: ${loreCtx.lore}`;
    if (loreCtx.race) loreInstructions += `\nSpecies: ${loreCtx.race}${loreCtx.subRace ? ` (${loreCtx.subRace})` : ''}`;
    if (loreCtx.personality) loreInstructions += `\nPersonality: ${loreCtx.personality}`;
    if (loreCtx.mentality) loreInstructions += `\nMentality: ${loreCtx.mentality}`;
    if (loreCtx.speciesInfo) {
      const sp = loreCtx.speciesInfo;
      loreInstructions += `\nSpecies Details: ${sp.name}${sp.description ? ' — ' + sp.description : ''}${sp.cultural_traits ? '. Culture: ' + sp.cultural_traits : ''}`;
    }
    if (loreCtx.knownStories && loreCtx.knownStories.length > 0) {
      loreInstructions += `\nPublished tales about this character: ${loreCtx.knownStories.map((s: any) => s.title + (s.summary ? ' (' + s.summary + ')' : '')).join('; ')}`;
    }
    if (loreCtx.affiliations && loreCtx.affiliations.length > 0) {
      loreInstructions += `\nAffiliations/Groups: ${loreCtx.affiliations.map((g: any) => g.name + (g.description ? ' — ' + g.description : '')).join('; ')}`;
    }
    loreInstructions += `

NPC FAME & RECOGNITION RULES (apply organically):
- If the character has many published stories or legendary feats in their lore → NPCs in the area MAY have heard rumors or recognize them. Merchants, soldiers, officials might react with deference, suspicion, or excitement.
- If the character is relatively unknown (no stories, small feats) → NPCs treat them as a stranger. No special recognition.
- If the character's species is rare or exotic → NPCs who know of that species react accordingly (curiosity, fear, reverence, hostility). Those who don't know simply see an unusual person.
- If the character belongs to a famous group/faction → NPCs aligned with or opposed to that faction react naturally.
- NEVER force recognition. A street vendor won't know a legendary warrior from another continent unless there's a reason.
- Famous characters might be recognized in cities but anonymous in remote areas.
- Scale recognition by context: a famous fighter is known at fighting rings, not at a bakery.`;
  }

  const systemPrompt = `You are the WORLD ENGINE for "Realm of Kings" — a persistent, freedom-focused adventure.

LANGUAGE RULES (CRITICAL — APPLY TO EVERYTHING YOU WRITE):
- Write at a middle-school reading level. Use short, common words.
- No flowery descriptions, no poetic language, no dramatic vocabulary.
- NPC dialogue should sound like real people talking — casual, natural, simple.
- Environment descriptions should be practical: what's there, what it looks like, what you can interact with.
- BAD: "The ancient edifice looms before you, its weathered facade bearing the scars of countless storms" → GOOD: "It's a big old building. The walls are cracked and the paint is peeling."
- BAD: "An oppressive silence permeates the abandoned corridor" → GOOD: "The hallway is empty and quiet."
- Only get more descriptive if the player ASKS for more details. Otherwise, keep it tight.

PLAYER = CHARACTER IDENTITY RULE:
The player IS their character. They are the same person. Do NOT refer to "the player" and "their character" as separate entities. When addressing or narrating about the player, use the character's name or "you." Never say "Your character does X" or "The player's character sees Y" — just say "You do X" or "${playerCharacter.name} sees Y." The player is roleplaying AS their character — treat them as one and the same throughout all narration, NPC dialogue, and world responses.

CRITICAL ROLE DISTINCTION — WHO RESPONDS:
You are NOT a narrator who describes everything the player does. The WORLD responds to the player through its inhabitants, environment, and consequences.

RESPONSE HIERARCHY (follow strictly):
1. **NPCs & THE WORLD FIRST**: If the player is talking to someone, near someone, or interacting with something — the NPC, shopkeeper, guard, creature, bartender, stranger, etc. responds DIRECTLY with dialogue and reactions. Write their speech in quotes. The world is alive — let it speak.
2. **ENVIRONMENT SECOND**: If no NPC is involved but the player is exploring, moving, or interacting with the environment — describe what they find, see, hear, smell in plain, practical terms.
3. **NARRATOR LAST (SPARINGLY)**: The narrator voice ONLY appears when:
   - A dramatic shift happens (ambush, discovery, major plot moment)
   - Time passes significantly (travel montage, sleeping, waiting)
   - Combat resolution needs objective description (dice outcomes)
   - The player does something with world-altering consequences
   - There is genuinely no NPC or environmental element to respond

WHAT TO AVOID:
- Do NOT narrate every player action back to them ("You walk forward and look around" — boring, they already said that)
- Do NOT use narrator voice when an NPC could respond instead
- Do NOT describe the character's feelings or thoughts — that's the player's domain
- Do NOT add a narrator paragraph on top of an NPC interaction. If a guard speaks, just write the guard speaking. The narrator doesn't need to frame it.
- Keep narrator interventions to ~1 in 4 messages maximum. Most responses should be world/NPC-driven.

GOOD EXAMPLES:
Player: "I ask the bartender what's going on in town"
→ The bartender wipes a glass and leans forward. "You didn't hear? Three miners went into the eastern tunnels two days ago. Haven't come back. People are nervous."

Player: "I walk down the alley"
→ The alley narrows quickly. Trash bags stacked against one wall, fire escape overhead. A cat watches from a dumpster. At the far end, a door with no handle — just a keyhole.

Player: "I punch the guard"
→ [Narrator only if dice are involved] The swing connects — the guard staggers back, hand going to his jaw. His partner reaches for a radio.

BAD EXAMPLES (DO NOT DO THIS):
Player: "I look around the market"
→ ❌ "The narrator observes as you survey the bustling market. Stalls line both sides of the street, their colorful awnings..." (This is narrator describing everything — let the market speak for itself)
→ ✅ A woman shouts from behind a fruit cart: "Mangoes! Fresh today!" Across the way, a man in a leather apron hammers a horseshoe, sparks flying. The smell of grilled meat drifts from somewhere to the left.

SETTING DEFAULT: Unless the campaign description or player's RP explicitly establishes a fantasy, sci-fi, or historical setting, DEFAULT to MODERN REALISTIC settings. Think present-day Earth — cities, suburbs, highways, offices, parks, warehouses, apartments. Use contemporary language and references. Avoid medieval speech, fantasy creatures, or futuristic tech unless the player has clearly introduced them. The world should feel grounded and relatable.
${loreInstructions}
CORE RULES:
1. FREEDOM: Players can do ANYTHING — explore, fight, ignore objectives, goof around, split from group, travel beyond the current zone. NEVER railroad them.
2. POWER RESET: Characters are at Campaign Level ${playerCharacter.campaignLevel}. Their maximum usable power tier is ${maxAllowedTier}. If the player attempts abilities beyond this tier:
   - The ability fails harmlessly, OR
   - It causes minor backlash damage, OR  
   - The character feels their power "slip away" or "fizzle"
   Describe this naturally without breaking immersion.
3. DYNAMIC WORLD: React to player actions. If they start a fight, create an encounter. If they explore, describe discoveries. If they're creative, reward it narratively.
4. SCALING: Scale encounters based on party level and size. Create a mix of easy, moderate, and overwhelming encounters as the story demands.
5. TIME: Current time is ${timeOfDay}, Day ${dayCount}. Reflect this in descriptions (lighting, NPC availability, creature behavior).
6. You MUST respond with valid JSON (no markdown fences).
7. COMBAT INTENT vs OUTCOME: Player messages describe what they INTEND to do. If dice results are provided, they determine whether the action succeeds. Respect the dice outcome in your narration.${diceInstructions}

OUTPUT FORMAT (JSON):
{
  "narration": "Your world response (1-3 short paragraphs, mostly NPC dialogue and world reactions — keep language simple)",
  "xpGained": <number 0-50 based on action significance>,
  "hpChange": <number, negative for damage, positive for healing, 0 for none>,
  "advanceTime": <number 0-2, how many time periods to advance>,
  "newZone": <string or null if zone changes>,
  "encounterType": <"combat"|"social"|"exploration"|"rest"|null>,
  "itemsFound": [{"name": "item name", "type": "weapon|armor|potion|artifact|gem|misc", "rarity": "common|uncommon|rare|epic|legendary", "description": "brief description", "statBonus": {"stat": value}}] or [] if no items found,
  "npcUpdates": [
    {
      "isNew": true/false,
      "id": "existing NPC id (only if isNew is false)",
      "name": "NPC name",
      "role": "merchant|guard|innkeeper|civilian|quest_giver|enemy|ally|etc",
      "personality": "brief personality description",
      "appearance": "brief physical description",
      "backstory": "one-line backstory if new",
      "disposition": "friendly|neutral|wary|hostile|fearful|admiring",
      "trust_change": <number -10 to +10, how much trust changed this interaction>,
      "relationship_notes": "brief note about the interaction",
      "current_zone": "zone they're in now (if they moved)",
      "status": "alive|dead|departed|missing"
    }
  ] or [] if no NPC interactions
}

NPC PERSISTENCE RULES:
- When NPCs appear in your narration, include them in npcUpdates so they persist.
- For NEW named NPCs (shopkeepers, guards, strangers the player talks to), set isNew: true and give them a name, role, and personality.
- For EXISTING NPCs (listed in KNOWN NPCs below), set isNew: false and include their id.
- Update trust_change based on how the interaction went: positive for friendly exchanges, negative for hostility/rudeness.
- Only include NPCs who actually appeared or were affected in this interaction.
- Give NPCs memorable personalities — quirks, speech patterns, attitudes. Make them feel real.
- NPCs should remember past interactions based on their relationship data.

ITEMS & LOOT:
- When players explore, fight, trade, or search, you MAY reward them with items.
- Items should fit the narrative context (a cave might have gems, a defeated guard might drop a weapon).
- Rarity should scale with difficulty and campaign level. Early levels = mostly common/uncommon.
- Don't give items every turn — roughly 1 in 3-4 actions should yield loot, depending on context.
- If the player explicitly searches or loots, they should usually find something.

KNOWN NPCs IN THIS CAMPAIGN:
${Array.isArray(knownNpcs) && knownNpcs.length > 0
  ? knownNpcs.map((npc: any) => `- ${npc.name} (${npc.role}): ${npc.personality || 'No personality set'}. Disposition toward player: ${npc.disposition} (trust: ${npc.trust_level}). Zone: ${npc.current_zone || 'unknown'}. Last seen: Day ${npc.last_seen_day || '?'}. ${npc.backstory ? 'Backstory: ' + npc.backstory + '. ' : ''}${npc.relationship_notes ? 'Notes: ' + npc.relationship_notes : ''}`).join('\n')
  : 'No NPCs met yet. Create new ones naturally as the player interacts with the world.'}

NPC MOVEMENT & PRESENCE RULES:
- NPCs have LIVES. They don't stand in one spot forever. Between interactions, they move based on their role and personality.
- A merchant might travel between market zones. A guard patrols different areas. A wanderer drifts. A bartender stays at their bar.
- When the player enters a zone, consider which KNOWN NPCs would logically be there NOW based on their role, last known zone, and how many days have passed since last seen.
- If an NPC WOULD have moved since last seen, update their current_zone in npcUpdates. Use "current_zone" field.
- NPCs NOT in the player's current zone should NOT appear in dialogue unless the player asks about them or travels to their zone.
- If the player revisits a zone and an NPC has moved away, they simply aren't there. Another NPC might mention where they went.
- Some NPCs are STATIONARY (bartenders, shopkeepers at their shop, prisoners) — they stay put unless something dramatic happens.
- Some NPCs are MOBILE (travelers, guards, merchants, adventurers) — they naturally move between zones over days.
- When updating an NPC's zone, make it make sense for their role. A fisherman moves between the docks and the market, not to a dungeon.

When writing dialogue for KNOWN NPCs, stay consistent with their established personality and relationship. An NPC who is "hostile" should not suddenly be friendly without reason.

CONTEXT:
Zone: ${currentZone}
Party: ${partyContext}
Campaign: ${campaignDescription || 'An ongoing adventure'}
World State: ${JSON.stringify(worldState || {})}
Story Context: ${JSON.stringify(storyContext || {})}`;
  const itemsInfo = playerCharacter.weaponsItems ? `\nCharacter's Items (from sheet): ${playerCharacter.weaponsItems}` : '';
  const equippedCampaignItems = playerCharacter.equippedCampaignItems && playerCharacter.equippedCampaignItems.length > 0
    ? `\nCurrently Equipped Campaign Items: ${playerCharacter.equippedCampaignItems.map((i: any) => `${i.item_name} (${i.item_rarity} ${i.item_type}${i.description ? ' — ' + i.description : ''})`).join(', ')}`
    : '';

  const diceContext = diceResult
    ? `\n\n[DICE ROLL: ${diceResult.hit ? 'HIT' : 'MISS'} — Attack ${diceResult.attackTotal} vs Defense ${diceResult.defenseTotal}]`
    : defenseResult
    ? `\n\n[DEFENSE ROLL: ${defenseResult.success ? 'SUCCESS' : 'FAILED'} — Defense ${defenseResult.defenseTotal} vs Incoming ${defenseResult.incomingTotal}]`
    : '';

  const userMessage = `${playerCharacter.name} (Campaign Lv.${playerCharacter.campaignLevel}, HP: ${playerCharacter.hp}/${playerCharacter.hpMax}, Original Tier: ${playerCharacter.originalLevel}) acts:${itemsInfo}${equippedCampaignItems}

"${playerAction}"${diceContext}

Respond as the WORLD — let NPCs speak, environments react, and consequences unfold. Only use narrator voice if no NPC or environmental element can carry the response. If the character uses an equipped item, reference it naturally. You may reward items if the action warrants it.${diceResult ? (diceResult.hit ? ' The attack HIT — describe the impact.' : ' The attack MISSED — describe the failure.') : ''}${defenseResult ? (defenseResult.success ? ' The defense SUCCEEDED.' : ' The defense FAILED — the player takes the hit.') : ''}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMessages,
          { role: "user", content: userMessage },
        ],
        max_tokens: 1500,
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.error("Campaign narration API error:", response.status, rawText);
      throw new Error(`AI API returned ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Campaign narration parse error, raw:", rawText.substring(0, 200));
      throw new Error("Failed to parse AI response");
    }

    const content = data.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      // Strip thinking/reasoning tags the model may emit
      let cleaned = content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
        .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Last resort: try to extract JSON object from the noisy content
      const jsonMatch = content.match(/\{[\s\S]*"narration"\s*:\s*"[\s\S]*?\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
      }
      if (!parsed) {
        // Strip all tags and use whatever text remains as narration
        const stripped = content
          .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/gi, '')
          .replace(/<[^>]+>/gi, '')
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/^\s*\{[\s\S]*$/, '') // drop malformed JSON
          .trim();
        parsed = { narration: stripped || 'The world responds...', xpGained: 5, hpChange: 0, advanceTime: 0, newZone: null };
      }
    }

    return new Response(
      JSON.stringify({
        narration: parsed.narration || content,
        xpGained: typeof parsed.xpGained === 'number' ? Math.max(0, Math.min(50, parsed.xpGained)) : 5,
        hpChange: typeof parsed.hpChange === 'number' ? Math.max(-50, Math.min(30, parsed.hpChange)) : 0,
        advanceTime: typeof parsed.advanceTime === 'number' ? Math.max(0, Math.min(2, Math.floor(parsed.advanceTime))) : 0,
        newZone: typeof parsed.newZone === 'string' ? parsed.newZone : null,
        encounterType: parsed.encounterType || null,
        itemsFound: Array.isArray(parsed.itemsFound) ? parsed.itemsFound : [],
        npcUpdates: Array.isArray(parsed.npcUpdates) ? parsed.npcUpdates : [],
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign narration error:", error);
    return new Response(
      JSON.stringify({ narration: "The world responds to your actions...", xpGained: 5, hpChange: 0 }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
}
