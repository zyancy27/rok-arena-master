/**
 * My Book – Hierarchical book data builder
 *
 * Structure: Part → Chapter → Section → Subsection
 * (Classic textbook / encyclopedia layout)
 */

export interface MyBookSubsection {
  title: string;
  content?: string;
  linkTo?: string;
}

export interface MyBookSection {
  id: string;
  title: string;
  content?: string;
  linkTo?: string;
  subsections?: MyBookSubsection[];
}

export interface MyBookChapter {
  id: string;
  number: number;
  title: string;
  sections: MyBookSection[];
}

export interface MyBookPart {
  id: string;
  number: number;       // Roman numeral display
  title: string;
  icon: string;
  chapters: MyBookChapter[];
  /** Badge count for ToC */
  count?: number;
}

/** A single renderable page in the book */
export type MyBookPage =
  | { type: 'toc' }
  | { type: 'part-divider'; part: MyBookPart }
  | { type: 'chapter'; part: MyBookPart; chapter: MyBookChapter };

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

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function buildMyBook(input: MyBookInput): { parts: MyBookPart[]; pages: MyBookPage[] } {
  const parts: MyBookPart[] = [];
  let chapterNum = 0;

  // ── Part I: Solar System ─────────────────────────────
  {
    const chapters: MyBookChapter[] = [];

    if (input.solarSystems.length > 0) {
      for (const sys of input.solarSystems) {
        chapterNum++;
        chapters.push({
          id: `solar-${sys.id}`,
          number: chapterNum,
          title: sys.name,
          sections: [
            {
              id: `solar-${sys.id}-overview`,
              title: 'Overview',
              content: `${sys.planetCount} planet${sys.planetCount !== 1 ? 's' : ''} in this system.`,
              linkTo: `/characters?system=${sys.id}`,
            },
          ],
        });
      }
    } else {
      chapterNum++;
      chapters.push({
        id: 'solar-empty',
        number: chapterNum,
        title: 'Your Solar System',
        sections: [{
          id: 'solar-empty-info',
          title: 'Getting Started',
          content: 'Visit the Solar System Map to explore and customise your worlds.',
          linkTo: '/characters',
        }],
      });
    }

    parts.push({
      id: 'solar-system',
      number: 1,
      title: 'Solar System',
      icon: '🌌',
      chapters,
      count: input.solarSystems.length,
    });
  }

  // ── Part II: Characters ──────────────────────────────
  {
    const chapters: MyBookChapter[] = [];

    if (input.characters.length > 0) {
      for (const c of input.characters) {
        chapterNum++;
        const sections: MyBookSection[] = [
          {
            id: `char-${c.id}-identity`,
            title: 'Identity',
            subsections: [
              { title: 'Name', content: c.name },
              { title: 'Tier', content: `${c.level}` },
              ...(c.race ? [{ title: 'Race', content: c.race }] : []),
              ...(c.home_planet ? [{ title: 'Home Planet', content: c.home_planet }] : []),
            ],
            linkTo: `/characters/${c.id}`,
          },
        ];

        chapters.push({
          id: `char-${c.id}`,
          number: chapterNum,
          title: c.name,
          sections,
        });
      }
    } else {
      chapterNum++;
      chapters.push({
        id: 'char-empty',
        number: chapterNum,
        title: 'Characters',
        sections: [{
          id: 'char-empty-info',
          title: 'No Characters',
          content: 'You haven\'t created any characters yet.',
          linkTo: '/characters/new',
        }],
      });
    }

    parts.push({
      id: 'characters',
      number: 2,
      title: 'Characters',
      icon: '⚔️',
      chapters,
      count: input.characters.length,
    });
  }

  // ── Part III: Races ──────────────────────────────────
  {
    const chapters: MyBookChapter[] = [];

    if (input.races.length > 0) {
      for (const r of input.races) {
        chapterNum++;
        const sections: MyBookSection[] = [
          {
            id: `race-${r.id}-desc`,
            title: 'Description',
            content: r.description || 'No description provided.',
          },
        ];
        if (r.home_planet) {
          sections.push({
            id: `race-${r.id}-home`,
            title: 'Homeworld',
            content: r.home_planet,
          });
        }
        chapters.push({
          id: `race-${r.id}`,
          number: chapterNum,
          title: r.name,
          sections,
        });
      }
    } else {
      chapterNum++;
      chapters.push({
        id: 'race-empty',
        number: chapterNum,
        title: 'Races',
        sections: [{
          id: 'race-empty-info',
          title: 'No Races',
          content: 'No custom races created yet.',
          linkTo: '/races',
        }],
      });
    }

    parts.push({
      id: 'races',
      number: 3,
      title: 'Races',
      icon: '🧬',
      chapters,
      count: input.races.length,
    });
  }

  // ── Part IV: Teams ───────────────────────────────────
  {
    const chapters: MyBookChapter[] = [];

    if (input.groups.length > 0) {
      for (const g of input.groups) {
        chapterNum++;
        const sections: MyBookSection[] = [
          {
            id: `team-${g.id}-info`,
            title: 'Team Info',
            subsections: [
              { title: 'Members', content: `${g.memberCount} member${g.memberCount !== 1 ? 's' : ''}` },
              ...(g.description ? [{ title: 'Description', content: g.description }] : []),
            ],
            linkTo: '/teams',
          },
        ];
        chapters.push({
          id: `team-${g.id}`,
          number: chapterNum,
          title: g.name,
          sections,
        });
      }
    } else {
      chapterNum++;
      chapters.push({
        id: 'team-empty',
        number: chapterNum,
        title: 'Teams',
        sections: [{
          id: 'team-empty-info',
          title: 'No Teams',
          content: 'No teams created yet.',
          linkTo: '/teams',
        }],
      });
    }

    parts.push({
      id: 'teams',
      number: 4,
      title: 'Teams',
      icon: '👥',
      chapters,
      count: input.groups.length,
    });
  }

  // ── Part V: Stories ──────────────────────────────────
  {
    const chapters: MyBookChapter[] = [];

    if (input.stories.length > 0) {
      // Group stories into a single chapter with each story as a section
      chapterNum++;
      const sections: MyBookSection[] = input.stories.slice(0, 20).map(s => ({
        id: `story-${s.id}`,
        title: s.title,
        content: s.summary || 'No summary.',
        linkTo: '/stories',
      }));
      chapters.push({
        id: 'stories-all',
        number: chapterNum,
        title: 'Collected Stories',
        sections,
      });
    } else {
      chapterNum++;
      chapters.push({
        id: 'story-empty',
        number: chapterNum,
        title: 'Stories',
        sections: [{
          id: 'story-empty-info',
          title: 'No Stories',
          content: 'No stories written yet.',
          linkTo: '/stories',
        }],
      });
    }

    parts.push({
      id: 'stories',
      number: 5,
      title: 'Stories',
      icon: '📖',
      chapters,
      count: input.stories.length,
    });
  }

  // ── Part VI: Campaign History ────────────────────────
  {
    const chapters: MyBookChapter[] = [];

    if (input.campaigns.length > 0) {
      for (const c of input.campaigns) {
        chapterNum++;
        chapters.push({
          id: `campaign-${c.id}`,
          number: chapterNum,
          title: c.name,
          sections: [
            {
              id: `campaign-${c.id}-status`,
              title: 'Status',
              content: c.status,
            },
            ...(c.description ? [{
              id: `campaign-${c.id}-desc`,
              title: 'Description',
              content: c.description,
            }] : []),
          ],
        });
      }
    } else {
      chapterNum++;
      chapters.push({
        id: 'campaign-empty',
        number: chapterNum,
        title: 'Campaigns',
        sections: [{
          id: 'campaign-empty-info',
          title: 'No Campaigns',
          content: 'No campaigns joined yet.',
          linkTo: '/campaigns',
        }],
      });
    }

    parts.push({
      id: 'campaigns',
      number: 6,
      title: 'Campaign History',
      icon: '🏰',
      chapters,
      count: input.campaigns.length,
    });
  }

  // ── Build flat page array ────────────────────────────
  const pages: MyBookPage[] = [{ type: 'toc' }];
  for (const part of parts) {
    pages.push({ type: 'part-divider', part });
    for (const chapter of part.chapters) {
      pages.push({ type: 'chapter', part, chapter });
    }
  }

  return { parts, pages };
}
