import { ROK_RULES, POWER_TIERS } from './game-constants';
import type { MechanicKey } from './mechanic-discovery';
import { buildLivingChapters, type LivingBookChapter, type LivingRuleEntry } from './living-rulebook-registry';

export interface RuleSection {
  title: string;
  content: string;
  examples?: string[];
  expandable?: { label: string; content: string }[];
  crossRefs?: { label: string; mechanicKey: MechanicKey }[];
}

export interface BookChapter {
  id: string;
  title: string;
  icon: string;
  sections: RuleSection[];
  isLiving?: boolean;
  hasUnread?: boolean;
  livingEntries?: LivingRuleEntry[];
}

// ── Static chapters (always visible) ────────────────────────

const STATIC_CHAPTERS: BookChapter[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    icon: '📖',
    sections: [
      {
        title: 'Welcome to O.C.R.P.',
        content: 'O.C.R.P. (Original Character Role Play) is a creative combat system where players pit their original characters against each other in turn-based battles narrated by AI. Victory is not determined by raw power alone — creativity, strategy, and storytelling are what crown a true champion.',
        expandable: [
          { label: 'What makes O.C.R.P. unique?', content: 'Unlike traditional RPGs, O.C.R.P. rewards the most creative and unique combatant. A cleverly-written underdog can triumph over a poorly-played powerhouse.' },
          { label: 'How battles work', content: 'Choose your character and an opponent, pick a battle location, then take turns describing attacks, defenses, and strategies. The AI narrates the clash in real-time.' },
        ],
      },
      {
        title: 'Core Philosophy',
        content: 'Winning isn\'t about who can defeat the other. The winner is decided by who was the most creative and unique in combat. We value creativity, originality, and storytelling above raw power.',
      },
      {
        title: 'The Living Rulebook',
        content: 'This rulebook evolves as you play. When you encounter a new mechanic for the first time — a dice roll, a charge attack, a construct — a new page will appear here documenting what you\'ve discovered. Look for the ✨ glow on newly unlocked pages.',
      },
    ],
  },
  {
    id: 'character-creation',
    title: 'Character Creation',
    icon: '⚔️',
    sections: [
      {
        title: 'Building Your Character',
        content: 'Every character begins with a name, a race, and a single base power. Your character\'s identity is shaped by their stats, abilities, personality, and lore.',
        examples: ['Choose a race from existing species or create your own', 'Define your character\'s personality and mentality', 'Write detailed lore and backstory'],
      },
      {
        title: 'Stats System',
        content: 'Characters have nine core stats that define their combat capabilities: Strength, Speed, Durability, Power, Skill, Intelligence, Battle IQ, Stamina, and Luck. Each stat ranges from 0 to 100.',
        expandable: [
          { label: 'Strength', content: 'Raw physical force. Affects melee damage and grappling.' },
          { label: 'Speed', content: 'Movement and reaction time. Affects dodge chance and turn priority.' },
          { label: 'Durability', content: 'How much punishment your character can take before going down.' },
          { label: 'Power', content: 'The potency of your character\'s special abilities and energy attacks.' },
          { label: 'Skill', content: 'Technical proficiency. Affects critical hit chance and combo execution.' },
          { label: 'Intelligence', content: 'Problem-solving and tactical awareness during combat.' },
          { label: 'Battle IQ', content: 'Combat instinct and ability to read opponents\' moves.' },
          { label: 'Stamina', content: 'Endurance over long fights. Affects ability to sustain combos.' },
          { label: 'Luck', content: 'Random chance factor. Influences critical hits, dodges, and environmental interactions.' },
        ],
      },
    ],
  },
  {
    id: 'pvp-rules',
    title: 'PvP Rules',
    icon: '🤺',
    sections: ROK_RULES.map(rule => ({
      title: `Rule ${rule.id}: ${rule.title}`,
      content: rule.description,
    })),
  },
  {
    id: 'group-battles',
    title: 'Group Battle Rules',
    icon: '👥',
    sections: [
      {
        title: 'Multi-Player Battles',
        content: 'Group battles support up to multiple players in a single arena. Turn order is determined at the start and must be followed strictly.',
        examples: [
          'Each player takes their turn in order',
          'No responding out of turn',
          'Alliance and betrayal are both valid strategies',
          'The last character standing wins',
        ],
      },
      {
        title: 'Team Battles',
        content: 'Players can form teams for coordinated combat. Team members can strategize together but must still follow turn order.',
      },
    ],
  },
  {
    id: 'power-tiers',
    title: 'Power Tiers',
    icon: '👑',
    sections: [
      {
        title: 'Tier System',
        content: 'Characters are ranked by power tier, determining their overall strength and the complexity of abilities they can wield.',
        expandable: POWER_TIERS.map(tier => ({
          label: `Tier ${tier.level}: ${tier.name}`,
          content: `${tier.description} Examples: ${tier.examples}`,
        })),
      },
      {
        title: 'Good Practice',
        content: 'Follow these guidelines to ensure fair and enjoyable battles for everyone.',
        examples: [
          'Be creative and descriptive with your moves',
          'Acknowledge hits and take damage appropriately',
          'Wait for your turn in multi-player battles',
          'Concede gracefully when defeated',
          'Respect your opponent\'s character and story',
        ],
      },
      {
        title: 'What to Avoid',
        content: 'These practices are considered poor form and may result in penalties.',
        examples: [
          'Godmodding (being invincible or auto-hitting)',
          'Stacking multiple base powers',
          'Using multiple conjunctions in attacks',
          'Auto-dodging all attacks',
          'Ignoring charging times for powerful moves',
          'Refusing to acknowledge valid damage',
        ],
      },
    ],
  },
];

// ── Build complete book (static + living chapters) ──────────

export function buildBookChapters(): BookChapter[] {
  const livingChapters = buildLivingChapters();
  
  // Convert living chapters to BookChapters
  const livingBookChapters: BookChapter[] = livingChapters.map(lc => ({
    id: `living-${lc.chapter.toLowerCase().replace(/\s+/g, '-')}`,
    title: lc.chapter,
    icon: lc.icon,
    isLiving: true,
    hasUnread: lc.hasUnread,
    livingEntries: lc.entries,
    sections: lc.entries.map(entry => ({
      title: `${entry.icon} ${entry.title}`,
      content: entry.description,
      examples: [entry.example],
      crossRefs: entry.relatedKeys.map(rk => {
        const related = livingChapters.flatMap(c => c.entries).find(e => e.mechanicKey === rk);
        return {
          label: related?.title || rk,
          mechanicKey: rk,
        };
      }),
    })),
  }));

  // Interleave: static intro/creation first, then living chapters, then static rules at the end
  const result: BookChapter[] = [];
  
  // Static: Introduction, Character Creation
  result.push(STATIC_CHAPTERS[0]); // Introduction
  result.push(STATIC_CHAPTERS[1]); // Character Creation
  
  // Living chapters (discovered mechanics)
  result.push(...livingBookChapters);
  
  // Static: PvP Rules, Group Battles, Power Tiers
  result.push(STATIC_CHAPTERS[2]); // PvP Rules
  result.push(STATIC_CHAPTERS[3]); // Group Battles
  result.push(STATIC_CHAPTERS[4]); // Power Tiers

  return result;
}

// ── Search across all chapters ──────────────────────────────

export function searchChapters(query: string): { chapterId: string; chapterIndex: number; sectionTitle: string } | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  
  const chapters = buildBookChapters();
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    if (chapter.title.toLowerCase().includes(q)) {
      return { chapterId: chapter.id, chapterIndex: i, sectionTitle: chapter.title };
    }
    for (const section of chapter.sections) {
      if (
        section.title.toLowerCase().includes(q) ||
        section.content.toLowerCase().includes(q)
      ) {
        return { chapterId: chapter.id, chapterIndex: i, sectionTitle: section.title };
      }
      if (section.expandable) {
        for (const exp of section.expandable) {
          if (exp.label.toLowerCase().includes(q) || exp.content.toLowerCase().includes(q)) {
            return { chapterId: chapter.id, chapterIndex: i, sectionTitle: section.title };
          }
        }
      }
      if (section.crossRefs) {
        for (const ref of section.crossRefs) {
          if (ref.label.toLowerCase().includes(q)) {
            return { chapterId: chapter.id, chapterIndex: i, sectionTitle: section.title };
          }
        }
      }
    }
  }
  return null;
}
