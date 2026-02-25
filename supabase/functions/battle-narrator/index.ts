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

    const systemPrompt = `You are an invisible narrator observing a battle. You describe what happens in plain, clear language that anyone can understand.

${frequencyInstructions}${envInstructions}

STYLE:
- 1-2 sentences normally, up to 3 if describing major environmental changes
- Use simple, direct language. No flowery vocabulary or overly poetic phrasing.
- Write like you're telling a friend what just happened — clear, punchy, easy to follow.
- Avoid fancy words when simple ones work. Say "hit" not "struck with devastating force." Say "moved" not "traversed."
- No exclamations. No hype commentary. Just observation.
- For environmental effects: be PRACTICAL — tell the defender what changed in plain terms.

EXAMPLES (normal):
"That one shook the ground."
"${opponent.name} noticed the shift too."
"Dust still floating where ${userCharacter.name} was standing."
"There's a crack in the stone now."

EXAMPLES (environmental effects):
"Smoke fills the area. ${opponent.name} can barely see a few feet ahead."
"Ice covers the floor — moving without slipping will be tough."
"The air feels heavier. Something changed."
"Lava is coming up through the cracks. Less safe ground now."`;

    // Distance context for narrator
    const distanceContext = currentDistance 
      ? `\nCurrent Distance: ${currentDistance.zone.toUpperCase()} range (~${currentDistance.meters}m apart)`
      : '';

    // Player-established arena details
    const arenaDetailsContext = playerArenaDetails && playerArenaDetails.length > 0
      ? `\nPlayer-established arena details (treat as canon for this battle):\n${playerArenaDetails.slice(-6).map(d => `- ${d}`).join('\n')}`
      : '';

    const userPrompt = `Battle Location: ${battleLocation}
Turn: ${turnNumber}${distanceContext}${arenaDetailsContext}

${userCharacter.name} (Tier ${userCharacter.level}) acted:
"${userAction}"

${opponent.name} (Tier ${opponent.level}) is about to respond.

Provide your narrator observation${environmentalEffects.length > 0 ? ', making sure to clearly describe the environmental hazards the defender must now contend with' : ''}${currentDistance ? `. If the fighters\' distance changed significantly, note it briefly.` : ''}.`;

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
- Use plain, easy-to-understand language. No overly dramatic or poetic wording.
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
- Use simple, direct language anyone can understand. No fancy vocabulary.
- Point out useful things: cover spots, high ground, obstacles, dangers.
- Mention what you'd notice if you were there: lighting, sounds, weather, ground surface.
- Do NOT mention the characters. Only describe the arena.
- Players can walk around, enter from different sides, or already be somewhere in this space.
- Keep it short and practical.

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
