import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Context-aware voice presets for the Dungeon Master narrator.
 * Each preset adjusts ElevenLabs voice_settings to match the scene mood.
 */
const VOICE_PRESETS: Record<string, {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}> = {
  // Exploration: mysterious, measured, inviting curiosity
  exploration: {
    stability: 0.55,
    similarity_boost: 0.75,
    style: 0.35,
    speed: 0.90,
  },
  // Peaceful / reflective moments: soft, gentle, slow
  peaceful: {
    stability: 0.70,
    similarity_boost: 0.80,
    style: 0.20,
    speed: 0.85,
  },
  // Danger / suspense: tense, slightly unstable, deliberate
  danger: {
    stability: 0.40,
    similarity_boost: 0.70,
    style: 0.50,
    speed: 0.88,
  },
  // Combat: energetic, cinematic, faster pace
  combat: {
    stability: 0.35,
    similarity_boost: 0.65,
    style: 0.60,
    speed: 1.05,
  },
  // Victory / triumph: warm, grounded, slightly elevated
  victory: {
    stability: 0.60,
    similarity_boost: 0.80,
    style: 0.45,
    speed: 0.92,
  },
  // NPC dialogue: expressive, character-driven
  npc: {
    stability: 0.30,
    similarity_boost: 0.60,
    style: 0.65,
    speed: 0.95,
  },
  // Default / general narration: balanced storyteller
  default: {
    stability: 0.50,
    similarity_boost: 0.75,
    style: 0.40,
    speed: 0.93,
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

    // Use George voice by default (deep, authoritative narrator voice)
    const selectedVoice = voiceId || "JBFqnCBsd6RMkjVDRZzb";

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
