import { describe, expect, it } from 'vitest';
import type { CampaignMessage } from '@/lib/campaign-types';
import { ChatMessagePresentationResolver } from './ChatMessagePresentationResolver';

describe('ChatMessagePresentationResolver', () => {
  it('renders persisted structured npc records as npc bubbles', () => {
    const message: CampaignMessage = {
      id: 'npc-1',
      campaign_id: 'c1',
      character_id: null,
      sender_type: 'npc',
      channel: 'in_universe',
      content: 'Gone. The light is draining away.',
      dice_result: null,
      theme_snapshot: null,
      metadata: {
        structuredTurnGroupId: 'turn-1',
        structuredTurnSequence: 1,
        structuredMessageKind: 'npc_dialogue',
        speakerName: 'Master Eldrin',
        displaySpeakerName: 'Master Eldrin',
      },
      created_at: '2026-03-19T00:00:00.000Z',
    };

    const [envelope] = ChatMessagePresentationResolver.resolveCampaignMessage(message, {
      knownNpcNames: new Set(['Master Eldrin']),
    });

    expect(envelope.speakerRole).toBe('npc');
    expect(envelope.speakerName).toBe('Master Eldrin');
    expect(envelope.rawType).toBe('speech');
    expect(envelope.content).toBe('Gone. The light is draining away.');
  });

  it('keeps persisted structured narrator records as a single narrator bubble', () => {
    const message: CampaignMessage = {
      id: 'nar-1',
      campaign_id: 'c1',
      character_id: null,
      sender_type: 'narrator',
      channel: 'in_universe',
      content: 'Rain needles across the broken glass.',
      dice_result: null,
      theme_snapshot: null,
      metadata: {
        structuredTurnGroupId: 'turn-1',
        structuredTurnSequence: 0,
        structuredMessageKind: 'narration',
      },
      created_at: '2026-03-19T00:00:00.000Z',
    };

    const envelopes = ChatMessagePresentationResolver.resolveCampaignMessage(message);

    expect(envelopes).toHaveLength(1);
    expect(envelopes[0].speakerRole).toBe('narrator');
    expect(envelopes[0].rawType).toBe('narration');
  });

  it('still supports legacy mixed narrator messages for backwards compatibility', () => {
    const message: CampaignMessage = {
      id: 'legacy-1',
      campaign_id: 'c1',
      character_id: null,
      sender_type: 'narrator',
      channel: 'in_universe',
      content: 'Master Eldrin looks up. "Gone," he says.',
      dice_result: null,
      theme_snapshot: null,
      metadata: null,
      created_at: '2026-03-19T00:00:00.000Z',
    };

    const envelopes = ChatMessagePresentationResolver.resolveCampaignMessage(message, {
      knownNpcNames: new Set(['Master Eldrin']),
    });

    expect(envelopes.length).toBeGreaterThan(1);
    expect(envelopes.some((envelope) => envelope.speakerRole === 'narrator')).toBe(true);
    expect(envelopes.some((envelope) => envelope.rawType === 'speech')).toBe(true);
  });
});
