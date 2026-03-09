/**
 * Timeline Integration — Connects character timeline events to
 * the narrative engine systems (Echo, Story Gravity, Pressure, Reflection).
 * 
 * Used by the narrator to seed character-relevant scenarios and memories.
 */

import type { StoryTheme } from './storyGravityEngine';
import type { EchoType } from './characterEchoSystem';

// ── Types ───────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  character_id: string;
  age_or_year: string;
  event_title: string;
  event_description: string;
  tags: string[];
  emotional_weight: number; // 1-5
  visibility: string; // 'public' | 'narrator_only' | 'private'
}

export interface TimelineAnalysis {
  characterId: string;
  definingMoments: TimelineEvent[];
  recurringTags: { tag: string; count: number }[];
  dominantThemes: StoryTheme[];
  echoSeeds: { content: string; echoType: EchoType; weight: number }[];
  narratorContext: string;
}

export interface PartyTimelineAnalysis {
  sharedThemes: { theme: string; characterIds: string[]; count: number }[];
  campaignToneHints: string[];
  npcMotivationSeeds: string[];
  storyHookSuggestions: string[];
}

// ── Tag → Theme Mapping ─────────────────────────────────────────

const TAG_TO_THEME: Record<string, StoryTheme[]> = {
  war: ['survival', 'defiance', 'honor'],
  loss: ['compassion', 'isolation', 'redemption'],
  betrayal: ['revenge', 'defiance', 'isolation'],
  redemption: ['redemption', 'compassion', 'honor'],
  training: ['knowledge_seeking', 'ambition', 'exploration'],
  family: ['protector', 'compassion', 'honor'],
  discovery: ['curiosity', 'exploration', 'knowledge_seeking'],
  love: ['compassion', 'protector'],
  trauma: ['survival', 'isolation', 'defiance'],
  awakening: ['curiosity', 'ambition', 'exploration'],
  exile: ['isolation', 'survival', 'defiance'],
  victory: ['ambition', 'honor'],
  sacrifice: ['protector', 'compassion', 'honor'],
  friendship: ['compassion', 'protector'],
};

// ── Tag → Echo Type Mapping ─────────────────────────────────────

const TAG_TO_ECHO_TYPE: Record<string, EchoType> = {
  war: 'memory',
  loss: 'emotional_moment',
  betrayal: 'relationship_moment',
  redemption: 'value',
  training: 'memory',
  family: 'relationship_moment',
  discovery: 'memory',
  love: 'emotional_moment',
  trauma: 'emotional_moment',
  awakening: 'value',
  exile: 'memory',
  victory: 'decision',
  sacrifice: 'value',
  friendship: 'relationship_moment',
};

// ── Analysis Functions ──────────────────────────────────────────

/**
 * Analyze a single character's timeline events for narrator use.
 */
export function analyzeCharacterTimeline(
  characterId: string,
  events: TimelineEvent[],
): TimelineAnalysis {
  // Filter out private events for narrator
  const narratorEvents = events.filter(e => e.visibility !== 'private');
  
  // Find defining moments (emotional_weight >= 4)
  const definingMoments = narratorEvents
    .filter(e => e.emotional_weight >= 4)
    .sort((a, b) => b.emotional_weight - a.emotional_weight);

  // Count recurring tags
  const tagCounts: Record<string, number> = {};
  for (const ev of narratorEvents) {
    for (const tag of ev.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const recurringTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // Derive dominant themes from tags
  const themeScores: Record<string, number> = {};
  for (const ev of narratorEvents) {
    for (const tag of ev.tags) {
      const themes = TAG_TO_THEME[tag] || [];
      for (const theme of themes) {
        themeScores[theme] = (themeScores[theme] || 0) + ev.emotional_weight;
      }
    }
  }
  const dominantThemes = Object.entries(themeScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([theme]) => theme as StoryTheme);

  // Generate echo seeds from high-weight events
  const echoSeeds = definingMoments.slice(0, 5).map(ev => {
    const primaryTag = ev.tags[0];
    const echoType = primaryTag ? (TAG_TO_ECHO_TYPE[primaryTag] || 'memory') : 'memory';
    return {
      content: `${ev.event_title}: ${ev.event_description}`.slice(0, 200),
      echoType,
      weight: ev.emotional_weight / 5,
    };
  });

  // Build narrator context
  const contextParts: string[] = [];
  if (definingMoments.length > 0) {
    contextParts.push(
      `Defining life moments: ${definingMoments.slice(0, 3).map(e => `"${e.event_title}" (weight ${e.emotional_weight}/5)`).join(', ')}.`
    );
  }
  if (recurringTags.length > 0) {
    const topTags = recurringTags.filter(t => t.count >= 2).slice(0, 5);
    if (topTags.length > 0) {
      contextParts.push(`Recurring life themes: ${topTags.map(t => t.tag).join(', ')}.`);
    }
  }
  if (dominantThemes.length > 0) {
    contextParts.push(`Story gravity from backstory: ${dominantThemes.join(', ')}.`);
  }
  contextParts.push('Use these backstory elements to create character-relevant situations and emotional echoes without forcing outcomes.');

  return {
    characterId,
    definingMoments,
    recurringTags,
    dominantThemes,
    echoSeeds,
    narratorContext: contextParts.join(' '),
  };
}

/**
 * Analyze timeline events across a party to detect shared themes for campaign generation.
 */
export function analyzePartyTimelines(
  characterTimelines: { characterId: string; events: TimelineEvent[] }[],
): PartyTimelineAnalysis {
  // Collect all tags per character
  const tagByCharacter: Record<string, Set<string>> = {};
  for (const { characterId, events } of characterTimelines) {
    tagByCharacter[characterId] = new Set();
    for (const ev of events.filter(e => e.visibility !== 'private')) {
      for (const tag of ev.tags) {
        tagByCharacter[characterId].add(tag);
      }
    }
  }

  // Find shared themes (tags appearing in 2+ characters)
  const allTags = new Set(Object.values(tagByCharacter).flatMap(s => Array.from(s)));
  const sharedThemes: { theme: string; characterIds: string[]; count: number }[] = [];
  for (const tag of allTags) {
    const charIds = Object.entries(tagByCharacter)
      .filter(([, tags]) => tags.has(tag))
      .map(([id]) => id);
    if (charIds.length >= 2) {
      sharedThemes.push({ theme: tag, characterIds: charIds, count: charIds.length });
    }
  }
  sharedThemes.sort((a, b) => b.count - a.count);

  // Generate campaign tone hints
  const campaignToneHints: string[] = [];
  if (sharedThemes.some(t => t.theme === 'war')) campaignToneHints.push('Military conflict undertones suit this party.');
  if (sharedThemes.some(t => t.theme === 'loss')) campaignToneHints.push('Themes of grief and recovery resonate across the party.');
  if (sharedThemes.some(t => t.theme === 'betrayal')) campaignToneHints.push('Trust and deception are central tensions for this group.');
  if (sharedThemes.some(t => t.theme === 'redemption')) campaignToneHints.push('Second chances and atonement drive multiple characters.');
  if (sharedThemes.some(t => t.theme === 'family')) campaignToneHints.push('Found family and loyalty bind this party together.');

  // NPC motivation seeds
  const npcMotivationSeeds: string[] = [];
  for (const st of sharedThemes.slice(0, 3)) {
    switch (st.theme) {
      case 'war': npcMotivationSeeds.push('A war veteran NPC seeking to prevent another conflict.'); break;
      case 'loss': npcMotivationSeeds.push('An NPC dealing with their own recent loss, seeking closure.'); break;
      case 'betrayal': npcMotivationSeeds.push('A former ally NPC whose loyalties are questionable.'); break;
      case 'redemption': npcMotivationSeeds.push('An NPC offering a chance at redemption — but at a cost.'); break;
      case 'training': npcMotivationSeeds.push('A master NPC willing to share forbidden knowledge.'); break;
      case 'family': npcMotivationSeeds.push('An NPC whose family is in danger, mirroring the party\'s bonds.'); break;
    }
  }

  // Story hook suggestions
  const storyHookSuggestions: string[] = [];
  if (sharedThemes.length > 0) {
    storyHookSuggestions.push(`Party shares themes of ${sharedThemes.slice(0, 3).map(t => t.theme).join(', ')} — use these as campaign pillars.`);
  }

  return {
    sharedThemes,
    campaignToneHints,
    npcMotivationSeeds,
    storyHookSuggestions,
  };
}

/**
 * Build a compact narrator prompt from timeline analysis.
 */
export function buildTimelineNarratorPrompt(analysis: TimelineAnalysis): string {
  return analysis.narratorContext;
}

/**
 * Build a campaign-level narrator prompt from party analysis.
 */
export function buildPartyTimelineNarratorPrompt(analysis: PartyTimelineAnalysis): string {
  if (analysis.sharedThemes.length === 0) return '';
  const parts = [
    `Shared party backstory themes: ${analysis.sharedThemes.slice(0, 5).map(t => `${t.theme} (${t.count} characters)`).join(', ')}.`,
    ...analysis.campaignToneHints.slice(0, 2),
    'Weave these shared experiences into campaign events and NPC encounters naturally.',
  ];
  return parts.join(' ');
}
