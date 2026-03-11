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

/**
 * Build a short accent SFX prompt from a cue keyword.
 */
function buildAccentPrompt(cue: string): string {
  const accentMap: Record<string, string> = {
    // Movement & footsteps
    footsteps: "footsteps on stone floor, echoing steps, single person walking",
    footsteps_dirt: "footsteps on dirt path, crunching gravel, outdoor walking",
    footsteps_wood: "footsteps on wooden floorboards, creaking wood",
    running: "person running fast, urgent footsteps, heavy breathing",
    // Doors & mechanisms
    door_open: "heavy wooden door creaking open slowly, medieval door",
    door_slam: "heavy door slamming shut, echoing slam",
    lock: "metal lock clicking, key turning in lock mechanism",
    gate: "iron gate creaking open, rusty metal hinges",
    // Nature
    wind_gust: "sudden gust of wind blowing, whooshing breeze",
    thunder_crack: "single dramatic thunder crack, lightning strike",
    rain_start: "rain beginning to fall, first raindrops hitting ground",
    branches: "branches snapping underfoot, twigs breaking in forest",
    leaves: "leaves rustling in wind, foliage movement",
    water_splash: "splash in water, something entering water",
    river: "flowing river water, babbling stream sounds",
    // Combat & impact
    sword_draw: "sword being drawn from sheath, metallic ring",
    sword_clash: "metal swords clashing together, blade impact",
    arrow: "arrow whooshing through air, projectile flying",
    impact: "heavy blunt impact, physical hit, thud",
    explosion: "distant explosion, rumbling boom, debris",
    shield: "shield blocking attack, metal clang, defensive impact",
    // Magic & supernatural
    magic: "magical energy surge, mystical shimmer, arcane power",
    portal: "dimensional portal opening, swirling energy vortex",
    whisper: "eerie supernatural whisper, ghostly voice, ethereal",
    rumble: "deep ground rumbling, earthquake tremor, earth shaking",
    energy: "energy blast charging up, power surge building",
    // Animals & creatures
    growl: "deep animal growl, threatening beast, low snarl",
    roar: "loud creature roar, powerful beast cry",
    wings: "large wings flapping, creature taking flight",
    howl: "distant wolf howl, lonely canine cry at night",
    horse: "horse neighing, hooves stomping on ground",
    // Atmosphere
    fire_crackle: "campfire crackling, wood burning, warm flames",
    glass: "glass shattering, breaking glass, crystal smash",
    chains: "metal chains rattling, iron links clinking",
    bell: "distant bell tolling, single deep bell ring",
    crowd: "crowd murmuring, people reacting, gasps and chatter",
    scream: "distant scream of alarm, startled cry",
    collapse: "stone structure collapsing, rubble falling, crumbling",
    heartbeat: "tense heartbeat sound, rhythmic pulse, suspenseful",
  };

  return accentMap[cue] || `${cue} sound effect, short and clear`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, text, mode, cue } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Narration cue mode: generate a sound from a specific prompt + duration
    if (mode === 'narration_cue') {
      const { prompt: cuePrompt, duration: cueDuration } = await req.json().catch(() => ({ prompt: null, duration: null }));
      // Re-parse since we already consumed the body above — use the outer variables
      const finalPrompt = cuePrompt || text || 'ambient background sound';
      const finalDuration = Math.min(Math.max(cueDuration || 8, 2), 18);
      
      const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: finalPrompt,
          duration_seconds: finalDuration,
          prompt_influence: 0.45,
        }),
      });

      if (!response.ok) {
        console.error("ElevenLabs narration cue SFX error:", response.status);
        return new Response(JSON.stringify({ error: "Narration cue SFX failed" }), {
          status: response.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const audioBuffer = await response.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=14400",
        },
      });
    }

    // Accent mode: generate a short targeted SFX
    if (mode === 'accent' && cue) {
      const prompt = buildAccentPrompt(cue);
      const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: 3,
          prompt_influence: 0.5,
        }),
      });

      if (!response.ok) {
        console.error("ElevenLabs accent SFX error:", response.status);
        return new Response(JSON.stringify({ error: "Accent SFX failed" }), {
          status: response.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const audioBuffer = await response.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=14400",
        },
      });
    }

    // Standard ambient mode
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
