import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, character, battleId, battleLocation } = await req.json();

    if (!action || !character) {
      return new Response(
        JSON.stringify({ error: 'Missing action or character data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingAbilities = character.abilities || '';
    const existingPowers = character.powers || '';
    const characterContext = `${existingAbilities}\n${existingPowers}`.toLowerCase();

    const prompt = `You are analyzing a battle action to detect if a character used a NEW technique, move, or ability that isn't already documented in their character sheet.

CHARACTER: ${character.name}
EXISTING POWERS: ${existingPowers || 'None documented'}
EXISTING ABILITIES/TECHNIQUES: ${existingAbilities || 'None documented'}
CHARACTER PERSONALITY: ${character.personality || 'Unknown'}
CHARACTER MENTALITY: ${character.mentality || 'Unknown'}

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

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, isNewTechnique: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
