import type { GeneratedRuntimePackets, SceneEffectPacket } from '@/systems/types/PipelineTypes';
import type { ChatSpeakerRole } from '@/systems/chat/presentation/SpeakerPresentationProfile';

export interface ChatPresentationProfile {
  speakerRole: ChatSpeakerRole;
  visualPressure: 'low' | 'medium' | 'high' | 'critical';
  pulseBehavior: 'steady' | 'tight' | 'surge' | 'flicker';
  textEmphasis: string[];
  cueFamilyBias: string[];
  animationTone: 'calm' | 'measured' | 'kinetic' | 'unstable';
  overlayBehavior: 'soft' | 'layered' | 'hard' | 'volatile';
  boxTreatment: string[];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

export const ChatPresentationProfileBuilder = {
  build(
    packets: GeneratedRuntimePackets,
    options: {
      speakerRole: ChatSpeakerRole;
      sceneEffectPacket?: SceneEffectPacket | null;
    },
  ): ChatPresentationProfile {
    const scene = packets.sceneState;
    const effect = packets.effectState;
    const npc = packets.npcIdentity;
    const actor = packets.actorIdentity;

    const baseCues = uniq([
      ...toStringArray(effect?.textEmphasisStyle),
      ...toStringArray(effect?.chatBehaviors),
      ...toStringArray(scene?.chatPresentationTags),
      ...toStringArray(scene?.narrationToneFlags),
      ...toStringArray(options.sceneEffectPacket?.enemyPresenceTags),
      ...toStringArray(options.sceneEffectPacket?.environmentalPressureTags),
      ...toStringArray(options.sceneEffectPacket?.hazardPulseTags),
      ...toStringArray(actor?.effectBias),
      ...toStringArray(npc?.effectBias),
    ]);
    const joined = baseCues.join(' ');
    const visualPressure = scene?.scenePressure ?? (/(critical|killbox|overwhelming)/.test(joined) ? 'critical' : /(high|hostile|volatile|impact)/.test(joined) ? 'high' : /(medium|guarded|tight|charged)/.test(joined) ? 'medium' : 'low');
    const pulseBehavior = /(panic|terrified|unstable|flicker)/.test(joined)
      ? 'flicker'
      : /(surge|burst|impact|hostile|predatory)/.test(joined)
        ? 'surge'
        : /(tight|guarded|measured|cautious)/.test(joined)
          ? 'tight'
          : 'steady';
    const animationTone = /(panic|terrified|unstable)/.test(joined)
      ? 'unstable'
      : /(surge|impact|hostile|predatory|combat)/.test(joined)
        ? 'kinetic'
        : /(formal|measured|composed|strategist)/.test(joined)
          ? 'measured'
          : 'calm';
    const overlayBehavior = /(volatile|surge|explosive)/.test(joined)
      ? 'volatile'
      : /(hard|impact|threat)/.test(joined)
        ? 'hard'
        : /(charged|mystic|ritual|layer)/.test(joined)
          ? 'layered'
          : 'soft';
    const boxTreatment = uniq([
      options.speakerRole,
      `pressure:${visualPressure}`,
      `pulse:${pulseBehavior}`,
      ...baseCues.filter((entry) => /chat:|enemy:|npc-threat:|npc-role:|tone:/.test(entry)).slice(0, 6),
    ]);

    return {
      speakerRole: options.speakerRole,
      visualPressure,
      pulseBehavior,
      textEmphasis: uniq([
        ...toStringArray(effect?.textEmphasisStyle),
        ...toStringArray(scene?.chatPresentationTags),
      ]),
      cueFamilyBias: uniq([
        ...toStringArray(effect?.soundCueFamilies),
        ...toStringArray(effect?.audioLayers),
      ]),
      animationTone,
      overlayBehavior,
      boxTreatment,
    };
  },
};
