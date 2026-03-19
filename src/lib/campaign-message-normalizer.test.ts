import { describe, expect, it } from 'vitest';
import type { CampaignMessage } from '@/lib/campaign-types';
import { normalizeNarrationToCampaignMessages, sortCampaignMessagesForDisplay } from './campaign-message-normalizer';

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
});
