import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Map scene context + location keywords to immersive ambient sound prompts.
 */
function buildAmbientPrompt(context: string, text: string): string {
  const t = text.toLowerCase();

  // Location-specific ambience
  if (/\b(cave|cavern|underground|tunnel|mine)\b/.test(t)) {
    return "dark dripping cave ambience, distant echoes, water drops on stone, subtle underground wind";
  }
  if (/\b(forest|woods|trees|grove|jungle|thicket)\b/.test(t)) {
    if (context === 'danger' || context === 'combat') {
      return "dark forest at night, wind through trees, distant growling, snapping branches, tense atmosphere";
    }
    return "peaceful forest ambience, birds singing, gentle wind through leaves, distant stream, nature sounds";
  }
  if (/\b(ocean|sea|beach|shore|coast|waves|harbor|port|dock)\b/.test(t)) {
    return "ocean waves crashing on shore, seagulls, gentle coastal wind, nautical ambience";
  }
  if (/\b(rain|storm|thunder|lightning)\b/.test(t)) {
    return "heavy rain and thunder storm, lightning cracks, wind howling, rain hitting surfaces";
  }
  if (/\b(desert|sand|dune|wasteland|arid)\b/.test(t)) {
    return "desert wind ambience, sand blowing, hot dry atmosphere, distant hawk cry";
  }
  if (/\b(city|town|village|market|tavern|inn|street|plaza)\b/.test(t)) {
    if (/\b(tavern|inn)\b/.test(t)) {
      return "medieval tavern ambience, crackling fireplace, murmuring crowd, clinking glasses, warm indoor atmosphere";
    }
    return "medieval town ambience, distant crowd chatter, horse hooves on cobblestone, church bells";
  }
  if (/\b(castle|throne|hall|palace|fortress|tower|dungeon)\b/.test(t)) {
    return "castle interior ambience, echoing stone halls, torch crackling, distant metal clanking, medieval atmosphere";
  }
  if (/\b(mountain|peak|cliff|summit|ridge|highland)\b/.test(t)) {
    return "mountain wind ambience, howling gusts at high altitude, distant eagle cry, cold atmosphere";
  }
  if (/\b(swamp|marsh|bog|wetland|mire)\b/.test(t)) {
    return "swamp ambience, frogs croaking, insects buzzing, bubbling mud, eerie mist atmosphere";
  }
  if (/\b(snow|ice|frozen|winter|blizzard|glacier|tundra)\b/.test(t)) {
    return "frozen tundra ambience, howling blizzard wind, ice cracking, cold desolate atmosphere";
  }
  if (/\b(ruins|ancient|temple|shrine|abandoned|desolate)\b/.test(t)) {
    return "ancient ruins ambience, wind through crumbling stone, distant rumbling, eerie mystical atmosphere";
  }
  if (/\b(space|void|cosmic|star|nebula|orbit)\b/.test(t)) {
    return "deep space ambience, low frequency cosmic hum, distant radio static, ethereal atmosphere";
  }
  if (/\b(fire|flame|lava|volcanic|eruption|inferno)\b/.test(t)) {
    return "volcanic landscape, bubbling lava, crackling fire, intense heat haze, rumbling earth";
  }

  // Context-based fallbacks
  switch (context) {
    case 'combat':
      return "intense battle ambience, clashing metal, war drums in distance, tense dramatic atmosphere";
    case 'danger':
      return "dark suspenseful ambience, low rumbling, ominous wind, creaking, tense atmosphere";
    case 'peaceful':
      return "gentle peaceful ambience, soft wind, distant birdsong, calm serene atmosphere";
    case 'tragic':
      return "somber quiet ambience, gentle wind, distant mournful tone, melancholic atmosphere";
    case 'victory':
      return "triumphant atmosphere, distant cheering crowd, uplifting wind, celebratory ambience";
    case 'exploration':
      return "mysterious exploration ambience, gentle wind, distant unknown sounds, curious atmosphere";
    case 'npc':
      return "indoor conversation ambience, gentle background activity, warm atmosphere";
    default:
      return "fantasy world ambience, gentle wind, distant natural sounds, atmospheric background";
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, text } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildAmbientPrompt(context || 'default', text);

    const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: 18,
        prompt_influence: 0.35,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs SFX error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "SFX generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=7200",
      },
    });
  } catch (e) {
    console.error("narrator-ambient-sfx error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
