/**
 * My Book – chapter data builder
 *
 * Assembles the user's entire character portfolio into a book:
 *   Table of Contents → Solar System → Characters → Races → Teams → Stories
 *   + individual character sub-pages
 */

export interface MyBookChapter {
  id: string;
  title: string;
  icon: string;
  sections: MyBookSection[];
  /** If set, the ToC entry shows this count badge */
  count?: number;
}

export interface MyBookSection {
  title: string;
  content?: string;
  items?: { label: string; value: string; linkTo?: string }[];
  linkTo?: string;           // route to navigate to on click
  component?: string;        // dynamic component hint
}

export interface MyBookInput {
  characters: {
    id: string;
    name: string;
    level: number;
    race: string | null;
    home_planet: string | null;
    image_url: string | null;
  }[];
  races: {
    id: string;
    name: string;
    description: string | null;
    home_planet: string | null;
  }[];
  groups: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    memberCount: number;
  }[];
  stories: {
    id: string;
    title: string;
    summary: string | null;
    character_id: string | null;
    updated_at: string;
  }[];
  solarSystems: {
    id: string;
    name: string;
    planetCount: number;
  }[];
  campaigns: {
    id: string;
    name: string;
    status: string;
    description: string | null;
  }[];
}

export function buildMyBookChapters(input: MyBookInput): MyBookChapter[] {
  const chapters: MyBookChapter[] = [];

  // ── 1. Solar System ────────────────────────────────────
  const solarSections: MyBookSection[] = [];
  if (input.solarSystems.length > 0) {
    for (const sys of input.solarSystems) {
      solarSections.push({
        title: sys.name,
        content: `${sys.planetCount} planet${sys.planetCount !== 1 ? 's' : ''}`,
        linkTo: `/characters?system=${sys.id}`,
      });
    }
  } else {
    solarSections.push({ title: 'Your Solar System', content: 'Visit the Solar System Map to explore and customise your worlds.', linkTo: '/characters' });
  }
  chapters.push({ id: 'solar-system', title: 'Solar System', icon: '🌌', sections: solarSections, count: input.solarSystems.length });

  // ── 2. Characters ──────────────────────────────────────
  const charSections: MyBookSection[] = [];
  if (input.characters.length > 0) {
    const charItems = input.characters.map(c => ({
      label: c.name,
      value: `Tier ${c.level}${c.race ? ` · ${c.race}` : ''}`,
      linkTo: `/characters/${c.id}`,
    }));
    charSections.push({ title: 'Your Warriors', items: charItems });
  } else {
    charSections.push({ title: 'Characters', content: 'You haven\'t created any characters yet.', linkTo: '/characters/new' });
  }
  chapters.push({ id: 'characters', title: 'Characters', icon: '⚔️', sections: charSections, count: input.characters.length });

  // ── 3. Races ───────────────────────────────────────────
  const raceSections: MyBookSection[] = [];
  if (input.races.length > 0) {
    for (const r of input.races) {
      raceSections.push({
        title: r.name,
        content: r.description || 'No description.',
        linkTo: '/races',
      });
    }
  } else {
    raceSections.push({ title: 'Races', content: 'No custom races created yet.', linkTo: '/races' });
  }
  chapters.push({ id: 'races', title: 'Races', icon: '🧬', sections: raceSections, count: input.races.length });

  // ── 4. Teams ───────────────────────────────────────────
  const teamSections: MyBookSection[] = [];
  if (input.groups.length > 0) {
    const teamItems = input.groups.map(g => ({
      label: g.name,
      value: `${g.memberCount} member${g.memberCount !== 1 ? 's' : ''}`,
      linkTo: '/teams',
    }));
    teamSections.push({ title: 'Your Teams', items: teamItems });
  } else {
    teamSections.push({ title: 'Teams', content: 'No teams created yet.', linkTo: '/teams' });
  }
  chapters.push({ id: 'teams', title: 'Teams', icon: '👥', sections: teamSections, count: input.groups.length });

  // ── 5. Stories ─────────────────────────────────────────
  const storySections: MyBookSection[] = [];
  if (input.stories.length > 0) {
    for (const s of input.stories.slice(0, 20)) {
      storySections.push({
        title: s.title,
        content: s.summary || 'No summary.',
        linkTo: '/stories',
      });
    }
  } else {
    storySections.push({ title: 'Stories', content: 'No stories written yet.', linkTo: '/stories' });
  }
  chapters.push({ id: 'stories', title: 'Stories', icon: '📖', sections: storySections, count: input.stories.length });

  // ── 6. Campaigns ───────────────────────────────────────
  const campaignSections: MyBookSection[] = [];
  if (input.campaigns.length > 0) {
    for (const c of input.campaigns) {
      campaignSections.push({
        title: c.name,
        content: `Status: ${c.status}${c.description ? `\n${c.description}` : ''}`,
        linkTo: `/campaigns/${c.id}`,
      });
    }
  } else {
    campaignSections.push({ title: 'Campaigns', content: 'No campaigns joined yet.', linkTo: '/campaigns' });
  }
  chapters.push({ id: 'campaigns', title: 'Campaign History', icon: '🏰', sections: campaignSections, count: input.campaigns.length });

  return chapters;
}
