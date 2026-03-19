import type { CampaignMessage } from '@/lib/campaign-types';
import type { ChatSpeakerRole } from './presentation/SpeakerPresentationProfile';

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export interface ChatSpeakerResolverInput {
  message: CampaignMessage;
  segmentType?: 'narration' | 'npc_dialogue';
  speakerName?: string | null;
  displayName?: string | null;
}

export const ChatSpeakerResolver = {
  resolve(input: ChatSpeakerResolverInput): ChatSpeakerRole {
    const senderType = String(input.message.sender_type) as ChatSpeakerRole | string;
    if (senderType === 'system') return 'system';
    if (senderType === 'player') return 'player';
    if (senderType === 'party_ally' || senderType === 'enemy_combatant' || senderType === 'npc') {
      return senderType;
    }
    if (senderType === 'narrator' && input.segmentType !== 'npc_dialogue') {
      return 'narrator';
    }

    const metadata = (input.message.metadata || {}) as Record<string, unknown>;
    const generatedNpcIdentity = (metadata.generatedNpcIdentity || {}) as Record<string, unknown>;
    const sceneEffectPacket = (metadata.sceneEffectPacket || {}) as Record<string, unknown>;
    const sceneState = (metadata.generatedSceneState || {}) as Record<string, unknown>;
    const joined = [
      ...toStringArray(generatedNpcIdentity.rolePosture),
      ...toStringArray(generatedNpcIdentity.threatPosture),
      ...toStringArray(generatedNpcIdentity.factionPosture),
      ...toStringArray(generatedNpcIdentity.interactionStyle),
      ...toStringArray(generatedNpcIdentity.memoryPosture),
      ...toStringArray(sceneEffectPacket.enemyPresenceTags),
      ...toStringArray(sceneEffectPacket.environmentalPressureTags),
      ...toStringArray(sceneState.chatPresentationTags),
      input.speakerName || null,
      input.displayName || null,
    ].filter(Boolean).join(' ').toLowerCase();

    if (/(enemy|raider|bandit|predatory|hostile|berserker|hunter|beast|warlord|killer)/.test(joined)) {
      return 'enemy_combatant';
    }
    if (/(ally|companion|guide|protector|friendly|party|support|strategist)/.test(joined)) {
      return 'party_ally';
    }
    return 'npc';
  },
};
