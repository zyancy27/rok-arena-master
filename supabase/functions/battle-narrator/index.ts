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
  const systemPrompt = `You are writing how two characters naturally arrive at a specific real-world location for a fight. You are the NARRATOR — you describe the scene and how they show up. You do NOT write dialogue or inner thoughts for the characters.

THE LOCATION IS REAL AND SPECIFIC. The entrance MUST be shaped by this environment:
- If it's a rooftop → they climb up, take the elevator, land from a jump, etc.
- If it's an abandoned subway → they walk down the stairs, step off the platform, emerge from a tunnel
- If it's a forest → they push through brush, step out from behind trees, walk down a trail
- If it's a bridge → they walk from one end, climb up from underneath, arrive by vehicle
- If it's a spaceship → they walk through an airlock, step off a shuttle, float in through a breach

BANNED WORDS AND CONCEPTS:
- "materializes" "appears" "manifests" "emerges from nothing" "teleports in" (unless they literally have teleportation)
- "the arena" — this is NOT an arena. It's a real place. Call it what it is.
- "crackling with power" "radiating energy" "aura" — no generic power descriptions
- Do NOT describe their powers activating on arrival unless it's part of HOW they got there

HOW TO WRITE ENTRANCES:
- Each character arrives organically — walking, climbing, driving, flying (if they can), dropping in, already being there
- The entrance should feel like a scene from a movie, not a video game spawn
- Match their personality: cocky = casual stroll, serious = already waiting, wild = dramatic leap
- 1-3 sentences max per character. Plain language.
- You describe what an observer would SEE. No internal monologue, no dialogue.

NARRATOR VOICE RULES:
- You describe the scene and the characters' physical actions
- You do NOT write what characters say — they speak for themselves
- You do NOT describe what characters are thinking or feeling internally
- You observe and report, like a camera

OUTPUT FORMAT: Return a JSON object with "entrance1" and "entrance2" keys (and "entrance3" if a third character is provided).`;

  const userPrompt = `LOCATION: ${battleLocation}

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

Describe how each character naturally arrives at or is already present in this specific location. Make each entrance unique, environment-appropriate, and personality-driven. NO dialogue.`;

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
  const {
    campaignName,
    campaignDescription,
    location,
    timeOfDay,
    dayCount,
    partyMembers,
    worldState,
    storyContext,
    environmentTags,
    chosenLocation,
    campaignSeed,
  } = body;

  // Generate a unique intro seed to force variety
  const seed = campaignSeed || `${campaignName}-${Date.now()}`;
  const envTagsList = Array.isArray(environmentTags) && environmentTags.length > 0
    ? `\nEnvironment tags: ${environmentTags.join(', ')}`
    : '';
  const chosenLocNote = chosenLocation
    ? `\nChosen battlefield/world location: ${chosenLocation}`
    : '';
  const worldStateNote = worldState && Object.keys(worldState).length > 0
    ? `\nWorld state context: ${JSON.stringify(worldState)}`
    : '';
  const storyCtxNote = storyContext && Object.keys(storyContext).length > 0
    ? `\nStory context: ${JSON.stringify(storyContext)}`
    : '';

  const systemPrompt = `You are the Campaign Narrator for "Realm of Kings" — a persistent, freedom-focused narrative adventure mode.

UNIQUE EXPERIENCE SEED: "${seed}"
Use this seed as creative inspiration to make THIS campaign's opening feel completely different from any other. The seed should influence:
- The specific sensory details you choose (smells, sounds, textures, weather)
- The opening situation (mid-action, waking up, arriving, already there, interrupted)
- What NPCs or environmental elements are immediately present
- The "hook" or first interesting thing that catches the player's attention

VARIETY RULES (CRITICAL):
- NEVER start with "You wake up" or "You arrive at" — those are overused. Pick from dozens of possible openings:
  • Already mid-conversation with someone
  • A sound or event interrupts the calm
  • The player notices something strange/interesting immediately
  • An NPC approaches them first
  • They're in the middle of doing something mundane when the story begins
  • A commotion nearby draws attention
  • Weather or environmental event sets the mood
  • They overhear something important
- The opening should feel like dropping into a LIVING world that was already happening before they showed up
- Every campaign intro must feel like a unique experience — different pacing, different focus, different tone

LANGUAGE RULES (CRITICAL — APPLY TO EVERYTHING YOU WRITE):
- Write at a middle-school reading level. Use short, common words.
- No flowery descriptions, no poetic language, no dramatic vocabulary.
- Keep descriptions practical — tell the player what the place looks like and what's around them.
- BAD: "The air hangs heavy with the scent of aged timber and whispered secrets" → GOOD: "The place smells like old wood. It's quiet."
- Describe things the way a normal person would describe them to a friend.

PLAYER = CHARACTER IDENTITY RULE (CRITICAL — NEVER BREAK THIS):
- For SOLO campaigns (only ONE party member): The player IS their character. Use "you" to address them. Never say "your character."
- For MULTIPLAYER campaigns (multiple party members): NEVER use "you." Always refer to each character by their CHARACTER NAME. Each character is controlled by a different player. The narrator must NEVER generate actions, dialogue, or reactions for ANY player character. Only describe the environment, NPCs, and consequences. Each player decides their own character's response.
- If there is only ONE party member, use "you" throughout.
- If there are MULTIPLE party members, use character names throughout. Never address anyone as "you."

SETTING DEFAULT: Unless the campaign description explicitly establishes a fantasy, sci-fi, or historical setting, DEFAULT to MODERN REALISTIC settings. Think present-day Earth.

Your role:
- Set the scene for the opening of a new campaign — make it UNIQUE to this specific campaign
- Describe the environment briefly and clearly (2-4 short paragraphs max)
- Tell the characters what they see, hear, and can interact with
- Include at least ONE interesting NPC, event, or detail that immediately invites engagement
- NEVER list explicit options like "You could: A) go north, B) talk to the merchant, C) explore the cave." That breaks immersion.
- Instead, WEAVE hooks naturally into the scene description. Describe things happening around the characters that they might choose to engage with — a sound from an alley, an NPC doing something interesting, a notice on a wall, smoke rising in the distance. Let the players decide what catches their attention.
- The world should feel alive with things going on, not like a menu of choices.
- If there are multiple party members, mention ALL of them by name in the scene. Never generate actions or dialogue for any of them — just place them in the environment.
- IMPORTANT: Characters start with their powers RESET. They are at Campaign Level 1 with only basic foundational abilities. Describe this subtly.

Campaign: ${campaignName}
Description: ${campaignDescription || 'An adventure awaits.'}
Location: ${location}
Time: ${timeOfDay}
Day: ${dayCount || 1}
Party: ${partyMembers}${envTagsList}${chosenLocNote}${worldStateNote}${storyCtxNote}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a unique campaign opening for seed "${seed}". Make it feel completely different from any generic intro.` },
        ],
        max_tokens: 1000,
        temperature: 0.95,
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
    activeEnemies,
    narrativeSystemsContext,
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

  // Detect if this is a multiplayer campaign (more than one active character in partyContext)
  const partyNames = (partyContext || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const isMultiplayer = partyNames.length > 1;

  const systemPrompt = `You are the WORLD ENGINE for "Realm of Kings" — a persistent, freedom-focused adventure.

LANGUAGE RULES (CRITICAL — APPLY TO EVERYTHING YOU WRITE):
- Write at a middle-school reading level. Use short, common words.
- No flowery descriptions, no poetic language, no dramatic vocabulary.
- NPC dialogue should sound like real people talking — casual, natural, simple.
- Environment descriptions should be practical: what's there, what it looks like, what you can interact with.
- BAD: "The ancient edifice looms before you, its weathered facade bearing the scars of countless storms" → GOOD: "It's a big old building. The walls are cracked and the paint is peeling."
- BAD: "An oppressive silence permeates the abandoned corridor" → GOOD: "The hallway is empty and quiet."
- Only get more descriptive if the player ASKS for more details. Otherwise, keep it tight.

${isMultiplayer ? `MULTIPLAYER CHARACTER IDENTITY RULES (ABSOLUTE — VIOLATING THESE BREAKS THE GAME):
Multiple players are present. Each player controls exactly ONE character. 

⛔ HARD RULES — NEVER BREAK THESE:

1. NEVER USE "YOU" OR "YOUR": Always use the acting character's NAME. Every single time. No exceptions.
   - ✅ "${playerCharacter.name} picks up the rock."
   - ❌ "You pick up the rock."
   - ✅ "${playerCharacter.name} sees a merchant nearby."
   - ❌ "You see a merchant nearby."

2. NEVER GENERATE ACTIONS, DIALOGUE, EMOTIONS, OR REACTIONS FOR OTHER PLAYER CHARACTERS:
   - The ONLY character you may describe acting is ${playerCharacter.name} (the one who just sent a message).
   - ALL other characters in the party (${partyNames.filter((n: string) => n !== playerCharacter.name).join(', ')}) are OFF-LIMITS. You cannot:
     • Make them speak ("Dakota says..." ❌)
     • Make them move ("Dakota walks over..." ❌) 
     • Describe their emotions ("Dakota looks surprised..." ❌)
     • Describe their reactions ("Dakota nods..." ❌)
     • Include them in any action they didn't initiate
   - You CAN mention them as present in the scene ("${playerCharacter.name} is near Dakota and the others") but NEVER describe them doing anything.
   - If ${playerCharacter.name} speaks TO another player character, describe the words leaving their mouth but do NOT generate the other character's response. That player will respond on their own turn.

3. RESOLVE ONLY THE ACTING CHARACTER'S ACTION: When ${playerCharacter.name} acts, describe ONLY:
   - Environmental consequences of THEIR action
   - NPC reactions to THEIR action  
   - How the world responds to THEIR action
   Do NOT advance the story for other player characters. Do NOT describe what happens "meanwhile" with other characters.

4. Current party members: ${partyContext}
   Acting character: ${playerCharacter.name}
   Other player characters (DO NOT CONTROL): ${partyNames.filter((n: string) => n !== playerCharacter.name).join(', ')}`
: `PLAYER = CHARACTER IDENTITY RULE:
The player IS their character. They are the same person. Do NOT refer to "the player" and "their character" as separate entities. When addressing or narrating about the player, use the character's name or "you." Never say "Your character does X" or "The player's character sees Y" — just say "You do X" or "${playerCharacter.name} sees Y." The player is roleplaying AS their character — treat them as one and the same throughout all narration, NPC dialogue, and world responses.`}

ACTION CLASSIFICATION (CRITICAL — classify before processing):
When a player describes an action, classify it BEFORE responding:
- BASIC ACTIONS: walking, running, grabbing objects, inspecting environment, climbing, hiding, speaking, opening containers, looking around, breaking mundane objects, picking things up. These are NORMAL physical actions — respond naturally without triggering any power/ability logic. Example: "I grab a branch" → basic action, just describe picking it up.
- ABILITY/POWER ACTIONS: supernatural abilities, defined character powers, combat techniques, stat-based attacks, energy manipulation, anything beyond normal human capability. These may trigger dice rolls and power tier limits.
- Do NOT treat basic physical actions as special abilities. Walking is walking. Grabbing a rock is grabbing a rock. Only escalate to ability logic when the action explicitly involves powers or combat techniques.

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
NARRATOR DM PRINCIPLES (CRITICAL — apply to EVERY response):

PREPARATION WITH FLEXIBILITY:
- You understand the campaign premise, current arc, and likely next developments.
- You maintain story coherence while adapting to unexpected player choices.
- If the player diverges from the main thread, let them — but keep the world alive and story threads visible.

GUIDED FREEDOM (never railroad, never leave directionless):
- The world should ALWAYS contain things happening that the player MIGHT engage with — but NEVER present them as a list of options.
- NEVER say "You could: A) ..., B) ..., C) ..." or "You have a few options:" — that breaks immersion.
- Instead, SHOW things happening in the world that naturally invite engagement:
  • An NPC casually mentions something interesting
  • The environment has a notable detail that invites investigation
  • A time-sensitive element creates gentle urgency
  • An unresolved thread from earlier resurfaces naturally
  • A consequence of the player's earlier actions becomes visible
  • Something happens nearby — a shout, a crash, someone running past
- The player should feel surrounded by a living world with many possible threads to pull.
- If the player seems idle or unsure, have the world nudge them — an NPC approaches, something happens nearby.

WORLD ALIVENESS:
- NPCs have lives beyond the player. They do things off-screen. They have agendas.
- Weather changes. Hazards spread. Rumors move. Structures worsen or stabilize.
- Other groups pursue their own agendas. Areas change after the players leave.
- The world was happening BEFORE the player arrived and continues when they're not looking.

PACING AWARENESS:
- After sustained combat, give the player breathing room — atmospheric scenes, NPC interactions, discovery.
- After extended calm, build tension gradually — foreshadowing, environmental shifts, subtle danger signs.
- Match the player's energy. If they're exploring slowly, don't force urgency. If they're charging forward, keep up.
- Vary your response style: sometimes NPC dialogue carries the scene, sometimes environment, sometimes brief narrator observation.

CHARACTER-CENTERED STORYTELLING:
- Create situations that reveal WHO the character is, not just what happens to them.
- If the character has shown patterns (compassion, defiance, curiosity), let the world reflect those themes subtly.
- Use quiet moments for character depth. Use intense moments for character testing.
- Never describe the character's internal feelings — that's the player's domain.

MEANINGFUL CONSEQUENCES:
- Choices leave marks. NPCs remember. Environments change. Reputation builds.
- Not every choice is massive, but patterns accumulate.
- If the player helped someone, word may spread. If they destroyed something, it stays destroyed.
- Tie decisions to NPC trust, environment changes, and future encounters.

CLARITY:
- The player should always understand: where they are, what's happening, what seems important, what changed.
- Avoid vague scene progression. Reinforce the immediate situation clearly.
- After zone changes or major events, ground the player in the new reality.

FAIRNESS AND CONSISTENCY:
- If a threat is dangerous, keep it dangerous. Don't hand-wave consequences.
- If a clue exists, keep it meaningful. If a structure is unstable, maintain that state.
- NPCs behave consistently with their established personality and trust level.
- The world follows its own rules — don't change them arbitrarily.

STORY MOMENTUM (weave hooks naturally):
- Every response should leave the player thinking "I want to check out that thing."
- Weave the campaign description's themes and goals into the world organically.
- Keep at least 1-2 active story threads visible at all times through environment, NPCs, or consequences.

CORE RULES:
1. FREEDOM: Players can do ANYTHING — explore, fight, ignore objectives, goof around, split from group, travel beyond the current zone. NEVER railroad them. But always make the world interesting enough that they WANT to engage.
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
  "narration": "World response (1-3 short paragraphs, mostly NPC dialogue and world reactions — keep language simple).${isMultiplayer ? ` MULTIPLAYER: NEVER use 'you' or 'your'. Always use character names (${partyNames.join(', ')}).` : ''}",
  "xpGained": <number 0-50 based on action significance>,
  "hpChange": <number, negative for damage, positive for healing, 0 for none>,
  "advanceTime": <number 0-2, how many time periods to advance>,
  "newZone": <string or null if zone changes>,
  "encounterType": <"combat"|"social"|"exploration"|"rest"|null>,
  "sceneMap": {
    "locationLabel": "short name of the current scene location (e.g. 'Market Square', 'Dark Alley', 'Cave Entrance')",
    "zones": [
      {
        "id": "unique zone id (e.g. zone-1)",
        "label": "zone name (e.g. 'Market Stalls', 'Fountain Plaza')",
        "x": <number 0-100, center X position on grid>,
        "y": <number 0-100, center Y position on grid>,
        "width": <number 10-40, zone width>,
        "height": <number 10-40, zone height>,
        "terrain": <"open"|"cover"|"hazard"|"water"|"elevation"|"structure"|"vegetation">,
        "elevation": <"ground"|"elevated"|"high"|"underground"|null>,
        "description": "1 sentence describing what's in this zone"
      }
    ],
    "entities": [
      {
        "id": "entity id — use character name slug or NPC name slug",
        "name": "display name",
        "type": <"player"|"enemy"|"npc"|"object">,
        "zoneId": "which zone they're in",
        "color": "optional hex color (e.g. #ef4444 for enemies, #3b82f6 for NPCs)"
      }
    ],
    "hazards": [
      {
        "id": "hazard id",
        "label": "hazard name",
        "type": <"fire"|"electric"|"flood"|"collapse"|"debris"|"ice"|"generic">,
        "zoneId": "which zone the hazard is in",
        "radius": <number 3-10>
      }
    ],
    "features": [
      {
        "id": "feature id",
        "label": "feature name (e.g. 'Wooden Cart', 'Stone Pillar')",
        "type": <"structure"|"cover"|"hazard"|"water"|"vegetation"|"vehicle"|"platform"|"crater">,
        "zoneId": "which zone this feature is in"
      }
    ]
  },
  "itemsFound": [{"name": "item name", "type": "weapon|armor|potion|artifact|gem|misc", "rarity": "common|uncommon|rare|epic|legendary", "description": "brief description", "statBonus": {"stat": value}}] or [] if no items picked up,
  "itemsUsed": [{"name": "exact item name that was consumed/given away/used up", "reason": "consumed|given|dropped|destroyed"}] or [] if no items were used up,
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
  ] or [] if no NPC interactions,
  "enemySpawned": {
    "name": "Enemy name",
    "tier": <number 1-7, scaled to party level and story context>,
    "hp": <number, enemy hit points — scale with tier: T1=30-50, T2=50-80, T3=80-120, T4=120-180, T5=180-250, T6=250-400, T7=50>,
    "description": "1-2 sentence description of the enemy — appearance, weapon, behavior",
    "abilities": "brief summary of what this enemy can do in combat",
    "weakness": "a hint at what might work well against them (optional but encouraged)",
    "count": <number 1-5, how many of this enemy appear — default 1>,
    "behaviorProfile": <"aggressive"|"defensive"|"cowardly"|"ambusher"|"tactical" — determines flee/hide behavior>
  } or null if no NEW enemy appears,
  "enemyUpdates": [
    {
      "id": "enemy UUID from ACTIVE ENEMIES list",
      "hpChange": <number, negative for damage taken, positive for healing — REQUIRED when player attacks>,
      "status": <"active"|"defeated"|"fled"|"hiding" — change status when appropriate>,
      "lastAction": "brief description of what the enemy did this turn (attacked, dodged, taunted, tried to flee, etc.)"
    }
  ] or [] if no active enemy changes
}

SCENE MAP RULES (CRITICAL — generate with EVERY response):
- The sceneMap represents the CURRENT state of the scene as a top-down tactical view.
- Generate 3-6 zones that represent distinct areas of the current location (rooms, sections, landmarks).
- Place ALL relevant entities: the player character, active enemies, notable NPCs in the scene, and important objects.
- Place zones so they tile the 0-100 grid logically. Adjacent areas should have adjacent coordinates.
- Update entity positions when they move between zones. If the player walks from the market to an alley, move their entity.
- Add/remove hazards as the scene evolves. Fire spreads, water recedes, debris accumulates.
- Add features that provide tactical information: cover spots, structures, interactable objects.
- The map should help the player visualize WHERE everything is in relation to each other.
- When the zone changes (newZone is set), generate a completely new map layout for the new location.
- When the zone stays the same, UPDATE the existing map — move entities, add/remove hazards, but keep the same zone layout unless something dramatic changed it.
- The player entity id should always be "player". Enemy entities should use their enemy id from the ACTIVE ENEMIES list.
- Keep zone labels short and descriptive (2-4 words max).

ENEMY CREATION RULES:
- You CAN and SHOULD create enemies when the story calls for it — ambushes, hostile creatures, bandits, monsters, aggressive NPCs, etc.
- Enemies can appear from: player actions (picking a fight, trespassing), story progression (ambush, guard patrol), exploration (wild creatures, dungeon denizens), or NPC hostility escalating.
- Enemy tier should NEVER exceed the party's max allowed tier (${maxAllowedTier}). Scale enemies to be challenging but fair.
- For groups of weak enemies, use count > 1 with lower tier. For a boss, use count 1 with higher tier.
- Give enemies personality — a bandit who taunts, a creature that circles warily, a guard who warns before attacking.
- Enemies can also be existing NPCs whose disposition turned hostile. In that case, include them in BOTH npcUpdates (with disposition: "hostile") AND enemySpawned.
- Don't spawn enemies every turn. Enemies appear when the narrative demands it — roughly 1 in 4-6 actions in dangerous areas, less in safe zones.

ENEMY COMBAT LOOP (CRITICAL — when ACTIVE ENEMIES exist):
- When the player attacks an active enemy, you MUST include an enemyUpdates entry with the enemy's id and a negative hpChange.
- Damage should be proportional to the attack type, dice result, and tier difference. A powerful hit on a weak enemy does more.
- If dice say HIT: apply meaningful damage (10-40% of their max HP depending on attack power). If dice say MISS: hpChange = 0.
- ENEMY RETALIATION IS MANDATORY: After EVERY player attack (whether hit or miss), the enemy MUST counter-attack or take an aggressive action in the SAME turn. Describe the enemy striking back, lunging, retaliating, charging, or making a threatening move. Apply negative hpChange to the PLAYER for enemy attacks. Enemies do NOT passively take hits — they always fight back.
- The enemy's counter-attack damage should scale with their tier: T1=2-5, T2=4-8, T3=6-12, T4=8-16, T5=10-20, T6=12-25, T7=15-30.
- Even if the player's attack missed, the enemy still acts aggressively — they press the advantage, taunt, reposition for a better strike, or launch their own attack.
- Enemies should feel DANGEROUS. Players should fear engaging them. Make every combat exchange feel like a real fight where both sides are actively trying to win.
- ENEMY BEHAVIOR by profile:
  • "aggressive" — attacks relentlessly, ALWAYS counter-attacks with full force, never flees, fights to the death. Hits HARD.
  • "defensive" — blocks/dodges first, then counter-attacks. Still retaliates every turn. Retreats at low HP (<20%).
  • "cowardly" — weaker counter-attacks but still fights back. Flees when HP drops below 40%, may drop loot while running.
  • "ambusher" — hits hard from stealth, if HP drops below 30% goes to "hiding" status to attack again later with a surprise strike.
  • "tactical" — adapts strategy, flanks, uses the environment. Counter-attacks intelligently. May flee at <25% HP if losing, regroups with allies.
- When an enemy's HP reaches 0 or below, set status to "defeated". Give XP for the kill.
- When an enemy flees, set status to "fled". They're gone from combat but may reappear later.
- When an enemy hides, set status to "hiding". They disappear but will ambush later. The narrator should bring them back after 2-4 player turns.
- Hiding enemies should re-emerge naturally: "A shadow moves in the rafters" → enemy attacks from hiding on next turn.
- When ALL active enemies are defeated/fled, combat ends. Describe the aftermath and any loot.
- If the player does ANYTHING other than fight while active enemies are present, the enemies STILL ACT — they attack the player, move closer, try to flank, or take advantage of the distraction. Enemies don't wait politely.

ITEM PICKUP RULES (CRITICAL):
- When a player says they grab, pick up, take, pocket, collect, loot, or acquire ANYTHING — add it to itemsFound. This includes:
  • Objects from the environment (a rock, a stick, a newspaper, a bottle, keys, a pen)
  • Items from defeated enemies (weapons, armor, personal belongings)
  • Things NPCs give them or they buy/trade for
  • Random stuff they find interesting (a shiny coin, a strange feather, a torn note)
- Items do NOT need to have a clear purpose. If the player wants to grab a random coffee mug from a desk, LET THEM. Add it as type "misc", rarity "common".
- The world is full of things to interact with. When describing environments, include tangible objects the player could grab.
- For mundane items: type "misc", rarity "common", no statBonus. Description should be brief and flavorful.
- For useful items: assign appropriate type, rarity, and optional statBonus.
- For items too large or heavy to pocket, consider the character's STRENGTH stat (${playerCharacter.strengthStat ?? 50}/100):
  • Strength 0-20: Can barely carry a heavy backpack. Anything over ~15 kg is a struggle.
  • Strength 21-50: Average person. Can carry moderate loads, drag heavy objects short distances.
  • Strength 51-75: Strong. Can lift furniture, carry another person, haul heavy crates.
  • Strength 76-100: Superhuman range. Can carry massive objects, flip cars, drag boulders.
  • If the item is within the character's strength capability, add it to itemsFound and narrate them carrying/transporting it.
  • If the item is TOO heavy even for their strength, do NOT add it to itemsFound. Instead, narrate the struggle and suggest transport options (a cart, a vehicle, hiring help, dragging it). The player must arrange transport before the item enters their inventory.
  • CRITICAL: Items too big for the inventory bag that the player is actively carrying/transporting are TEMPORARY. If the player does something else (enters combat, travels to a new zone, rests, or stops paying attention to the item), the oversized item is DROPPED automatically. Include it in itemsUsed with reason "dropped" and narrate it being left behind.
  • Mark oversized items in their description: e.g., "Heavy steel beam — carrying by hand, will drop if you stop holding it"
- After combat victories, always mention lootable items on defeated enemies — the player can choose to grab them.

ACTIVE ENEMIES IN THIS COMBAT:
${Array.isArray(activeEnemies) && activeEnemies.length > 0
  ? activeEnemies.map((e: any) => `- [ID: ${e.id}] ${e.name} (Tier ${e.tier}, HP: ${e.hp}/${e.hp_max}, Status: ${e.status}, Profile: ${e.behavior_profile || 'aggressive'}${e.last_action ? ', Last action: ' + e.last_action : ''}): ${e.description || 'No description'}. Abilities: ${e.abilities || 'basic attacks'}${e.weakness ? '. Weakness: ' + e.weakness : ''}`).join('\n')
  : 'No active enemies. Create new ones only if the story demands it.'}

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

INVENTORY TRACKING (CRITICAL — ENFORCE STRICTLY):
- The player's FULL inventory is listed below. They can ONLY use, consume, give away, or reference items that appear in this list.
- If the player tries to use an item they do NOT have, the action FAILS. Describe it naturally: "You reach for it but realize you don't have one" or "You check your bag but can't find it."
- Do NOT let the player invent items they don't possess. If they say "I throw a grenade" but have no grenade, the action fails.
- When a player USES or CONSUMES a single-use item (potion, scroll, bomb, food, etc.), add it to "itemsUsed" in your response so it gets removed from their inventory.
- When a player GIVES an item to an NPC or drops it, also add it to "itemsUsed".
- Weapons, armor, and reusable equipment are NOT consumed when used — only single-use consumables.
- Items from the character sheet (type: "personal") are permanent innate equipment — they are NEVER consumed or lost.
- Be strict but fair. If the player has a "healing potion" and drinks it, consume it. If they have a "sword" and swing it, don't consume it.

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

${isMultiplayer ? `⛔ FINAL CHECK — MULTIPLAYER (re-read before responding):
1. Replace ALL "you"/"your" with "${playerCharacter.name}" or "${playerCharacter.name}'s"
2. Delete ANY sentence where ${partyNames.filter((n: string) => n !== playerCharacter.name).join(' or ')} speaks, acts, moves, reacts, or emotes
3. Only describe: environment + NPCs + consequences of ${playerCharacter.name}'s action
` : ''}CONTEXT:
Zone: ${currentZone}
Party: ${partyContext}
Campaign: ${campaignDescription || 'An ongoing adventure'}
World State: ${JSON.stringify(worldState || {})}
Story Context: ${JSON.stringify(storyContext || {})}${narrativeSystemsContext ? `\n\n${narrativeSystemsContext}` : ''}`;
  const itemsInfo = playerCharacter.weaponsItems ? `\nCharacter's Items (from sheet, type: personal — NEVER consumed): ${playerCharacter.weaponsItems}` : '';
  const allCampaignItems = playerCharacter.allCampaignItems && playerCharacter.allCampaignItems.length > 0
    ? `\nFULL CAMPAIGN INVENTORY: ${playerCharacter.allCampaignItems.map((i: any) => `${i.item_name} (${i.item_rarity} ${i.item_type}${i.is_equipped ? ', equipped' : ''}${i.description ? ' — ' + i.description : ''})`).join(', ')}`
    : '\nFULL CAMPAIGN INVENTORY: Empty — no items found yet.';
  const equippedCampaignItems = playerCharacter.equippedCampaignItems && playerCharacter.equippedCampaignItems.length > 0
    ? `\nCurrently Equipped Campaign Items: ${playerCharacter.equippedCampaignItems.map((i: any) => `${i.item_name} (${i.item_rarity} ${i.item_type}${i.description ? ' — ' + i.description : ''})`).join(', ')}`
    : '';

  const diceContext = diceResult
    ? `\n\n[DICE ROLL: ${diceResult.hit ? 'HIT' : 'MISS'} — Attack ${diceResult.attackTotal} vs Defense ${diceResult.defenseTotal}]`
    : defenseResult
    ? `\n\n[DEFENSE ROLL: ${defenseResult.success ? 'SUCCESS' : 'FAILED'} — Defense ${defenseResult.defenseTotal} vs Incoming ${defenseResult.incomingTotal}]`
    : '';

  const userMessage = `${playerCharacter.name} (Campaign Lv.${playerCharacter.campaignLevel}, HP: ${playerCharacter.hp}/${playerCharacter.hpMax}, Original Tier: ${playerCharacter.originalLevel}) acts:${itemsInfo}${allCampaignItems}${equippedCampaignItems}

"${playerAction}"${diceContext}

${isMultiplayer ? `MULTIPLAYER: Respond using "${playerCharacter.name}" — NEVER "you". Do NOT describe other player characters acting.` : ''}Respond as the WORLD — let NPCs speak, environments react, and consequences unfold. Only use narrator voice if no NPC or environmental element can carry the response. If the character uses an equipped item, reference it naturally. You may reward items if the action warrants it.${diceResult ? (diceResult.hit ? ' The attack HIT — describe the impact.' : ' The attack MISSED — describe the failure.') : ''}${defenseResult ? (defenseResult.success ? ' The defense SUCCEEDED.' : ' The defense FAILED — the player takes the hit.') : ''}`;

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
        max_tokens: 2000,
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
        narration: (typeof parsed.narration === 'string' && parsed.narration.trim()) ? parsed.narration : 'The world responds to your actions...',
        xpGained: typeof parsed.xpGained === 'number' ? Math.max(0, Math.min(50, parsed.xpGained)) : 5,
        hpChange: typeof parsed.hpChange === 'number' ? Math.max(-50, Math.min(30, parsed.hpChange)) : 0,
        advanceTime: typeof parsed.advanceTime === 'number' ? Math.max(0, Math.min(2, Math.floor(parsed.advanceTime))) : 0,
        newZone: typeof parsed.newZone === 'string' ? parsed.newZone : null,
        encounterType: parsed.encounterType || null,
        sceneMap: parsed.sceneMap && typeof parsed.sceneMap === 'object' ? parsed.sceneMap : null,
        itemsFound: Array.isArray(parsed.itemsFound) ? parsed.itemsFound : [],
        itemsUsed: Array.isArray(parsed.itemsUsed) ? parsed.itemsUsed : [],
        npcUpdates: Array.isArray(parsed.npcUpdates) ? parsed.npcUpdates : [],
        enemySpawned: parsed.enemySpawned && typeof parsed.enemySpawned === 'object' && parsed.enemySpawned.name ? parsed.enemySpawned : null,
        enemyUpdates: Array.isArray(parsed.enemyUpdates) ? parsed.enemyUpdates : [],
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
