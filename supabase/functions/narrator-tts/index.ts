import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Context-aware voice presets for the Dungeon Master narrator.
 * Each preset adjusts ElevenLabs voice_settings to match the scene mood.
 */
/**
 * Cinematic fantasy RPG narrator voice presets.
 * Calm, expressive, mostly soft — like a seasoned storyteller beside a fire.
 * Deliberate pacing, subtle emotion, atmospheric and immersive.
 * Tone shifts dynamically: curious in exploration, tense in danger,
 * vivid in combat, quiet in tragedy, relieved in victory.
 */
const VOICE_PRESETS: Record<string, {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}> = {
  // Exploration: curious, mysterious, observational — unveiling a hidden world
  exploration: {
    stability: 0.65,
    similarity_boost: 0.88,
    style: 0.22,
    speed: 0.82,
  },
  // Peaceful / reflective: soft, warm, unhurried — fireside storytelling
  peaceful: {
    stability: 0.78,
    similarity_boost: 0.92,
    style: 0.12,
    speed: 0.78,
  },
  // Danger / suspense: tense, cautious, restrained urgency — breath held
  danger: {
    stability: 0.55,
    similarity_boost: 0.88,
    style: 0.28,
    speed: 0.80,
  },
  // Combat: urgent, vivid, dramatic — cinematic action unfolding in real time
  combat: {
    stability: 0.48,
    similarity_boost: 0.85,
    style: 0.35,
    speed: 0.88,
  },
  // Tragic moments: quiet, heavy, emotionally weighted — silence between words
  tragic: {
    stability: 0.82,
    similarity_boost: 0.92,
    style: 0.08,
    speed: 0.72,
  },
  // Victory: measured pride or relief — not triumphant, but earned
  victory: {
    stability: 0.72,
    similarity_boost: 0.90,
    style: 0.18,
    speed: 0.80,
  },
  // NPC dialogue: more expressive, adopting character personality through tone
  npc: {
    stability: 0.42,
    similarity_boost: 0.82,
    style: 0.40,
    speed: 0.85,
  },
  // Default: calm, expressive, soft — the seasoned storyteller's natural voice
  default: {
    stability: 0.68,
    similarity_boost: 0.90,
    style: 0.18,
    speed: 0.80,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, context } = await req.json();
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

    // Select voice preset based on scene context
    const preset = VOICE_PRESETS[context as string] || VOICE_PRESETS.default;

    // Use Brian voice — calm, expressive, soft storyteller
    const selectedVoice = voiceId || "nPczCjzI2devNBz1zQrb";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.substring(0, 5000),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: preset.stability,
            similarity_boost: preset.similarity_boost,
            style: preset.style,
            use_speaker_boost: true,
            speed: preset.speed,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs API error:", response.status, errText);
      
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid ElevenLabs API key" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "TTS generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("narrator-tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
