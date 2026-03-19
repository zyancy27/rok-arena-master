/**
 * ExpressionDeriver
 *
 * Derives an ExpressionPacket from runtime pipeline data + message text.
 * This is the NarratorBrain's expression authority — NPCs never self-derive.
 *
 * Two modes:
 *  1. `fromPipeline` — full runtime packets available (live generation)
 *  2. `fromText`     — text-only analysis (persisted messages w/o packets)
 */

import {
  DEFAULT_EXPRESSION,
  type BiomeTag,
  type EmotionType,
  type ExpressionPacket,
  type VocalTone,
} from './ExpressionPacket';
import { EmotionalMomentumTracker } from './EmotionalMomentumTracker';
import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';
import type { ChatSpeakerRole } from '@/systems/chat/presentation/SpeakerPresentationProfile';

/* ── Keyword maps ── */

const EMOTION_KEYWORDS: Record<EmotionType, RegExp> = {
  angry: /\b(fury|furious|rage|rag(ing|ed)|angry|anger|wrath|seeth(e|ing)|snarl|roar(s|ed)?)\b/i,
  fearful: /\b(afraid|fear(ful|ed)?|terrif(ied|ying)|dread|panic|trembl(e|ing)|shak(e|ing)|cower)\b/i,
  calm: /\b(calm(ly)?|serene|peaceful|composed|steady|relaxed|tranquil)\b/i,
  joyful: /\b(joy(ful)?|happy|laugh(s|ing|ed)?|smile(s|d)?|grin(s|ned)?|delight|cheerful)\b/i,
  sorrowful: /\b(sorrow|sad(ly)?|grief|mourn|weep(s|ing)?|cry|cries|crying|tears|lament)\b/i,
  disgusted: /\b(disgust(ed|ing)?|revuls(ion|ed)|sicken(ed|ing)?|nauseate|repuls(e|ed|ive))\b/i,
  surprised: /\b(surpris(e|ed|ing)|shock(ed)?|gasp(s|ed)?|startle(d)?|stun(ned)?|astonish)\b/i,
  contemptuous: /\b(contempt|scorn|disdain|mock(s|ing|ed)?|sneer(s|ed)?|dismiss(ive)?)\b/i,
  curious: /\b(curious|intrigu(e|ed|ing)|wonder(s|ing)?|fascinate(d)?|ponder|puzzl(e|ed))\b/i,
  determined: /\b(determin(e|ed|ation)|resolv(e|ed)|steely|unwaver|steadfast|resolute)\b/i,
  desperate: /\b(desperat(e|ion)|frantic|last.?resort|plea(d|ding)?|beg(s|ging)?|implore)\b/i,
  neutral: /(?!)/, // never matches — fallback only
};

const VOCAL_KEYWORDS: Record<VocalTone, RegExp> = {
  whisper: /\b(whisper(s|ed|ing)?|murmur(s|ed)?|hush(ed)?|softly|quietly|under.?breath)\b/i,
  shout: /\b(shout(s|ed|ing)?|yell(s|ed)?|scream(s|ed)?|bellow(s|ed)?|roar(s|ed)?|cry out)\b/i,
  growl: /\b(growl(s|ed|ing)?|snarl(s|ed)?|hiss(es|ed)?|grit(s|ted)?\s*teeth)\b/i,
  sarcastic: /\b(sarcast(ic|ically)?|mock(s|ing|ingly)?|dry(ly)?|ironic(ally)?)\b/i,
  cold: /\b(cold(ly)?|icy|frig(id)?|flat(ly)?|emotionless|detach(ed)?|matter.?of.?fact)\b/i,
  warm: /\b(warm(ly)?|gently?|kind(ly)?|soft(ly)?|tender(ly)?|fondly)\b/i,
  pleading: /\b(plead(s|ing|ed)?|beg(s|ging)?|implor(e|ing)|desper(ate|ately))\b/i,
  commanding: /\b(command(s|ed|ing)?|order(s|ed)?|demand(s|ed)?|decree|authoritat(ive|ively)|insist)\b/i,
  neutral: /(?!)/,
};

const BIOME_KEYWORDS: Record<BiomeTag, RegExp> = {
  forest: /\b(forest|wood(s|land)?|tree(s)?|canopy|grove|jungle|thicket)\b/i,
  desert: /\b(desert|sand(s)?|dune(s)?|arid|wasteland|scorching)\b/i,
  tundra: /\b(tundra|ice|frozen|arctic|snow|blizzard|frost)\b/i,
  volcanic: /\b(volcan(o|ic)|lava|magma|molten|eruption|ash)\b/i,
  urban: /\b(city|urban|street|alley|market|building|town|village)\b/i,
  void: /\b(void|abyss|darkness|shadow|nether|emptiness)\b/i,
  aquatic: /\b(ocean|sea|water|river|lake|underwater|depth)\b/i,
  cavern: /\b(cave|cavern|tunnel|underground|subterranean|grotto)\b/i,
  cosmic: /\b(cosmic|star(s)?|nebula|galaxy|space|celestial|astral)\b/i,
  ruins: /\b(ruin(s|ed)?|ancient|crumbl(e|ing)|decay|abandoned|wreckage)\b/i,
};

/* ── Helpers ── */

function matchBest(text: string, map: Record<string, RegExp>, fallback: string): string {
  let best: string = fallback;
  let bestCount = 0;
  for (const [key, regex] of Object.entries(map)) {
    const matches = text.match(new RegExp(regex.source, 'gi'));
    if (matches && matches.length > bestCount) {
      bestCount = matches.length;
      best = key;
    }
  }
  return best;
}

function countKeyword(text: string, pattern: RegExp): number {
  const m = text.match(new RegExp(pattern.source, 'gi'));
  return m ? m.length : 0;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function hasPattern(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

/* ── Deriver ── */

export const ExpressionDeriver = {
  /**
   * Full derivation from runtime packets + message text.
   * This is the preferred path during live generation.
   */
  fromPipeline(
    packets: GeneratedRuntimePackets,
    text: string,
    speakerId: string,
    speakerRole: ChatSpeakerRole,
  ): ExpressionPacket {
    const base = this.fromText(text, speakerId, speakerRole);

    const scene = packets.sceneState as unknown as Record<string, unknown> | undefined;
    const actor = packets.actorIdentity as unknown as Record<string, unknown> | undefined;
    const npc = packets.npcIdentity as unknown as Record<string, unknown> | undefined;
    const world = packets.worldState as unknown as Record<string, unknown> | undefined;

    // Overlay scene pressure onto body language
    if (scene) {
      const pressure = scene.scenePressure;
      if (pressure === 'critical') {
        base.bodyLanguage.urgency = clamp01(base.bodyLanguage.urgency + 0.4);
        base.bodyLanguage.stability = clamp01(base.bodyLanguage.stability - 0.3);
        base.presence.weight = clamp01(base.presence.weight + 0.2);
      } else if (pressure === 'high') {
        base.bodyLanguage.urgency = clamp01(base.bodyLanguage.urgency + 0.2);
        base.bodyLanguage.stability = clamp01(base.bodyLanguage.stability - 0.15);
      }

      const envTension = typeof scene.environmentalPressure === 'number'
        ? scene.environmentalPressure
        : typeof scene.scenePressure === 'string' && scene.scenePressure === 'high' ? 0.7 : 0.3;
      base.environmentInfluence.tension = clamp01(
        (base.environmentInfluence.tension + (envTension as number)) / 2,
      );
    }

    // NPC identity overlays
    if (npc && speakerRole !== 'player') {
      const threatPosture = npc.threatPosture;
      if (Array.isArray(threatPosture)) {
        const joined = threatPosture.join(' ');
        if (/aggressive|hostile|predatory/.test(joined)) {
          base.bodyLanguage.dominance = clamp01(base.bodyLanguage.dominance + 0.3);
          base.bodyLanguage.agitation = clamp01(base.bodyLanguage.agitation + 0.2);
        }
        if (/cautious|defensive|evasive/.test(joined)) {
          base.bodyLanguage.stability = clamp01(base.bodyLanguage.stability + 0.1);
          base.bodyLanguage.dominance = clamp01(base.bodyLanguage.dominance - 0.2);
        }
        if (/deceptive|manipulative|treacherous/.test(joined)) {
          base.deception.active = true;
          base.deception.severity = clamp01(base.deception.severity + 0.4);
        }
      }

      const socialPosture = npc.socialPosture;
      if (Array.isArray(socialPosture)) {
        const joined = socialPosture.join(' ');
        if (/commanding|authoritative/.test(joined)) {
          base.presence.dominance = clamp01(base.presence.dominance + 0.3);
          base.vocalStyle.tone = 'commanding';
        }
        if (/submissive|meek/.test(joined)) {
          base.presence.dominance = clamp01(base.presence.dominance - 0.3);
          base.presence.weight = clamp01(base.presence.weight - 0.2);
        }
      }
    }

    // Actor identity overlays for players
    if (actor && speakerRole === 'player') {
      const effectBias = actor.effectBias;
      if (Array.isArray(effectBias)) {
        const joined = effectBias.join(' ');
        if (/power|mighty|overwhelming/.test(joined)) {
          base.presence.weight = clamp01(base.presence.weight + 0.2);
        }
        if (/stealth|shadow|subtle/.test(joined)) {
          base.presence.weight = clamp01(base.presence.weight - 0.15);
          base.vocalStyle.tone = 'whisper';
        }
      }
    }

    // World biome
    if (world) {
      const envId = world.environmentalIdentity;
      if (Array.isArray(envId)) {
        const envStr = envId.join(' ');
        for (const [biome, regex] of Object.entries(BIOME_KEYWORDS) as [BiomeTag, RegExp][]) {
          if (regex.test(envStr)) {
            base.environmentInfluence.biome = biome;
            break;
          }
        }
      }
    }

    // Apply emotional momentum
    return EmotionalMomentumTracker.apply(base);
  },

  /**
   * Text-only derivation for persisted messages without runtime packets.
   */
  fromText(
    text: string,
    speakerId: string,
    speakerRole: ChatSpeakerRole,
  ): ExpressionPacket {
    const emotionType = matchBest(text, EMOTION_KEYWORDS, 'neutral');
    const emotionIntensity = clamp01(
      countKeyword(text, EMOTION_KEYWORDS[emotionType] || /(?!)/) * 0.25 + 0.3,
    );

    const vocalTone = matchBest(text, VOCAL_KEYWORDS, 'neutral');
    const biome = matchBest(text, BIOME_KEYWORDS, 'cosmic');

    // Body language from text cues
    const urgency = clamp01(
      (hasPattern(text, /\b(hurry|quick(ly)?|fast|rush|now|immediately)\b/i) ? 0.4 : 0) +
      (emotionType === 'angry' || emotionType === 'desperate' ? 0.3 : 0) +
      0.15,
    );
    const stability = clamp01(
      1 -
      (hasPattern(text, /\b(stumbl|stagger|wobbl|sway|totter|reel)\b/i) ? 0.3 : 0) -
      (emotionType === 'fearful' ? 0.25 : 0) -
      (emotionType === 'desperate' ? 0.2 : 0),
    );
    const agitation = clamp01(
      (hasPattern(text, /\b(pace|pacing|fidget|twitch|restless|shak(e|ing))\b/i) ? 0.35 : 0) +
      (emotionType === 'angry' ? 0.3 : 0) +
      (emotionType === 'fearful' ? 0.2 : 0),
    );
    const dominance = clamp01(
      (hasPattern(text, /\b(tower|loom|glare|demand|command|assert)\b/i) ? 0.35 : 0) +
      (emotionType === 'contemptuous' ? 0.3 : 0) +
      (emotionType === 'determined' ? 0.2 : 0) +
      (speakerRole === 'narrator' ? 0.6 : 0.35),
    );
    const fear = clamp01(
      (emotionType === 'fearful' ? 0.5 : 0) +
      (emotionType === 'desperate' ? 0.3 : 0) +
      (hasPattern(text, /\b(dread|horror|terror)\b/i) ? 0.3 : 0),
    );

    // Vocal style
    const pacing = clamp01(
      (vocalTone === 'shout' || vocalTone === 'commanding' ? 0.8 : 0) +
      (vocalTone === 'whisper' ? 0.25 : 0) +
      (emotionType === 'angry' ? 0.2 : 0) +
      0.4,
    );
    const sharpness = clamp01(
      (vocalTone === 'cold' || vocalTone === 'growl' ? 0.7 : 0) +
      (emotionType === 'contemptuous' ? 0.4 : 0) +
      0.2,
    );
    const hesitation = clamp01(
      (hasPattern(text, /\.{2,3}|—|…/) ? 0.25 : 0) +
      (emotionType === 'fearful' ? 0.3 : 0) +
      (emotionType === 'surprised' ? 0.2 : 0),
    );

    // Physical state
    const injured = clamp01(
      (hasPattern(text, /\b(wound|bleed|blood|injured|broken|gash|limp)\b/i) ? 0.5 : 0) +
      (hasPattern(text, /\b(pain|agony|torn|shatter)\b/i) ? 0.3 : 0),
    );
    const tired = clamp01(
      (hasPattern(text, /\b(exhaust|tired|weary|fatigue|gasp(ing)?|pant(ing)?|breath)\b/i) ? 0.5 : 0),
    );
    const unstable = clamp01(
      (hasPattern(text, /\b(dizzy|dazed|disorient|stagger|stumbl|sway)\b/i) ? 0.5 : 0),
    );

    // Presence
    const presenceDominance = clamp01(dominance);
    const presenceWeight = clamp01(
      (emotionIntensity > 0.6 ? 0.3 : 0) +
      (emotionType === 'angry' || emotionType === 'determined' ? 0.2 : 0) +
      (speakerRole === 'narrator' ? 0.6 : 0.4),
    );
    const presenceAttention = clamp01(
      0.6 +
      (emotionType === 'curious' ? 0.2 : 0) +
      (emotionType === 'surprised' ? 0.15 : 0),
    );

    // Environment
    const tension = clamp01(
      (emotionType === 'angry' || emotionType === 'fearful' ? 0.3 : 0) +
      (hasPattern(text, /\b(danger|threat|battle|combat|fight|clash)\b/i) ? 0.3 : 0) +
      0.2,
    );
    const atmosphere = emotionType === 'fearful' ? 'eerie'
      : emotionType === 'calm' ? 'serene'
      : emotionType === 'angry' ? 'oppressive'
      : emotionType === 'sorrowful' ? 'melancholic'
      : 'neutral';

    return {
      speakerId,
      speakerRole,
      text,
      emotion: { type: emotionType, intensity: emotionIntensity },
      bodyLanguage: { urgency, stability, agitation, dominance, fear },
      vocalStyle: { tone: vocalTone, pacing, sharpness, hesitation },
      physicalState: { injured, tired, unstable },
      presence: { dominance: presenceDominance, weight: presenceWeight, attention: presenceAttention },
      environmentInfluence: { biome, tension, atmosphere },
      deception: { active: false, severity: 0 },
      attentionTarget: { targetId: null, focusType: 'general' },
    };
  },
};
