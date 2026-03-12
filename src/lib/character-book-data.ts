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
    const feeling = score >= 50 ? '💕 Adored' : score >= 20 ? '😊 Liked' : score >= -20 ? '😐 Neutral' : score >= -50 ? '😒 Unimpressed' : '💢 Disliked';
    
    const sentimentItems: { label: string; value: string }[] = [
      { label: 'The Narrator Calls Them', value: sentiment.nickname ? `"${sentiment.nickname}"` : 'No nickname yet' },
      { label: 'How She Feels', value: feeling },
    ];
    sentimentSections.push({ title: 'Narrator\'s Impression', items: sentimentItems });
    
    if (sentiment.opinion_summary) {
      sentimentSections.push({ title: 'Her Opinion', content: `"${sentiment.opinion_summary}"` });
    }
    if (sentiment.personality_notes) {
      sentimentSections.push({ title: 'What She\'s Noticed', content: sentiment.personality_notes });
    }
    if (sentiment.memorable_moments && sentiment.memorable_moments.length > 0) {
      sentimentSections.push({ 
        title: 'Moments She Remembers', 
        listItems: sentiment.memorable_moments.slice(-10),
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
