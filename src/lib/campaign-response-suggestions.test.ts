import { describe, expect, it } from 'vitest';
import {
  buildCampaignSuggestionContextKey,
  normalizeCampaignResponseSuggestions,
} from './campaign-response-suggestions';

describe('campaign response suggestion utilities', () => {
  it('normalizes and limits AI suggestion payloads', () => {
    const normalized = normalizeCampaignResponseSuggestions({
      suggestions: [
        { label: 'Ask about the distortion', message: 'Can you explain this distortion?', detail: 'A cautious question.', intent: 'question', confidence: 'high' },
        { label: 'Ask about the distortion', message: 'Can you explain this distortion?', detail: 'Duplicate should be removed.', intent: 'question', confidence: 'high' },
        { label: 'Steady the room', message: 'I brace myself and study the room.', detail: 'A grounded reaction.', intent: 'reaction', confidence: 'medium' },
        { label: 'Check the doorway', message: 'I move toward the doorway, keeping low.', detail: 'A physical action.', intent: 'action', confidence: 'medium' },
        { label: 'Warn the others', message: 'Something is off here. Stay sharp.', detail: 'A spoken warning.', intent: 'dialogue', confidence: 'high' },
        { label: 'Overflow item', message: 'This should be trimmed.', detail: 'Too many results.', intent: 'dialogue', confidence: 'low' },
      ],
    });

    expect(normalized).toHaveLength(4);
    expect(normalized[0].intent).toBe('question');
    expect(normalized.map(item => item.message)).toEqual([
      'Can you explain this distortion?',
      'I brace myself and study the room.',
      'I move toward the doorway, keeping low.',
      'Something is off here. Stay sharp.',
    ]);
  });

  it('builds different refresh keys for different active characters and scenes', () => {
    const shared = {
      campaignId: 'campaign-1',
      currentZone: 'Clocktower',
      timeOfDay: 'night',
      dayCount: 2,
      activeEnemyNames: ['Cultist'],
      knownNpcNames: ['Lyra'],
      recentMessageKeys: ['m1:What was that?'],
    };

    const first = buildCampaignSuggestionContextKey({ ...shared, characterId: 'character-a' });
    const second = buildCampaignSuggestionContextKey({ ...shared, characterId: 'character-b' });
    const shiftedScene = buildCampaignSuggestionContextKey({ ...shared, characterId: 'character-a', currentZone: 'Archive' });

    expect(first).not.toBe(second);
    expect(first).not.toBe(shiftedScene);
  });
});
