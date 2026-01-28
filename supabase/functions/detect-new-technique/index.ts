import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation constants
const MAX_ACTION_LENGTH = 5000;
const MAX_ABILITIES_LENGTH = 5000;
const MAX_NAME_LENGTH = 100;
const MAX_LOCATION_LENGTH = 500;

interface TechniqueRequest {
  action: string;
  character: {
    name: string;
    abilities?: string | null;
    powers?: string | null;
    personality?: string | null;
    mentality?: string | null;
  };
  battleId?: string;
  battleLocation?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', isNewTechnique: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', isNewTechnique: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let requestData: TechniqueRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', isNewTechnique: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, character, battleId, battleLocation } = requestData;

    // Validate action
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'action is required', isNewTechnique: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action.length > MAX_ACTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `action exceeds maximum length of ${MAX_ACTION_LENGTH} characters`, isNewTechnique: false }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate character
    if (!character || typeof character !== 'object') {
      return new Response(
        JSON.stringify({ error: 'character object is required', isNewTechnique: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!character.name || typeof character.name !== 'string' || character.name.length > MAX_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: `character.name is required and must be under ${MAX_NAME_LENGTH} characters`, isNewTechnique: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate optional fields
    if (battleLocation && (typeof battleLocation !== 'string' || battleLocation.length > MAX_LOCATION_LENGTH)) {
      return new Response(
        JSON.stringify({ error: `battleLocation must be under ${MAX_LOCATION_LENGTH} characters`, isNewTechnique: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Sanitize and truncate inputs
    const existingAbilities = (character.abilities || '').slice(0, MAX_ABILITIES_LENGTH);
    const existingPowers = (character.powers || '').slice(0, MAX_ABILITIES_LENGTH);

    const prompt = `You are analyzing a battle action to detect if a character used a NEW technique, move, or ability that isn't already documented in their character sheet.

CHARACTER: ${character.name}
EXISTING POWERS: ${existingPowers || 'None documented'}
EXISTING ABILITIES/TECHNIQUES: ${existingAbilities || 'None documented'}
CHARACTER PERSONALITY: ${(character.personality || 'Unknown').slice(0, 500)}
CHARACTER MENTALITY: ${(character.mentality || 'Unknown').slice(0, 500)}

BATTLE ACTION TAKEN:
"${action}"

TASK: Analyze if this action contains a NEW named technique, special move, or ability that:
1. Is NOT already mentioned in their existing powers/abilities
2. Makes sense given their established powers and personality
3. Is specific enough to be catalogued (not just "punched" or "dodged")

IMPORTANT: Only identify techniques that are:
- Named moves (e.g., "Dragon's Fury Strike", "Shadow Step", "Crimson Barrage")
- Special applications of their powers (e.g., "compressed his fire into a laser beam")
- Signature combos or finishers
- Unique defensive techniques

DO NOT flag basic actions like running, punching, blocking, jumping unless they have a special twist.

Respond in JSON format:
{
  "isNewTechnique": boolean,
  "techniqueName": string or null,
  "techniqueDescription": string or null,
  "reasoning": string
}

If it's a new technique, provide a concise name and 1-2 sentence description. If the action doesn't contain anything new or notable, set isNewTechnique to false.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing battle descriptions and identifying new techniques. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', isNewTechnique: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted', isNewTechnique: false }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { isNewTechnique: false };
    } catch {
      result = { isNewTechnique: false, reasoning: 'Failed to parse AI response' };
    }

    // Add battle context if it's a new technique
    if (result.isNewTechnique && result.techniqueName) {
      const today = new Date().toISOString().split('T')[0];
      result.battleContext = {
        date: today,
        battleId: battleId || 'unknown',
        location: battleLocation || 'Unknown Location'
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error detecting technique:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request', isNewTechnique: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
