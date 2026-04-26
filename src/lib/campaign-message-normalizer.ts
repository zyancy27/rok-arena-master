import type { CampaignMessage } from '@/lib/campaign-types';
import { parseNarratorMessage, resolveNpcDisplayName, type MessageSegment } from '@/lib/npc-dialogue-parser';

// ── Scene Beat Types (from AI structured output) ──

export type SceneBeatType = 'narrator' | 'npc_dialogue' | 'environment' | 'consequence' | 'system' | 'hook' | 'gated_opportunity';

export interface SceneBeat {
  type: SceneBeatType;
  content: string;
  /** Speaker name — only for npc_dialogue beats */
  speaker?: string | null;
}

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
  /** Structured scene beats from AI — bypasses regex parsing when present */
  sceneBeats?: SceneBeat[] | null;
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

/**
 * Heavy fields we never want to persist on EVERY scene beat. These can be
 * hundreds of KB of encrypted lore + identity packets and, when copied across
 * 3-5 beat rows in a single bulk insert, push the request past PostgREST /
 * Cloudflare body limits — the entire insert then fails with
 * "Failed to fetch" and NPC dialogue + environment beats vanish from chat.
 *
 * Anything that needs to survive for downstream rendering (voice cues, intent
 * debug, dice metadata, scene effect summaries) is kept; the rest is dropped.
 */
const HEAVY_METADATA_KEYS = new Set<string>([
  'generatedPackets',
  'contextPacket',
  'resolvedActionPacket',
  'npcReactionPacket',
  'sceneEffectPacket',
  'narrationContext',
  'characterLore',
  'loreContext',
  'playerCharacter',
  'conversationHistory',
  'storyContext',
  'worldState',
  'generated',
]);

/** Drop heavy/redundant payloads but keep small surface fields. */
function trimMetadataForPersistence(meta: Record<string, unknown>): Record<string, unknown> {
  const trimmed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (HEAVY_METADATA_KEYS.has(key)) continue;
    trimmed[key] = value;
  }
  return trimmed;
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

function mergeAdjacentDialogueSegments(segments: MessageSegment[]) {
  const merged: MessageSegment[] = [];

  for (const segment of segments) {
    const last = merged[merged.length - 1];

    if (
      segment.type === 'npc_dialogue'
      && last?.type === 'npc_dialogue'
      && last.speakerName.trim().toLowerCase() === segment.speakerName.trim().toLowerCase()
    ) {
      last.dialogue = cleanText(`${last.dialogue}\n${segment.dialogue}`);
      continue;
    }

    if (segment.type === 'narration') {
      const text = cleanText(segment.text);
      if (text) merged.push({ ...segment, text });
      continue;
    }

    const dialogue = cleanText(segment.dialogue);
    if (dialogue) merged.push({ ...segment, dialogue });
  }

  return merged;
}

/**
 * Map a SceneBeat type to a sender_type for the campaign_messages table.
 */
function beatTypeToSenderType(beatType: SceneBeatType): CampaignMessage['sender_type'] {
  switch (beatType) {
    case 'npc_dialogue': return 'npc';
    case 'system': return 'system';
    case 'environment':
    case 'consequence':
    case 'hook':
    case 'gated_opportunity':
    case 'narrator':
    default:
      return 'narrator';
  }
}

/**
 * Convert AI-returned structured scene beats directly into campaign messages,
 * bypassing regex parsing. Each beat maps to a distinct DB record with proper
 * sender_type and metadata.
 */
function normalizeSceneBeatsToCampaignMessages(
  beats: SceneBeat[],
  options: NarrationNormalizationOptions,
): NormalizedCampaignMessageInsert[] {
  const turnGroupId = options.turnGroupId ?? `turn-${Date.now()}`;
  const baseMetadata = isRecord(options.baseMetadata) ? options.baseMetadata : {};
  const channel = options.channel ?? 'in_universe';
  const knownNpcNames = options.knownNpcNames ?? new Set<string>();
  const activeEnemyNames = options.activeEnemyNames ?? [];
  const messages: NormalizedCampaignMessageInsert[] = [];

  beats.forEach((beat, index) => {
    const content = cleanText(beat.content);
    if (!content) return;

    if (beat.type === 'npc_dialogue' && beat.speaker) {
      const displaySpeakerName = resolveNpcDisplayName(beat.speaker, knownNpcNames);
      messages.push({
        campaign_id: options.campaignId,
        character_id: null,
        sender_type: resolveStructuredSpeakerType(beat.speaker, activeEnemyNames),
        channel,
        content,
        metadata: {
          ...baseMetadata,
          structuredTurnGroupId: turnGroupId,
          structuredTurnSequence: index,
          structuredMessageKind: 'npc_dialogue',
          structuredOriginalNarration: options.rawNarration,
          speakerName: toSentenceCaseName(beat.speaker),
          displaySpeakerName,
        },
      });
      return;
    }

    // narrator / environment / consequence / hook / gated_opportunity / system
    const finalContent = beat.type === 'narrator'
      ? sanitizeNarratorPov(content, { isSolo: options.isSolo, focalCharacterName: options.focalCharacterName })
      : content;
    if (!finalContent) return;

    messages.push({
      campaign_id: options.campaignId,
      character_id: null,
      sender_type: beatTypeToSenderType(beat.type),
      channel,
      content: finalContent,
      metadata: {
        ...baseMetadata,
        structuredTurnGroupId: turnGroupId,
        structuredTurnSequence: index,
        structuredMessageKind: beat.type,
        structuredOriginalNarration: options.rawNarration,
        sceneBeatType: beat.type,
      },
    });
  });

  return messages;
}

export function normalizeNarrationToCampaignMessages(
  options: NarrationNormalizationOptions,
): NormalizedCampaignMessageInsert[] {
  // If structured beats are provided by the AI, use them directly
  if (options.sceneBeats && Array.isArray(options.sceneBeats) && options.sceneBeats.length > 0) {
    return normalizeSceneBeatsToCampaignMessages(options.sceneBeats, options);
  }

  // Fallback: regex-based parsing of flat narration string
  const rawNarration = cleanText(options.rawNarration);
  if (!rawNarration) return [];

  const turnGroupId = options.turnGroupId ?? `turn-${Date.now()}`;
  const baseMetadata = isRecord(options.baseMetadata) ? options.baseMetadata : {};
  const channel = options.channel ?? 'in_universe';
  const knownNpcNames = options.knownNpcNames ?? new Set<string>();
  const activeEnemyNames = options.activeEnemyNames ?? [];
  const segments = mergeAdjacentDialogueSegments(parseNarratorMessage(rawNarration));
  const messages: NormalizedCampaignMessageInsert[] = [];

  segments.forEach((segment, index) => {
    if (segment.type === 'narration') {
      const content = sanitizeNarratorPov(segment.text, {
        isSolo: options.isSolo,
        focalCharacterName: options.focalCharacterName,
      });
      if (!content) return;

      messages.push({
        campaign_id: options.campaignId,
        character_id: null,
        sender_type: 'narrator',
        channel,
        content,
        metadata: {
          ...baseMetadata,
          structuredTurnGroupId: turnGroupId,
          structuredTurnSequence: index,
          structuredMessageKind: 'narration',
          structuredOriginalNarration: rawNarration,
        },
      });
      return;
    }

    const displaySpeakerName = resolveNpcDisplayName(segment.speakerName, knownNpcNames);

    messages.push({
      campaign_id: options.campaignId,
      character_id: null,
      sender_type: resolveStructuredSpeakerType(segment.speakerName, activeEnemyNames),
      channel,
      content: segment.dialogue,
      metadata: {
        ...baseMetadata,
        structuredTurnGroupId: turnGroupId,
        structuredTurnSequence: index,
        structuredMessageKind: 'npc_dialogue',
        structuredOriginalNarration: rawNarration,
        speakerName: toSentenceCaseName(segment.speakerName),
        displaySpeakerName,
      },
    });
  });

  return messages;
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
