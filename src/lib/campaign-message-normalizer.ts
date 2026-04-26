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
 * ── Two-layer persistence model ──────────────────────────────────────────
 *
 * Chat message rows are LIGHTWEIGHT. They only carry what an individual
 * message needs to render, animate, play audio, and stay correctly ordered
 * in the response group. They must NOT carry generated lore packets, full
 * conversation history, full player/world state, or other large background
 * context — copying those across 3-5 beat rows blew past the Postgres /
 * Cloudflare request body limits and silently dropped NPC dialogue and
 * environment beats from the chat.
 *
 * Heavy narrator/campaign state (generatedPackets, conversationHistory,
 * world/lore packets, scene-effect packets, etc.) lives in the background
 * via `persistNarratorBackgroundState` → `campaign_logs` and durable tables
 * (campaign_brain, campaign_turn_logs, campaign_npcs, campaign_location_state).
 * Future narrator turns retrieve continuity from those tables, NOT from chat
 * message metadata.
 *
 * The chat-row allowlist below is the single source of truth for what is
 * safe and useful to embed on each campaign_messages row.
 */
export const CHAT_MESSAGE_METADATA_ALLOWLIST = new Set<string>([
  // ── Rendering / playback ──
  'narratorPlayback',          // voice cue, animation tag, voice settings
  'soundCue',
  'animationTag',
  'voiceSettings',
  'scenePresentationProfile',  // small derived profile used by chat bubbles
  'chatPresentationTags',
  'ambientCueFamilies',

  // ── Speaker / identity (rendering only) ──
  'speakerName',
  'displaySpeakerName',
  'sceneBeatType',
  'narrationFlavorTags',
  'scenePressureTags',

  // ── Grouping / ordering / live-typing ──
  'structuredTurnGroupId',
  'structuredTurnSequence',
  'structuredMessageKind',
  'structuredOriginalNarration',
  'backgroundStateRef',        // pointer to campaign_logs row holding heavy state
  'turnLogId',                 // pointer to campaign_turn_logs row for this turn

  // ── Compact debug / dice surfaces (small) ──
  'intentDebug',
  'diceMetadata',
  'mapEffectTags',
  'npcReactionSummary',
]);

/**
 * Reduce metadata to ONLY the fields a chat message needs. Anything not on
 * the allowlist is dropped from the row and is expected to be persisted to
 * background state separately via `persistNarratorBackgroundState`.
 */
function trimMetadataForPersistence(meta: Record<string, unknown>): Record<string, unknown> {
  const trimmed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!CHAT_MESSAGE_METADATA_ALLOWLIST.has(key)) continue;
    if (value === undefined) continue;
    trimmed[key] = value;
  }
  return trimmed;
}

function cleanText(text: string) {
  return text.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').trim();
}

/**
 * Defensive recovery for the case where `rawNarration` is actually the raw
 * model JSON output (because the edge function's parser failed). Walks the
 * brace stack to locate a balanced JSON object, repairs trailing commas /
 * unbalanced braces from truncation, and extracts the `sceneBeats` and
 * `narration` fields.
 */
function recoverFromJsonBlob(raw: string): { sceneBeats: SceneBeat[] | null; narration: string | null } {
  const firstBrace = raw.indexOf('{');
  if (firstBrace === -1) return { sceneBeats: null, narration: null };

  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;
  for (let i = firstBrace; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
  }

  let candidate = endIdx !== -1 ? raw.substring(firstBrace, endIdx + 1) : raw.substring(firstBrace);
  let parsed: any = null;
  try { parsed = JSON.parse(candidate); }
  catch {
    let repaired = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    let openBraces = 0, openBrackets = 0;
    inString = false; escape = false;
    for (let i = 0; i < repaired.length; i++) {
      const ch = repaired[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }
    if (inString) repaired += '"';
    while (openBrackets > 0) { repaired += ']'; openBrackets--; }
    while (openBraces > 0) { repaired += '}'; openBraces--; }
    try { parsed = JSON.parse(repaired); } catch { return { sceneBeats: null, narration: null }; }
  }

  const beats = Array.isArray(parsed?.sceneBeats)
    ? parsed.sceneBeats
        .filter((b: any) => b && typeof b.type === 'string' && typeof b.content === 'string' && b.content.trim().length > 0)
        .map((b: any) => ({
          type: b.type as SceneBeatType,
          content: b.content.trim(),
          speaker: typeof b.speaker === 'string' ? b.speaker.trim() : null,
        })) as SceneBeat[]
    : null;

  const narration = typeof parsed?.narration === 'string' ? parsed.narration.trim() : null;
  return { sceneBeats: beats && beats.length > 0 ? beats : null, narration };
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
  const baseMetadata = trimMetadataForPersistence(isRecord(options.baseMetadata) ? options.baseMetadata : {});
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

  // Defensive recovery: if rawNarration is actually a JSON blob (e.g. the
  // upstream parser failed and leaked the model output through), try to
  // extract the embedded `sceneBeats` / `narration` fields here instead of
  // letting the regex parser shred the JSON into garbage chat rows.
  let rawNarration = cleanText(options.rawNarration);
  if (rawNarration.startsWith('{') && /"sceneBeats"\s*:|"narration"\s*:/.test(rawNarration)) {
    const recovered = recoverFromJsonBlob(rawNarration);
    if (recovered.sceneBeats && recovered.sceneBeats.length > 0) {
      return normalizeSceneBeatsToCampaignMessages(recovered.sceneBeats, options);
    }
    if (recovered.narration && recovered.narration.length > 10) {
      rawNarration = cleanText(recovered.narration);
    } else {
      // No recoverable content — drop the row rather than persist JSON noise
      return [];
    }
  }

  if (!rawNarration) return [];


  const turnGroupId = options.turnGroupId ?? `turn-${Date.now()}`;
  const baseMetadata = trimMetadataForPersistence(isRecord(options.baseMetadata) ? options.baseMetadata : {});
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
