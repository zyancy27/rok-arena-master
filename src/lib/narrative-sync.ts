/**
 * Character Narrative Sync System
 * 
 * Bidirectional sync between Character Timeline events and Stories.
 * Tracks origin via origin_type and origin_id columns.
 */

import { supabase } from '@/integrations/supabase/client';

export type OriginType = 'manual' | 'story' | 'campaign_event';

/**
 * When a story is created/updated with linked characters,
 * auto-generate timeline events for each character.
 */
export async function syncStoryToTimeline(
  storyId: string,
  storyTitle: string,
  storyContent: string,
  characterIds: string[],
  userId: string,
) {
  for (const characterId of characterIds) {
    // Check if a timeline event already exists for this story+character
    const { data: existing } = await supabase
      .from('character_timeline_events')
      .select('id')
      .eq('character_id', characterId)
      .eq('origin_type' as any, 'story')
      .eq('origin_id' as any, storyId)
      .maybeSingle();

    const summary = storyContent.length > 200
      ? storyContent.slice(0, 200) + '…'
      : storyContent;

    const tags = extractStoryTags(storyContent);

    if (existing) {
      // Update existing timeline event
      await supabase
        .from('character_timeline_events')
        .update({
          event_title: storyTitle,
          event_description: summary,
          tags,
        } as any)
        .eq('id', existing.id);
    } else {
      // Create new timeline event
      await supabase
        .from('character_timeline_events')
        .insert({
          character_id: characterId,
          user_id: userId,
          event_title: storyTitle,
          event_description: summary,
          tags,
          emotional_weight: 3,
          visibility: 'public',
          sort_order: 999, // append at end
          origin_type: 'story',
          origin_id: storyId,
        } as any);
    }
  }
}

/**
 * When a timeline event is created/updated manually,
 * no automatic story creation — but we track it for display
 * in the Stories page under "Core Story Points".
 */

/**
 * Remove timeline events that were synced from a deleted story.
 */
export async function removeStoryTimelineEvents(storyId: string) {
  await supabase
    .from('character_timeline_events')
    .delete()
    .eq('origin_type' as any, 'story')
    .eq('origin_id' as any, storyId);
}

/**
 * Extract simple tags from story content based on keyword matching.
 */
function extractStoryTags(content: string): string[] {
  const tagKeywords: Record<string, string[]> = {
    war: ['war', 'battle', 'fought', 'combat', 'siege'],
    loss: ['loss', 'lost', 'died', 'death', 'grief', 'mourning'],
    betrayal: ['betray', 'betrayal', 'traitor', 'deceive'],
    redemption: ['redeem', 'redemption', 'forgive', 'atone'],
    training: ['train', 'training', 'practice', 'mentor', 'learn'],
    family: ['family', 'father', 'mother', 'brother', 'sister', 'child'],
    discovery: ['discover', 'found', 'revelation', 'uncover'],
    love: ['love', 'heart', 'romance', 'beloved'],
    sacrifice: ['sacrifice', 'gave up', 'selfless'],
    exile: ['exile', 'banish', 'outcast', 'wander'],
  };

  const lower = content.toLowerCase();
  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 5);
}

/**
 * Fetch timeline events and lore sections for a character
 * to display as "Core Story Points" in the Stories page.
 */
export async function fetchCharacterStoryPoints(characterId: string) {
  const [timelineRes, sectionsRes] = await Promise.all([
    supabase
      .from('character_timeline_events')
      .select('*')
      .eq('character_id', characterId)
      .eq('visibility', 'public')
      .order('sort_order', { ascending: true }),
    supabase
      .from('character_sections')
      .select('*')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true }),
  ]);

  return {
    timelineEvents: (timelineRes.data || []) as any[],
    loreSections: (sectionsRes.data || []) as any[],
  };
}
