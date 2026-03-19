import type { SpeakerPresentationProfile, ChatSpeakerRole } from '@/systems/chat/presentation/SpeakerPresentationProfile';
import type { ExpressionPacket } from '@/systems/expression/ExpressionPacket';

export interface CampaignMessageEnvelope {
  id: string;
  messageId: string;
  speakerRole: ChatSpeakerRole;
  speakerId?: string | null;
  speakerName: string;
  presentationProfileId: string;
  identityCues: string[];
  sceneEffectCues: string[];
  narrationFlags: string[];
  content: string;
  createdAt?: string;
  rawType: 'narration' | 'speech' | 'player' | 'system';
  presentationProfile: SpeakerPresentationProfile;
  /** Expression packet for advanced chat box rendering */
  expressionPacket?: ExpressionPacket | null;
}
