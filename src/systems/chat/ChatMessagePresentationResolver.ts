import type { CampaignMessage } from '@/lib/campaign-types';
import { parseNarratorMessage, resolveNpcDisplayName } from '@/lib/npc-dialogue-parser';
import { getGeneratedRuntimePackets } from '@/systems/pipeline/GeneratedRuntimeBridge';
import { CampaignSpeakerBoxRegistry } from './CampaignSpeakerBoxRegistry';
import type { CampaignMessageEnvelope } from './CampaignMessageEnvelope';
import { ChatSpeakerResolver } from './ChatSpeakerResolver';
import type { ChatSpeakerRole } from './presentation/SpeakerPresentationProfile';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

function collectIdentityCues(message: CampaignMessage) {
  const metadata = (message.metadata || {}) as Record<string, unknown>;
  const packets = getGeneratedRuntimePackets(metadata);
  const actor = (packets.actorIdentity || {}) as Record<string, unknown>;
  const npc = (packets.npcIdentity || {}) as Record<string, unknown>;
  const world = (packets.worldState || {}) as Record<string, unknown>;

  return uniq([
    ...toStringArray(actor.rolePosture),
    ...toStringArray(actor.effectBias),
    ...toStringArray(actor.narrationBias),
    ...toStringArray(npc.rolePosture),
    ...toStringArray(npc.threatPosture),
    ...toStringArray(npc.interactionStyle),
    ...toStringArray(npc.effectBias),
    ...toStringArray(world.environmentalIdentity),
    ...toStringArray(world.socialToneIdentity),
    ...toStringArray(world.hazardPosture),
  ]);
}

function collectSceneEffectCues(message: CampaignMessage) {
  const metadata = (message.metadata || {}) as Record<string, unknown>;
  const sceneEffectPacket = (metadata.sceneEffectPacket || {}) as Record<string, unknown>;
  const scenePresentationProfile = (metadata.scenePresentationProfile || {}) as Record<string, unknown>;
  const generatedSceneState = (metadata.generatedSceneState || {}) as Record<string, unknown>;

  return uniq([
    ...toStringArray(sceneEffectPacket.zoneShiftTags),
    ...toStringArray(sceneEffectPacket.hazardPulseTags),
    ...toStringArray(sceneEffectPacket.enemyPresenceTags),
    ...toStringArray(sceneEffectPacket.environmentalPressureTags),
    ...toStringArray(sceneEffectPacket.chatPresentationTags),
    ...toStringArray(sceneEffectPacket.ambientCueFamilies),
    ...toStringArray(scenePresentationProfile.chatPresentationFlavor),
    ...toStringArray(scenePresentationProfile.visualTone),
    ...toStringArray(scenePresentationProfile.audioTone),
    ...toStringArray(generatedSceneState.chatPresentationTags),
    ...toStringArray(generatedSceneState.narrationToneFlags),
  ]);
}

function collectNarrationFlags(message: CampaignMessage) {
  const metadata = (message.metadata || {}) as Record<string, unknown>;
  const generatedSceneState = (metadata.generatedSceneState || {}) as Record<string, unknown>;
  const playback = (metadata.narratorPlayback || {}) as Record<string, unknown>;

  return uniq([
    ...toStringArray(generatedSceneState.narrationToneFlags),
    typeof playback.animationTag === 'string' ? playback.animationTag : null,
    typeof playback.soundCue === 'string' ? playback.soundCue : null,
  ]);
}

function resolveProfile(
  role: ChatSpeakerRole,
  speakerName: string,
  identityCues: string[],
  sceneEffectCues: string[],
  narrationFlags: string[],
  visualPressure?: string | null,
) {
  return CampaignSpeakerBoxRegistry.resolve(role, {
    speakerName,
    identityCues,
    sceneEffectCues,
    narrationFlags,
    visualPressure,
  });
}

function buildEnvelope(input: {
  id: string;
  message: CampaignMessage;
  role: ChatSpeakerRole;
  speakerId?: string | null;
  speakerName: string;
  content: string;
  rawType: CampaignMessageEnvelope['rawType'];
  identityCues: string[];
  sceneEffectCues: string[];
  narrationFlags: string[];
  visualPressure?: string | null;
}) {
  const profile = resolveProfile(
    input.role,
    input.speakerName,
    input.identityCues,
    input.sceneEffectCues,
    input.narrationFlags,
    input.visualPressure,
  );

  return {
    id: input.id,
    messageId: input.message.id,
    speakerRole: input.role,
    speakerId: input.speakerId,
    speakerName: input.speakerName,
    presentationProfileId: profile.id,
    identityCues: input.identityCues,
    sceneEffectCues: input.sceneEffectCues,
    narrationFlags: input.narrationFlags,
    content: input.content,
    createdAt: input.message.created_at,
    rawType: input.rawType,
    presentationProfile: profile,
  } satisfies CampaignMessageEnvelope;
}

export const ChatMessagePresentationResolver = {
  resolveCampaignMessage(
    message: CampaignMessage,
    options: {
      knownNpcNames?: Set<string>;
    } = {},
  ): CampaignMessageEnvelope[] {
    const identityCues = collectIdentityCues(message);
    const sceneEffectCues = collectSceneEffectCues(message);
    const narrationFlags = collectNarrationFlags(message);
    const metadata = (message.metadata || {}) as Record<string, unknown>;
    const generatedSceneState = (metadata.generatedSceneState || {}) as Record<string, unknown>;
    const visualPressure = typeof generatedSceneState.scenePressure === 'string' ? generatedSceneState.scenePressure : null;
    const structuredMessageKind = typeof metadata.structuredMessageKind === 'string' ? metadata.structuredMessageKind : null;

    if (message.sender_type === 'narrator') {
      if (structuredMessageKind === 'narration') {
        return [buildEnvelope({
          id: message.id,
          message,
          role: 'narrator',
          speakerId: null,
          speakerName: 'Narrator',
          content: message.content,
          rawType: 'narration',
          identityCues,
          sceneEffectCues,
          narrationFlags,
          visualPressure,
        })];
      }

      const segments = parseNarratorMessage(message.content);
      return segments.map((segment, index) => {
        const speakerName = segment.type === 'npc_dialogue'
          ? resolveNpcDisplayName(segment.speakerName, options.knownNpcNames || new Set())
          : 'Narrator';
        const role = ChatSpeakerResolver.resolve({
          message,
          segmentType: segment.type,
          speakerName: segment.type === 'npc_dialogue' ? segment.speakerName : 'Narrator',
          displayName: speakerName,
        });

        return buildEnvelope({
          id: `${message.id}:${index}`,
          message,
          role,
          speakerId: segment.type === 'npc_dialogue' ? segment.speakerName : null,
          speakerName,
          content: segment.type === 'npc_dialogue' ? segment.dialogue : segment.text,
          rawType: segment.type === 'npc_dialogue' ? 'speech' : 'narration',
          identityCues,
          sceneEffectCues,
          narrationFlags,
          visualPressure,
        });
      });
    }

    const storedSpeakerName = typeof metadata.speakerName === 'string' ? metadata.speakerName : null;
    const storedDisplayName = typeof metadata.displaySpeakerName === 'string' ? metadata.displaySpeakerName : null;
    const role = ChatSpeakerResolver.resolve({
      message,
      speakerName: storedSpeakerName || message.character?.name || null,
      displayName: storedDisplayName || storedSpeakerName || message.character?.name || null,
    });
    const speakerName = role === 'system'
      ? 'System'
      : storedDisplayName
        || storedSpeakerName
        || message.character?.name
        || (role === 'player' ? 'Player' : 'Unknown');

    return [buildEnvelope({
      id: message.id,
      message,
      role,
      speakerId: storedSpeakerName || message.character_id,
      speakerName,
      content: message.content,
      rawType: role === 'system' ? 'system' : role === 'player' ? 'player' : 'speech',
      identityCues,
      sceneEffectCues,
      narrationFlags,
      visualPressure,
    })];
  },
  resolveStandaloneProfile(input: {
    speakerRole: ChatSpeakerRole;
    speakerName: string;
    metadata?: Record<string, unknown> | null;
  }) {
    const message = {
      id: 'standalone',
      message_id: 'standalone',
      campaign_id: 'standalone',
      character_id: null,
      sender_type: input.speakerRole,
      channel: 'in_universe',
      content: '',
      dice_result: null,
      theme_snapshot: null,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
    } as unknown as CampaignMessage;
    return this.resolveCampaignMessage(message)[0]?.presentationProfile;
  },
};
