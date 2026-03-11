import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Context-aware voice presets for the narrator.
 */
const VOICE_PRESETS: Record<string, {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}> = {
  exploration: { stability: 0.72, similarity_boost: 0.95, style: 0.08, speed: 1.15 },
  peaceful:    { stability: 0.80, similarity_boost: 0.96, style: 0.05, speed: 1.10 },
  danger:      { stability: 0.65, similarity_boost: 0.94, style: 0.12, speed: 1.15 },
  combat:      { stability: 0.58, similarity_boost: 0.92, style: 0.15, speed: 1.20 },
  tragic:      { stability: 0.82, similarity_boost: 0.96, style: 0.04, speed: 1.05 },
  victory:     { stability: 0.75, similarity_boost: 0.95, style: 0.08, speed: 1.15 },
  npc:         { stability: 0.55, similarity_boost: 0.90, style: 0.20, speed: 1.18 },
  default:     { stability: 0.74, similarity_boost: 0.95, style: 0.06, speed: 1.15 },
};

const NARRATOR_VOICE_ID = "BpjGufoPiobT79j2vtj4"; // Priyanka

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Multi-segment mode: narrator + NPC voices ──
    if (body.segments && Array.isArray(body.segments)) {
      const segments: Array<{
        text: string;
        voiceId?: string;
        voiceSettings?: { stability: number; similarity_boost: number; style: number; speed: number };
        context?: string;
      }> = body.segments;

      if (segments.length === 0) {
        return new Response(JSON.stringify({ error: "No segments provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate TTS for each segment in parallel
      const ttsPromises = segments.map(async (seg) => {
        const voiceId = seg.voiceId || NARRATOR_VOICE_ID;
        const preset = seg.voiceSettings || VOICE_PRESETS[seg.context as string] || VOICE_PRESETS.default;
        
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: seg.text.substring(0, 5000),
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

        if (!res.ok) {
          console.error(`Segment TTS error for voice ${voiceId}:`, res.status);
          return null;
        }
        return await res.arrayBuffer();
      });

      const audioBuffers = await Promise.all(ttsPromises);
      const validBuffers = audioBuffers.filter((b): b is ArrayBuffer => b !== null);

      if (validBuffers.length === 0) {
        return new Response(JSON.stringify({ error: "All TTS segments failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Concatenate all audio buffers into one response
      const totalLength = validBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of validBuffers) {
        combined.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      return new Response(combined.buffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ── Single text mode (backward compatible) ──
    const { text, voiceId, context } = body;

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preset = VOICE_PRESETS[context as string] || VOICE_PRESETS.default;
    const selectedVoice = voiceId || NARRATOR_VOICE_ID;

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
