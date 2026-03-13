/**
 * Character Book - Chapter data builder
 * Converts character data into book chapters for the Character Book UI.
 */

export interface CharacterBookChapter {
  id: string;
  title: string;
  icon: string;
  sections: CharacterBookSection[];
}

export interface CharacterBookSection {
  title: string;
  content?: string;
  items?: { label: string; value: string }[];
  listItems?: string[];
  component?: string; // reference to a dynamic component to render
}

export interface CharacterBookData {
  id: string;
  name: string;
  level: number;
  image_url?: string | null;
  race?: string | null;
  sub_race?: string | null;
  age?: number | null;
  home_planet?: string | null;
  home_moon?: string | null;
  lore?: string | null;
  powers?: string | null;
  abilities?: string | null;
  weapons_items?: string | null;
  personality?: string | null;
  mentality?: string | null;
  appearance_height?: string | null;
  appearance_build?: string | null;
  appearance_hair?: string | null;
  appearance_eyes?: string | null;
  appearance_distinct_features?: string | null;
  appearance_clothing_style?: string | null;
  appearance_aura?: string | null;
  appearance_description?: string | null;
  appearance_posture?: string | null;
  appearance_voice?: string | null;
  appearance_movement_style?: string | null;
  appearance_typical_expression?: string | null;
  stat_intelligence?: number | null;
  stat_strength?: number | null;
  stat_power?: number | null;
  stat_speed?: number | null;
  stat_durability?: number | null;
  stat_stamina?: number | null;
  stat_skill?: number | null;
  stat_luck?: number | null;
  stat_battle_iq?: number | null;
  created_at?: string;
}

export interface NarratorSentimentData {
  nickname?: string | null;
  sentiment_score?: number;
  opinion_summary?: string | null;
  personality_notes?: string | null;
  memorable_moments?: string[];
  // Relationship dimensions
  relationship_stage?: string | null;
  curiosity?: number;
  respect?: number;
  trust?: number;
  amusement?: number;
  disappointment?: number;
  intrigue?: number;
  story_value?: number;
  // Behavior patterns
  creativity_score?: number;
  world_interaction_score?: number;
  npc_interaction_score?: number;
  exploration_score?: number;
  combat_style_score?: number;
  story_engagement_score?: number;
  // Story compatibility
  story_compatibility?: number;
  // Observations & nickname history
  narrator_observations?: string[];
  nickname_history?: string[];
}

// ── Helper functions for narrator sentiment display ──

function deriveRelationshipStage(score: number, sentiment: NarratorSentimentData): string {
  const avg = ((sentiment.curiosity ?? 50) + (sentiment.respect ?? 50) + (sentiment.trust ?? 50) +
    (sentiment.amusement ?? 50) + (sentiment.intrigue ?? 50) + (sentiment.story_value ?? 50)) / 6;
  const dis = sentiment.disappointment ?? 0;
  if (dis > 70) return 'disappointed';
  if (dis > 50 && avg < 30) return 'irritated';
  if (avg < 25) return 'unimpressed';
  if (avg < 35) return 'dismissive';
  if (avg >= 80) return 'beloved_storyteller';
  if (avg >= 65) return 'compelling';
  if (avg >= 55) return 'noteworthy';
  if (avg >= 45) return 'interesting';
  if (avg >= 35) return 'observed';
  return 'unknown';
}

function getStageDisplay(stage: string): string {
  const map: Record<string, string> = {
    unknown: '👁️ Unknown — "I haven\'t formed an opinion yet"',
    observed: '🔍 Observed — "I\'m watching them"',
    interesting: '✨ Interesting — "They\'ve caught my attention"',
    noteworthy: '📝 Noteworthy — "There is something about them"',
    compelling: '🌟 Compelling — "I find myself drawn to their story"',
    beloved_storyteller: '💕 Beloved Storyteller — "They bring my world to life"',
    dismissive: '😶 Dismissive — "Hardly worth the ink"',
    unimpressed: '😒 Unimpressed — "They rush through my worlds"',
    irritated: '😤 Irritated — "They waste the stories I give them"',
    disappointed: '💔 Disappointed — "I expected more"',
  };
  return map[stage] || map.unknown;
}

function getDimensionLabel(value: number, isNegative = false): string {
  if (isNegative) {
    if (value >= 80) return '💢 Deep — "This one truly frustrates me"';
    if (value >= 60) return '😔 Growing — "I notice their indifference"';
    if (value >= 40) return '😐 Mild — "Small things, but they add up"';
    if (value >= 20) return '🤷 Slight — "A passing thought"';
    return '✨ Minimal — "Nothing worth noting"';
  }
  if (value >= 85) return '🔥 Extraordinary';
  if (value >= 70) return '⭐ High';
  if (value >= 55) return '📈 Growing';
  if (value >= 40) return '📊 Moderate';
  if (value >= 25) return '📉 Low';
  return '❄️ Minimal';
}

function getBehaviorLabel(value: number): string {
  if (value >= 80) return '🌟 Exceptional';
  if (value >= 65) return '✨ Strong';
  if (value >= 50) return '📊 Average';
  if (value >= 35) return '📉 Below Average';
  return '⚠️ Lacking';
}

function getStoryCompatibilityText(value: number): string {
  if (value >= 80) return '"Their choices weave perfectly into the tale I\'m telling. It\'s as if they can feel where the story wants to go."';
  if (value >= 60) return '"They follow the threads I lay down, sometimes in ways I didn\'t expect."';
  if (value >= 40) return '"They walk their own path. Not always where the story leads, but not against it either."';
  if (value >= 20) return '"They seem unaware of the larger story unfolding around them."';
  return '"They ignore every hook, every thread, every door I open for them."';
}

export function buildCharacterBookChapters(
  character: CharacterBookData,
  extras?: {
    timelineEvents?: any[];
    storyPoints?: any[];
    loreSections?: any[];
    campaignHistory?: any[];
    groups?: any[];
    narratorSentiment?: NarratorSentimentData | null;
  }
): CharacterBookChapter[] {
  const chapters: CharacterBookChapter[] = [];

  // 1. Character Overview
  const overviewSections: CharacterBookSection[] = [];
  const infoItems: { label: string; value: string }[] = [
    { label: 'Name', value: character.name },
    { label: 'Tier', value: String(character.level) },
  ];
  if (character.race) infoItems.push({ label: 'Race', value: character.race });
  if (character.sub_race) infoItems.push({ label: 'Sub-Race', value: character.sub_race });
  if (character.age) infoItems.push({ label: 'Age', value: String(character.age) });
  if (character.created_at) infoItems.push({ label: 'Created', value: new Date(character.created_at).toLocaleDateString() });

  overviewSections.push({ title: 'Basic Information', items: infoItems });
  if (character.personality) overviewSections.push({ title: 'Personality', content: character.personality });
  if (character.mentality) overviewSections.push({ title: 'Mentality', content: character.mentality });

  chapters.push({ id: 'overview', title: 'Character Overview', icon: '👤', sections: overviewSections });

  // Narrator's View (sentiment chapter — only if sentiment data exists)
  const sentiment = extras?.narratorSentiment;
  if (sentiment && (sentiment.nickname || sentiment.opinion_summary || (sentiment.sentiment_score !== undefined && sentiment.sentiment_score !== 0))) {
    const sentimentSections: CharacterBookSection[] = [];
    const score = sentiment.sentiment_score ?? 0;

    // Relationship stage display
    const stage = sentiment.relationship_stage || deriveRelationshipStage(score, sentiment);
    const stageDisplay = getStageDisplay(stage);

    const sentimentItems: { label: string; value: string }[] = [
      { label: 'The Narrator Calls Them', value: sentiment.nickname ? `"${sentiment.nickname}"` : 'No nickname yet' },
      { label: 'Relationship', value: stageDisplay },
    ];
    sentimentSections.push({ title: 'Narrator\'s Impression', items: sentimentItems });

    if (sentiment.opinion_summary) {
      sentimentSections.push({ title: 'Her Private Thoughts', content: `"${sentiment.opinion_summary}"` });
    }

    // Relationship dimensions
    const dims = [
      { label: 'Curiosity', value: sentiment.curiosity, icon: '🔍', desc: 'How interested she is in what they\'ll do next' },
      { label: 'Respect', value: sentiment.respect, icon: '👑', desc: 'How much she admires their actions' },
      { label: 'Trust', value: sentiment.trust, icon: '🤝', desc: 'Whether she believes they act with purpose' },
      { label: 'Amusement', value: sentiment.amusement, icon: '😏', desc: 'How entertaining their actions are' },
      { label: 'Intrigue', value: sentiment.intrigue, icon: '🌀', desc: 'How mysterious or unpredictable they are' },
      { label: 'Story Value', value: sentiment.story_value, icon: '📖', desc: 'How important she thinks they are to the story' },
    ].filter(d => d.value !== undefined && d.value !== 50);

    if (dims.length > 0) {
      sentimentSections.push({
        title: 'How She Sees Them',
        items: dims.map(d => ({
          label: `${d.icon} ${d.label}`,
          value: getDimensionLabel(d.value!),
        })),
      });
    }

    // Disappointment (shown separately if notable)
    if (sentiment.disappointment !== undefined && sentiment.disappointment > 15) {
      sentimentSections.push({
        title: '😔 Her Disappointment',
        content: getDimensionLabel(sentiment.disappointment, true),
      });
    }

    // Behavior patterns observed
    const behaviors = [
      { label: 'Creativity', value: sentiment.creativity_score },
      { label: 'World Interaction', value: sentiment.world_interaction_score },
      { label: 'NPC Engagement', value: sentiment.npc_interaction_score },
      { label: 'Exploration', value: sentiment.exploration_score },
      { label: 'Combat Style', value: sentiment.combat_style_score },
      { label: 'Story Engagement', value: sentiment.story_engagement_score },
    ].filter(b => b.value !== undefined && b.value !== 50);

    if (behaviors.length > 0) {
      sentimentSections.push({
        title: 'Behavior Patterns Observed',
        items: behaviors.map(b => ({
          label: b.label,
          value: getBehaviorLabel(b.value!),
        })),
      });
    }

    // Story compatibility
    if (sentiment.story_compatibility !== undefined && sentiment.story_compatibility !== 50) {
      sentimentSections.push({
        title: '🎭 Story Compatibility',
        content: getStoryCompatibilityText(sentiment.story_compatibility),
      });
    }

    if (sentiment.personality_notes) {
      sentimentSections.push({ title: 'What She\'s Noticed', content: sentiment.personality_notes });
    }

    // Narrator observations (journal margin notes)
    if (sentiment.narrator_observations && sentiment.narrator_observations.length > 0) {
      sentimentSections.push({
        title: '📝 Narrator\'s Journal',
        listItems: sentiment.narrator_observations.slice(-8).map(o => `"${o}"`),
      });
    }

    if (sentiment.memorable_moments && sentiment.memorable_moments.length > 0) {
      sentimentSections.push({ 
        title: 'Moments She Remembers', 
        listItems: sentiment.memorable_moments.slice(-10),
      });
    }

    // Nickname evolution
    if (sentiment.nickname_history && sentiment.nickname_history.length > 1) {
      sentimentSections.push({
        title: '🏷️ Evolving Nicknames',
        listItems: sentiment.nickname_history.slice(-6),
      });
    }

    chapters.push({ id: 'narrator-view', title: 'The Narrator\'s View', icon: '🔮', sections: sentimentSections });
  }

  // 2. Identity & Origin
  const identitySections: CharacterBookSection[] = [];
  const originItems: { label: string; value: string }[] = [];
  if (character.race) originItems.push({ label: 'Race', value: character.race });
  if (character.sub_race) originItems.push({ label: 'Sub-Race', value: character.sub_race });
  if (character.home_planet) originItems.push({ label: 'Home Planet', value: character.home_planet });
  if (character.home_moon) originItems.push({ label: 'Home Moon', value: character.home_moon });
  if (originItems.length > 0) identitySections.push({ title: 'Origins', items: originItems });
  if (character.lore) identitySections.push({ title: 'Background & Backstory', content: character.lore });
  if (identitySections.length === 0) identitySections.push({ title: 'Origins', content: 'No origin details recorded yet.' });

  chapters.push({ id: 'identity', title: 'Identity & Origin', icon: '🌍', sections: identitySections });

  // 3. Appearance
  const appearanceSections: CharacterBookSection[] = [];
  if (character.appearance_description) appearanceSections.push({ title: 'General Description', content: character.appearance_description });
  const physicalItems: { label: string; value: string }[] = [];
  if (character.appearance_height) physicalItems.push({ label: 'Height', value: character.appearance_height });
  if (character.appearance_build) physicalItems.push({ label: 'Build', value: character.appearance_build });
  if (character.appearance_hair) physicalItems.push({ label: 'Hair', value: character.appearance_hair });
  if (character.appearance_eyes) physicalItems.push({ label: 'Eyes', value: character.appearance_eyes });
  if (character.appearance_distinct_features) physicalItems.push({ label: 'Distinct Features', value: character.appearance_distinct_features });
  if (physicalItems.length > 0) appearanceSections.push({ title: 'Physical Traits', items: physicalItems });
  const styleItems: { label: string; value: string }[] = [];
  if (character.appearance_clothing_style) styleItems.push({ label: 'Clothing Style', value: character.appearance_clothing_style });
  if (character.appearance_aura) styleItems.push({ label: 'Aura / Presence', value: character.appearance_aura });
  if (character.appearance_posture) styleItems.push({ label: 'Posture', value: character.appearance_posture });
  if (character.appearance_voice) styleItems.push({ label: 'Voice', value: character.appearance_voice });
  if (character.appearance_movement_style) styleItems.push({ label: 'Movement Style', value: character.appearance_movement_style });
  if (character.appearance_typical_expression) styleItems.push({ label: 'Typical Expression', value: character.appearance_typical_expression });
  if (styleItems.length > 0) appearanceSections.push({ title: 'Style & Presence', items: styleItems });
  if (appearanceSections.length === 0) appearanceSections.push({ title: 'Appearance', content: 'No appearance details recorded yet.' });

  chapters.push({ id: 'appearance', title: 'Appearance', icon: '🪞', sections: appearanceSections });

  // 4. Character Timeline
  const timelineSections: CharacterBookSection[] = [];
  if (extras?.timelineEvents && extras.timelineEvents.length > 0) {
    for (const event of extras.timelineEvents) {
      const tagStr = event.tags?.length > 0 ? `Tags: ${event.tags.join(', ')}` : '';
      const weightStr = '❤️'.repeat(event.emotional_weight || 1);
      timelineSections.push({
        title: `${event.age_or_year ? `[${event.age_or_year}] ` : ''}${event.event_title || 'Untitled Event'}`,
        content: [event.event_description, tagStr, `Emotional Weight: ${weightStr}`].filter(Boolean).join('\n\n'),
      });
    }
  } else {
    timelineSections.push({ title: 'Timeline', content: 'No timeline events recorded yet.' });
  }
  chapters.push({ id: 'timeline', title: 'Character Timeline', icon: '📜', sections: timelineSections });

  // 5. Core Story Points
  const storySections: CharacterBookSection[] = [];
  if (extras?.storyPoints && extras.storyPoints.length > 0) {
    for (const sp of extras.storyPoints) {
      storySections.push({ title: sp.title || sp.event_title || 'Story Entry', content: sp.content || sp.event_description || '' });
    }
  }
  if (extras?.loreSections && extras.loreSections.length > 0) {
    for (const ls of extras.loreSections) {
      storySections.push({ title: ls.title, content: ls.body });
    }
  }
  if (storySections.length === 0) storySections.push({ title: 'Core Story Points', content: 'No story points recorded yet.' });
  chapters.push({ id: 'stories', title: 'Core Story Points', icon: '📖', sections: storySections });

  // 6. Abilities & Powers
  const abilitySections: CharacterBookSection[] = [];
  if (character.powers) abilitySections.push({ title: 'Base Power', content: character.powers });
  if (character.abilities) abilitySections.push({ title: 'Abilities & Techniques', content: character.abilities });

  // Stats
  const statItems: { label: string; value: string }[] = [];
  const statMap: Record<string, number | null | undefined> = {
    Intelligence: character.stat_intelligence,
    Strength: character.stat_strength,
    Power: character.stat_power,
    Speed: character.stat_speed,
    Durability: character.stat_durability,
    Stamina: character.stat_stamina,
    Skill: character.stat_skill,
    Luck: character.stat_luck,
    'Battle IQ': character.stat_battle_iq,
  };
  for (const [label, val] of Object.entries(statMap)) {
    if (val != null) statItems.push({ label, value: `${val}/100` });
  }
  if (statItems.length > 0) abilitySections.push({ title: 'Stats', items: statItems });
  if (abilitySections.length === 0) abilitySections.push({ title: 'Abilities', content: 'No abilities recorded yet.' });

  chapters.push({ id: 'abilities', title: 'Abilities & Powers', icon: '⚡', sections: abilitySections });

  // 7. Relationships
  chapters.push({
    id: 'relationships',
    title: 'Relationships',
    icon: '🤝',
    sections: [{ title: 'Relationships', component: 'relationships' }],
  });

  // 8. Teams
  const teamSections: CharacterBookSection[] = [];
  if (extras?.groups && extras.groups.length > 0) {
    for (const g of extras.groups) {
      teamSections.push({ title: g.name, content: g.description || 'No description.' });
    }
  } else {
    teamSections.push({ title: 'Teams', content: 'Not a member of any teams yet.' });
  }
  chapters.push({ id: 'teams', title: 'Teams', icon: '👥', sections: teamSections });

  // 9. Worlds & Locations
  const worldSections: CharacterBookSection[] = [];
  const worldItems: { label: string; value: string }[] = [];
  if (character.home_planet) worldItems.push({ label: 'Home Planet', value: character.home_planet });
  if (character.home_moon) worldItems.push({ label: 'Home Moon', value: character.home_moon });
  if (worldItems.length > 0) worldSections.push({ title: 'Home World', items: worldItems });
  else worldSections.push({ title: 'Worlds', content: 'No world information recorded.' });
  chapters.push({ id: 'worlds', title: 'Worlds & Locations', icon: '🌌', sections: worldSections });

  // 10. Campaign History
  const campaignSections: CharacterBookSection[] = [];
  if (extras?.campaignHistory && extras.campaignHistory.length > 0) {
    for (const ch of extras.campaignHistory) {
      campaignSections.push({ title: ch.name || 'Campaign', content: ch.description || ch.status || '' });
    }
  } else {
    campaignSections.push({ title: 'Campaign History', content: 'No campaign history yet.' });
  }
  chapters.push({ id: 'campaigns', title: 'Campaign History', icon: '⚔️', sections: campaignSections });

  // 11. Inventory & Items
  const inventorySections: CharacterBookSection[] = [];
  if (character.weapons_items) {
    try {
      const parsed = JSON.parse(character.weapons_items);
      if (Array.isArray(parsed)) {
        for (const item of parsed.filter((i: any) => i.name?.trim())) {
          inventorySections.push({ title: `⚔️ ${item.name}`, content: item.description || '' });
        }
      }
    } catch {
      inventorySections.push({ title: 'Weapons & Items', content: character.weapons_items });
    }
  }
  if (inventorySections.length === 0) inventorySections.push({ title: 'Inventory', content: 'No items recorded yet.' });
  chapters.push({ id: 'inventory', title: 'Inventory & Items', icon: '🎒', sections: inventorySections });

  return chapters;
}
