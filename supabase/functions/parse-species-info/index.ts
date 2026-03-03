import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TEXT_LENGTH = 50000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text } = body;
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text content cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an advanced species/race information extractor for a fantasy/sci-fi roleplay game.
Your job is to deeply analyze the provided text and extract ALL of the following:

1. **Species/Race Info** — name, physiology, abilities, culture, home planet, lifespan, description.

2. **Sub-Races** — Any sub-races, variants, sub-species, clans, bloodlines, castes, or distinct sub-groups within the main species. For each sub-race extract:
   - name (required)
   - description
   - typical_physiology (how they physically differ from the main species)
   - typical_abilities (unique abilities or powers)
   - cultural_traits (cultural differences from the main species)

3. **Named Characters** — Any specific named individuals mentioned in the text who belong to or are associated with this species. For each character extract:
   - name (required)
   - race/species they belong to
   - sub_race (if they belong to a specific sub-race)
   - any powers or abilities mentioned
   - personality traits
   - lore/backstory details
   - home planet if mentioned
   - level estimate (1-100, based on how powerful they seem; default 50)
   - any weapons or items mentioned

4. **Story Elements** — Any narrative content, legends, historical events, myths, wars, or story arcs described in the text. For each story extract:
   - title (create a fitting title if none is given)
   - content (the narrative/story text, retold faithfully)
   - summary (1-2 sentence summary)
   - which characters are involved (by name)

5. **Relationships** — How the characters, species, and stories connect to each other.

Be thorough. Extract EVERY sub-race, even if only briefly mentioned. Extract EVERY named character, even minor ones. Extract EVERY story element, even brief legends or historical references. If a character is only mentioned by name with no details, still include them with just the name and species.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract all species, character, and story information from this text:\n\n${text}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_species_data',
              description: 'Extract species info, characters, and story elements from text',
              parameters: {
                type: 'object',
                properties: {
                  species: {
                    type: 'object',
                    description: 'The species/race information',
                    properties: {
                      name: { type: 'string', description: 'Species name' },
                      description: { type: 'string', description: 'General description' },
                      home_planet: { type: 'string', description: 'Home planet or region' },
                      typical_physiology: { type: 'string', description: 'Physical traits and biology' },
                      typical_abilities: { type: 'string', description: 'Common abilities' },
                      cultural_traits: { type: 'string', description: 'Culture and society' },
                      average_lifespan: { type: 'string', description: 'Typical lifespan' }
                    },
                    required: ['name']
                  },
                  sub_races: {
                    type: 'array',
                    description: 'Sub-races, variants, clans, bloodlines, or sub-groups within this species',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Sub-race name' },
                        description: { type: 'string', description: 'Description of this sub-race' },
                        typical_physiology: { type: 'string', description: 'Physical differences from main species' },
                        typical_abilities: { type: 'string', description: 'Unique abilities' },
                        cultural_traits: { type: 'string', description: 'Cultural differences' }
                      },
                      required: ['name']
                    }
                  },
                  characters: {
                    type: 'array',
                    description: 'Named characters found in the text',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Character name' },
                        race: { type: 'string', description: 'Species/race they belong to' },
                        powers: { type: 'string', description: 'Powers or abilities' },
                        abilities: { type: 'string', description: 'Skills and techniques' },
                        personality: { type: 'string', description: 'Personality traits' },
                        mentality: { type: 'string', description: 'Mental approach and mindset' },
                        lore: { type: 'string', description: 'Backstory and lore' },
                        home_planet: { type: 'string', description: 'Home planet' },
                        level: { type: 'number', description: 'Power level estimate 1-100' },
                        weapons_items: { type: 'string', description: 'Weapons or items' }
                      },
                      required: ['name']
                    }
                  },
                  stories: {
                    type: 'array',
                    description: 'Story elements, legends, historical events found in the text',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Story title' },
                        content: { type: 'string', description: 'Full story/narrative content' },
                        summary: { type: 'string', description: '1-2 sentence summary' },
                        character_names: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Names of characters involved in this story'
                        }
                      },
                      required: ['title', 'content']
                    }
                  }
                },
                required: ['species'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_species_data' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to process with AI');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'extract_species_data') {
      throw new Error('AI did not return expected tool call');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    // Return backward-compatible format plus new fields
    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData.species || extractedData,
        characters: extractedData.characters || [],
        stories: extractedData.stories || [],
        sub_races: extractedData.sub_races || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('parse-species-info error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
