import type { CampaignMessage } from '@/lib/campaign-types';
import { parseNarratorMessage, resolveNpcDisplayName } from '@/lib/npc-dialogue-parser';

interface NarrationNormalizationOptions {
  campaignId: string;
  channel?: CampaignMessage['channel'];
  rawNarration: string;
  baseMetadata?: Record<string, unknown> | null;
  knownNpcNames?: Set<string>;
  activeEnemyNames?: string[];
  focalCharacterName?: string | null;
  isSolo?: boolean;
  turnGroupId?: string;
}

export interface NormalizedCampaignMessageInsert {
  campaign_id: string;
  character_id: string | null;
  sender_type: CampaignMessage['sender_type'];
  channel: CampaignMessage['channel'];
  content: string;
  metadata: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(text: string) {
  return text.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').trim();
}

function toSentenceCaseName(name: string) {
  return name.trim();
}

function sanitizeNarratorPov(text: string, options: { isSolo?: boolean; focalCharacterName?: string | null }) {
  if (options.isSolo || !options.focalCharacterName) return cleanText(text);

  const name = options.focalCharacterName;

  return cleanText(
    text
      .replace(/(^|[.!?]\s+|\n+)([Yy])ou\b/g, (_, prefix) => `${prefix}${name}`)
      .replace(/\b[Yy]our\b/g, `${name}'s`)
      .replace(/\b[Yy]ou're\b/g, `${name} is`)
      .replace(/\b[Yy]ou've\b/g, `${name} has`),
  );
}

function resolveStructuredSpeakerType(speakerName: string, activeEnemyNames: string[] = []): CampaignMessage['sender_type'] {
  const normalized = speakerName.trim().toLowerCase();
  if (activeEnemyNames.some((enemy) => enemy.trim().toLowerCase() === normalized)) {
    return 'enemy_combatant';
  }
  return 'npc';
}

export function normalizeNarrationToCampaignMessages(
  options: NarrationNormalizationOptions,
): NormalizedCampaignMessageInsert[] {
  const rawNarration = cleanText(options.rawNarration);
  if (!rawNarration) return [];

  const turnGroupId = options.turnGroupId ?? `turn-${Date.now()}`;
  const baseMetadata = isRecord(options.baseMetadata) ? options.baseMetadata : {};
  const channel = options.channel ?? 'in_universe';
  const knownNpcNames = options.knownNpcNames ?? new Set<string>();
  const activeEnemyNames = options.activeEnemyNames ?? [];
  const segments = parseNarratorMessage(rawNarration);

  return segments.flatMap((segment, index) => {
    if (segment.type === 'narration') {
      const content = sanitizeNarratorPov(segment.text, {
        isSolo: options.isSolo,
        focalCharacterName: options.focalCharacterName,
      });
      if (!content) return [];

      return [{
        campaign_id: options.campaignId,
        character_id: null,
        sender_type: 'narrator' as const,
        channel,
        content,
        metadata: {
          ...baseMetadata,
          structuredTurnGroupId: turnGroupId,
          structuredTurnSequence: index,
          structuredMessageKind: 'narration',
          structuredOriginalNarration: rawNarration,
        },
      } satisfies NormalizedCampaignMessageInsert];
    }

    const content = cleanText(segment.dialogue);
    if (!content) return [];

    const displaySpeakerName = resolveNpcDisplayName(segment.speakerName, knownNpcNames);

    return [{
      campaign_id: options.campaignId,
      character_id: null,
      sender_type: resolveStructuredSpeakerType(segment.speakerName, activeEnemyNames),
      channel,
      content,
      metadata: {
        ...baseMetadata,
        structuredTurnGroupId: turnGroupId,
        structuredTurnSequence: index,
        structuredMessageKind: 'npc_dialogue',
        structuredOriginalNarration: rawNarration,
        speakerName: toSentenceCaseName(segment.speakerName),
        displaySpeakerName,
      },
    } satisfies NormalizedCampaignMessageInsert];
  });
}

export function sortCampaignMessagesForDisplay(messages: CampaignMessage[]) {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftMeta = isRecord(left.metadata) ? left.metadata : {};
    const rightMeta = isRecord(right.metadata) ? right.metadata : {};
    const leftGroup = typeof leftMeta.structuredTurnGroupId === 'string' ? leftMeta.structuredTurnGroupId : '';
    const rightGroup = typeof rightMeta.structuredTurnGroupId === 'string' ? rightMeta.structuredTurnGroupId : '';

    if (leftGroup && rightGroup && leftGroup === rightGroup) {
      const leftSeq = typeof leftMeta.structuredTurnSequence === 'number' ? leftMeta.structuredTurnSequence : 0;
      const rightSeq = typeof rightMeta.structuredTurnSequence === 'number' ? rightMeta.structuredTurnSequence : 0;
      if (leftSeq !== rightSeq) return leftSeq - rightSeq;
    }

    return left.id.localeCompare(right.id);
  });
}
