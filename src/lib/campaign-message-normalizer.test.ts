import { describe, expect, it } from 'vitest';
import type { CampaignMessage } from '@/lib/campaign-types';
import {
  CHAT_MESSAGE_METADATA_ALLOWLIST,
  normalizeNarrationToCampaignMessages,
  sortCampaignMessagesForDisplay,
} from './campaign-message-normalizer';

describe('campaign-message-normalizer', () => {
  it('keeps solo narration second-person after an initial named reference', () => {
    const messages = normalizeNarrationToCampaignMessages({
      campaignId: 'c1',
      rawNarration: 'QwWe steps into the gallery, the cold air pressing against his skin. You feel the hum before you identify its source.',
      focalCharacterName: 'QwWe',
      isSolo: true,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].sender_type).toBe('narrator');
    expect(messages[0].content).toContain('You feel the hum');
  });

  it('removes ambiguous second-person narration in multiplayer narrator bubbles', () => {
    const messages = normalizeNarrationToCampaignMessages({
      campaignId: 'c1',
      rawNarration: 'You cross the flooded hall and your boots leave dark streaks.',
      focalCharacterName: 'QwWe',
      isSolo: false,
    });

    expect(messages[0].content).toBe("QwWe cross the flooded hall and QwWe's boots leave dark streaks.");
  });

  it('splits atmospheric setup and multiple NPC speakers into ordered separate bubbles', () => {
    const messages = normalizeNarrationToCampaignMessages({
      campaignId: 'c1',
      rawNarration: 'Rain needles across the broken glass. Master Eldrin says, "Gone. The light is draining away." Lyra Vance says, "It started before dawn."',
      knownNpcNames: new Set(['Master Eldrin', 'Lyra Vance']),
      focalCharacterName: 'QwWe',
      isSolo: true,
    });

    expect(messages.map((message) => [message.sender_type, message.content])).toEqual([
      ['narrator', 'Rain needles across the broken glass.'],
      ['npc', 'Gone. The light is draining away.'],
      ['npc', 'It started before dawn.'],
    ]);
    expect(messages[1].metadata?.speakerName).toBe('Master Eldrin');
    expect(messages[2].metadata?.speakerName).toBe('Lyra Vance');
  });

  it('keeps low-confidence unattributed speech inside narrator exposition', () => {
    const messages = normalizeNarrationToCampaignMessages({
      campaignId: 'c1',
      rawNarration: 'The old hall answers with a thin echo: "not all doors stay shut." Dust drifts from the ceiling.',
      focalCharacterName: 'QwWe',
      isSolo: true,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].sender_type).toBe('narrator');
  });

  it('preserves turn sequence ordering on refresh sorting', () => {
    const messages: CampaignMessage[] = [
      {
        id: 'b',
        campaign_id: 'c1',
        character_id: null,
        sender_type: 'npc',
        channel: 'in_universe',
        content: 'Second',
        dice_result: null,
        theme_snapshot: null,
        metadata: { structuredTurnGroupId: 'turn-1', structuredTurnSequence: 1 },
        created_at: '2026-03-19T00:00:00.000Z',
      },
      {
        id: 'a',
        campaign_id: 'c1',
        character_id: null,
        sender_type: 'narrator',
        channel: 'in_universe',
        content: 'First',
        dice_result: null,
        theme_snapshot: null,
        metadata: { structuredTurnGroupId: 'turn-1', structuredTurnSequence: 0 },
        created_at: '2026-03-19T00:00:00.000Z',
      },
    ];

    expect(sortCampaignMessagesForDisplay(messages).map((message) => message.content)).toEqual(['First', 'Second']);
  });

  it('never returns a mixed narrator and NPC payload as a single message object', () => {
    const messages = normalizeNarrationToCampaignMessages({
      campaignId: 'c1',
      rawNarration: 'Master Eldrin looks up. "Gone," he says.',
      knownNpcNames: new Set(['Master Eldrin']),
      focalCharacterName: 'QwWe',
      isSolo: true,
    });

    expect(messages.length).toBeGreaterThan(1);
    expect(messages.some((message) => message.sender_type === 'narrator')).toBe(true);
    expect(messages.some((message) => message.sender_type === 'npc')).toBe(true);
  });

  describe('lightweight chat metadata persistence', () => {
    const heavyBaseMetadata = {
      // ── Heavy fields that MUST be stripped from chat rows ──
      generatedPackets: { actorIdentity: { combatIdentity: ['x'.repeat(50_000)] } },
      contextPacket: { lore: 'x'.repeat(40_000) },
      conversationHistory: Array.from({ length: 200 }, (_, i) => ({ role: 'user', content: `m${i}` })),
      playerCharacter: { lore: 'x'.repeat(20_000), powers: 'x'.repeat(20_000) },
      sceneEffectPacket: { everything: 'x'.repeat(30_000) },
      worldState: { everything: 'x'.repeat(30_000) },
      narrationContext: { everything: 'x'.repeat(30_000) },

      // ── Lightweight rendering fields that MUST be preserved ──
      narratorPlayback: { context: 'combat', voiceRate: 1.05, soundCue: 'sword_clash' },
      scenePresentationProfile: { tone: 'tense' },
      chatPresentationTags: ['urgent'],
      narrationFlavorTags: ['grim'],
      mapEffectTags: ['fire'],
      intentDebug: { intent: 'attack' },
    };

    it('strips heavy generated/lore packets from chat-row metadata', () => {
      const messages = normalizeNarrationToCampaignMessages({
        campaignId: 'c1',
        rawNarration: 'The blade hums.',
        baseMetadata: heavyBaseMetadata,
        focalCharacterName: 'QwWe',
        isSolo: true,
      });

      const heavyKeys = ['generatedPackets', 'contextPacket', 'conversationHistory', 'playerCharacter', 'sceneEffectPacket', 'worldState', 'narrationContext'];
      for (const message of messages) {
        const meta = (message.metadata ?? {}) as Record<string, unknown>;
        for (const key of heavyKeys) {
          expect(meta[key]).toBeUndefined();
        }
      }
    });

    it('preserves rendering / playback / grouping fields needed by chat bubbles', () => {
      const messages = normalizeNarrationToCampaignMessages({
        campaignId: 'c1',
        rawNarration: 'The blade hums.',
        baseMetadata: heavyBaseMetadata,
        focalCharacterName: 'QwWe',
        isSolo: true,
      });

      const meta = (messages[0].metadata ?? {}) as Record<string, unknown>;
      expect(meta.narratorPlayback).toBeDefined();
      expect(meta.scenePresentationProfile).toBeDefined();
      expect(meta.chatPresentationTags).toEqual(['urgent']);
      expect(meta.narrationFlavorTags).toEqual(['grim']);
      expect(meta.mapEffectTags).toEqual(['fire']);
      expect(meta.intentDebug).toBeDefined();
      expect(meta.structuredTurnGroupId).toBeTruthy();
      expect(meta.structuredMessageKind).toBeTruthy();
      expect(typeof meta.structuredTurnSequence).toBe('number');
    });

    it('does not duplicate heavy payloads across multiple beats in the same response group', () => {
      const messages = normalizeNarrationToCampaignMessages({
        campaignId: 'c1',
        rawNarration: 'Rain needles across the broken glass. Master Eldrin says, "Gone."',
        baseMetadata: heavyBaseMetadata,
        knownNpcNames: new Set(['Master Eldrin']),
        focalCharacterName: 'QwWe',
        isSolo: true,
      });

      expect(messages.length).toBeGreaterThan(1);

      // Combined chat-row payload must remain compact even when there are
      // many beats — this is the regression that broke NPC dialogue.
      const totalBytes = JSON.stringify(messages.map((m) => m.metadata ?? {})).length;
      expect(totalBytes).toBeLessThan(20_000);

      // And every row shares the same group id, so background state stays linkable.
      const groupIds = new Set(messages.map((m) => (m.metadata as any)?.structuredTurnGroupId));
      expect(groupIds.size).toBe(1);
    });

    it('only persists keys that are explicitly on the allowlist', () => {
      const messages = normalizeNarrationToCampaignMessages({
        campaignId: 'c1',
        rawNarration: 'The blade hums.',
        baseMetadata: { ...heavyBaseMetadata, someBrandNewHugeField: 'x'.repeat(50_000) },
        focalCharacterName: 'QwWe',
        isSolo: true,
      });

      for (const message of messages) {
        const meta = (message.metadata ?? {}) as Record<string, unknown>;
        for (const key of Object.keys(meta)) {
          expect(CHAT_MESSAGE_METADATA_ALLOWLIST.has(key)).toBe(true);
        }
      }
    });
  });
});
