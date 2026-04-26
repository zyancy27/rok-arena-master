/**
 * Runtime adapter that takes the AI's raw nickname suggestion plus runtime
 * context, runs it through NicknameEngine, and persists earned nicknames
 * into `character_nicknames`. Returns the nickname string that is allowed
 * to live on the lightweight narrator_sentiments.nickname field for quick
 * rendering — or null when the engine refuses.
 *
 * This lives in src/lib/ so it can be imported from CampaignView and any
 * future battle/narrator runtime without dragging React in.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  proposeNickname,
  type NicknameInput,
  type NicknameProposal,
  type NicknameSourceType,
  type NicknameTone,
  type NicknameStatus,
  type PlayerReaction,
} from '@/systems/identity/NicknameEngine';

interface ExistingNicknameRow {
  id: string;
  nickname: string;
  source_type: NicknameSourceType;
  tone: NicknameTone;
  status: NicknameStatus;
  player_reaction: PlayerReaction;
}

export interface NicknameRuntimeContext {
  characterId: string;
  characterName: string;
  campaignId?: string | null;
  battleId?: string | null;
  turnCount: number;
  dayCount?: number | null;
  personalityTraits?: string[];
  abilities?: string[];
  combatStyle?: string;
  recentActions?: string[];
  memorableMoments?: string[];
  reputationStage?: string | null;
  sentimentDimensions?: NicknameInput['sentimentDimensions'];
  speaker?: NicknameInput['speaker'];
  contrastHint?: NicknameInput['contrastHint'];
  /** Raw text the AI wants to use, plus optional tone/source it suggested. */
  aiSuggestion?: NicknameInput['aiSuggestion'];
  sceneRef?: string | null;
}

export interface NicknameRuntimeResult {
  proposal: NicknameProposal | null;
  /** The nickname string that may be written to narrator_sentiments.nickname now. */
  acceptedNickname: string | null;
  /** True if a `character_nicknames` row was created/updated this turn. */
  persisted: boolean;
}

async function loadExisting(characterId: string): Promise<ExistingNicknameRow[]> {
  const { data, error } = await supabase
    .from('character_nicknames' as never)
    .select('id, nickname, source_type, tone, status, player_reaction')
    .eq('character_id', characterId);
  if (error) {
    console.warn('[nickname] failed to load existing', error);
    return [];
  }
  return (data ?? []) as unknown as ExistingNicknameRow[];
}

export async function processNicknameSuggestion(
  ctx: NicknameRuntimeContext,
): Promise<NicknameRuntimeResult> {
  if (!ctx.characterId || !ctx.characterName) {
    return { proposal: null, acceptedNickname: null, persisted: false };
  }

  const existingRows = await loadExisting(ctx.characterId);
  const proposal = proposeNickname({
    characterId: ctx.characterId,
    characterName: ctx.characterName,
    turnCount: ctx.turnCount,
    dayCount: ctx.dayCount ?? undefined,
    personalityTraits: ctx.personalityTraits,
    abilities: ctx.abilities,
    combatStyle: ctx.combatStyle,
    recentActions: ctx.recentActions,
    memorableMoments: ctx.memorableMoments,
    reputationStage: ctx.reputationStage ?? undefined,
    sentimentDimensions: ctx.sentimentDimensions,
    speaker: ctx.speaker,
    contrastHint: ctx.contrastHint ?? null,
    aiSuggestion: ctx.aiSuggestion ?? null,
    existingNicknames: existingRows.map(r => ({
      id: r.id,
      nickname: r.nickname,
      sourceType: r.source_type,
      tone: r.tone,
      status: r.status,
      playerReaction: r.player_reaction,
    })),
  });

  if (!proposal || !proposal.shouldIntroduceNow) {
    return { proposal, acceptedNickname: null, persisted: false };
  }

  // Persist a structured record. Best-effort — never block the chat turn on it.
  let persisted = false;
  try {
    const { error: insertErr } = await supabase
      .from('character_nicknames' as never)
      .insert({
        character_id: ctx.characterId,
        campaign_id: ctx.campaignId ?? null,
        battle_id: ctx.battleId ?? null,
        nickname: proposal.nickname,
        source_type: proposal.sourceType,
        source_name: proposal.sourceName ?? null,
        tone: proposal.tone,
        reason: proposal.reason,
        first_scene_ref: ctx.sceneRef ?? null,
        confidence: proposal.confidence,
        is_public: proposal.sourceType === 'public' || proposal.tone === 'legendary',
        replaces_nickname_id: proposal.replacesNicknameId ?? null,
        metadata: {
          reasonsBreakdown: proposal.reasons,
          usageGuidance: proposal.usageGuidance,
        },
      } as never);
    if (insertErr) {
      console.warn('[nickname] insert failed', insertErr);
    } else {
      persisted = true;
      // If we evolved an existing one, mark the previous as replaced.
      if (proposal.replacesNicknameId) {
        await supabase
          .from('character_nicknames' as never)
          .update({ status: 'replaced' } as never)
          .eq('id', proposal.replacesNicknameId);
      }
    }
  } catch (e) {
    console.warn('[nickname] unexpected persist error', e);
  }

  return { proposal, acceptedNickname: proposal.nickname, persisted };
}
