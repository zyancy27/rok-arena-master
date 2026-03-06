import { ROK_RULES, POWER_TIERS } from './game-constants';

export interface RuleSection {
  title: string;
  content: string;
  examples?: string[];
  expandable?: { label: string; content: string }[];
}

export interface BookChapter {
  id: string;
  title: string;
  icon: string;
  sections: RuleSection[];
}

export const BOOK_CHAPTERS: BookChapter[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    icon: '📖',
    sections: [
      {
        title: 'Welcome to the Realm of Kings',
        content: 'The Realm of Kings (R.O.K.) is a creative combat system where players pit their original characters against each other in turn-based battles narrated by AI. Victory is not determined by raw power alone — creativity, strategy, and storytelling are what crown a true champion.',
        expandable: [
          { label: 'What makes R.O.K. unique?', content: 'Unlike traditional RPGs, R.O.K. rewards the most creative and unique combatant. A cleverly-written underdog can triumph over a poorly-played powerhouse.' },
          { label: 'How battles work', content: 'Choose your character and an opponent, pick a battle location, then take turns describing attacks, defenses, and strategies. The AI narrates the clash in real-time.' },
        ],
      },
      {
        title: 'Core Philosophy',
        content: 'Winning isn\'t about who can defeat the other. The winner is decided by who was the most creative and unique in combat. We value creativity, originality, and storytelling above raw power.',
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
    id: 'combat-system',
    title: 'Combat System',
    icon: '🎲',
    sections: [
      {
        title: 'Dice Combat',
        content: 'Attacks and defenses use a d20 dice system modified by your character\'s stats. Each attack rolls d20 + stat modifiers vs opponent\'s defense.',
        examples: [
          'Higher stats = bigger bonuses on your rolls',
          'Critical hits and mishaps can occur based on your Skill stat',
          'You can toggle dice on/off in battle settings',
          'Watch the dice roll messages in chat — they show exactly how hits are calculated',
        ],
      },
      {
        title: 'Concentration & Dodge',
        content: 'When an attack hits you, you can spend a Concentration use to attempt a dodge — but it costs stat power.',
        examples: [
          'You start with 3 Concentration uses per battle',
          'Using Concentration gives a 50% chance to dodge',
          'Each use applies a stat penalty on your next action',
          'AI opponents also use Concentration — plan accordingly',
        ],
        expandable: [
          { label: 'When to use Concentration', content: 'Save Concentration for devastating attacks. Small hits are sometimes better to absorb than waste a Concentration charge.' },
        ],
      },
    ],
  },
  {
    id: 'battle-mechanics',
    title: 'Battle Mechanics',
    icon: '⚡',
    sections: [
      {
        title: 'Momentum & Edge State',
        content: 'Landing hits and combos builds Momentum (0–100). At 100, you enter Edge State for 2 turns of enhanced power.',
        examples: [
          'Combo chains, counters, and environment plays build momentum',
          'Getting interrupted or risk misfires drain momentum',
          'Edge State grants +10% precision and −15% risk chance',
          'After Edge State expires, momentum drops to 70',
        ],
      },
      {
        title: 'Overcharge & Risk',
        content: 'Toggle Overcharge before an attack for 1.5–2× potency — but with a 30% chance of a risk misfire.',
        examples: [
          'Toggle the ⚡ Overcharge button before sending your move',
          'Success = massive damage amplification',
          'Failure = risk misfire, momentum loss, and psychological penalty',
          'Edge State reduces risk chance during Overcharge',
        ],
        expandable: [
          { label: 'Risk vs Reward', content: 'Overcharge is high-risk, high-reward. Use it when your momentum is high to minimize risk chance.' },
        ],
      },
    ],
  },
  {
    id: 'status-effects',
    title: 'Status Effects',
    icon: '🧠',
    sections: [
      {
        title: 'Psychology System',
        content: 'Hidden psychological stats (Confidence, Fear, Resolve, Rage) shift during battle and affect your performance.',
        examples: [
          'Landing hits boosts confidence; getting hit raises fear',
          'Subtle emoji indicators show your mental state',
          'The AI opponent adapts to your fighting patterns every 3 turns',
          'Vary your tactics to keep the AI guessing',
        ],
        expandable: [
          { label: 'Mental Recovery', content: 'If you see the "Shaken" indicator, consider a defensive turn to recover your mental state.' },
        ],
      },
      {
        title: 'Arena Modifiers',
        content: 'Daily and weekly modifiers rotate automatically, adding environmental conditions to every battle.',
        examples: [
          'Daily modifiers change the arena conditions (gravity, hazards, etc.)',
          'Weekly modifiers add global effects that last all week',
          'Modifier badges appear at the top of the battle — hover for details',
          'Modifiers affect stats, risk chance, and momentum',
        ],
      },
    ],
  },
  {
    id: 'environment',
    title: 'Environment Interaction',
    icon: '🌍',
    sections: [
      {
        title: 'Living Arena',
        content: 'The battle arena is a living environment that reacts to your actions. Destroying structures, causing explosions, or manipulating terrain will change the battlefield dynamically.',
        examples: [
          'Punch a wall → dust particles and structural damage',
          'Drag weapon on metal → sparks fly',
          'Heavy landing → debris shakes the arena',
          'The environment remembers damage throughout the battle',
        ],
      },
      {
        title: 'Environmental Hazards',
        content: 'Arenas may contain natural hazards that evolve during battle. Lava flows, collapsing structures, and weather changes can all affect combat.',
        expandable: [
          { label: 'Hazard Examples', content: 'Volcanic arenas may have rising lava. Forest arenas may catch fire. Urban arenas may have collapsing buildings. Always be aware of your surroundings.' },
        ],
      },
    ],
  },
  {
    id: 'campaign-mode',
    title: 'Campaign Mode',
    icon: '🗺️',
    sections: [
      {
        title: 'Campaign Overview',
        content: 'Campaign mode allows players to embark on extended adventures with their characters. Progress through zones, fight enemies, discover items, and level up.',
        examples: [
          'Campaigns track day count, zones, and world state',
          'Characters gain XP and level up during campaigns',
          'NPCs remember your interactions and relationships',
          'Items found during campaigns persist in your inventory',
        ],
      },
      {
        title: 'Rare Discoveries',
        content: 'Very rarely, checking your inventory or environment may reveal unexpected items or clues. Keep exploring!',
        expandable: [
          { label: 'Discovery Example', content: 'You reach into your bag… Something unfamiliar is inside. A glowing crystal you don\'t remember picking up.' },
        ],
      },
    ],
  },
  {
    id: 'pvp-rules',
    title: 'PvP Rules',
    icon: '🤺',
    sections: [
      ...ROK_RULES.map(rule => ({
        title: `Rule ${rule.id}: ${rule.title}`,
        content: rule.description,
      })),
    ],
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
    id: 'advanced-mechanics',
    title: 'Advanced Mechanics',
    icon: '🔬',
    sections: [
      {
        title: 'Power Tiers',
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
          'Communicate clearly in the OOC chat',
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

export function searchChapters(query: string): { chapterId: string; chapterIndex: number; sectionTitle: string } | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  
  for (let i = 0; i < BOOK_CHAPTERS.length; i++) {
    const chapter = BOOK_CHAPTERS[i];
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
    }
  }
  return null;
}
