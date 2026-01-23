import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedData {
  characters: Array<{
    name: string;
    race?: string;
    subRace?: string;
    age?: number;
    homePlanet?: string;
    powers?: string;
    abilities?: string;
    personality?: string;
    mentality?: string;
    lore?: string;
  }>;
  planets: Array<{
    name: string;
    description?: string;
    gravity?: number;
    features?: string;
  }>;
  races: Array<{
    name: string;
    description?: string;
    homePlanet?: string;
    typicalPhysiology?: string;
    typicalAbilities?: string;
    culturalTraits?: string;
    averageLifespan?: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, extractType } = await req.json();
    
    if (!documentContent) {
      return new Response(
        JSON.stringify({ error: "Document content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a lore extraction assistant. Your job is to parse text documents containing worldbuilding notes, character descriptions, and fictional lore.

Extract the following types of information when present:

1. CHARACTERS - Individual named characters with their traits
2. PLANETS/WORLDS - Named locations with their properties
3. RACES/SPECIES - Groups of beings with shared characteristics

For each extraction, be thorough but only include what is explicitly mentioned or strongly implied.

IMPORTANT GUIDELINES:
- If a value isn't mentioned, omit that field entirely
- For stats/numbers, only include if explicitly stated
- Keep descriptions concise but complete
- Separate different entities clearly
- For races, capture group-level traits, not individual character traits

Return your findings as a JSON object with this structure:
{
  "characters": [...],
  "planets": [...],
  "races": [...]
}`;

    const userPrompt = extractType === 'all' 
      ? `Parse this lore document and extract all characters, planets, and races:\n\n${documentContent}`
      : `Parse this lore document and extract only ${extractType}:\n\n${documentContent}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lore_data",
              description: "Extract structured lore data from the document",
              parameters: {
                type: "object",
                properties: {
                  characters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        race: { type: "string" },
                        subRace: { type: "string" },
                        age: { type: "number" },
                        homePlanet: { type: "string" },
                        powers: { type: "string" },
                        abilities: { type: "string" },
                        personality: { type: "string" },
                        mentality: { type: "string" },
                        lore: { type: "string" },
                      },
                      required: ["name"],
                    },
                  },
                  planets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        gravity: { type: "number" },
                        features: { type: "string" },
                      },
                      required: ["name"],
                    },
                  },
                  races: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        homePlanet: { type: "string" },
                        typicalPhysiology: { type: "string" },
                        typicalAbilities: { type: "string" },
                        culturalTraits: { type: "string" },
                        averageLifespan: { type: "string" },
                      },
                      required: ["name"],
                    },
                  },
                },
                required: ["characters", "planets", "races"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_lore_data" } },
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
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_lore_data") {
      throw new Error("Failed to extract lore data");
    }

    const extractedData: ExtractedData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse lore document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
