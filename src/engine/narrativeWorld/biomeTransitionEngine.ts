/**
 * System 1 — Biome Transition Engine
 *
 * Generates biome transition paths that represent emotional narrative arcs
 * rather than simple terrain changes. Each step carries tone, clues,
 * and narrator context to fuel environmental storytelling.
 */

import type {
  BiomeTransitionPath,
  BiomeTransitionStep,
  BiomeToneTag,
  EnvironmentalClue,
  ClueCategory,
} from './types';
import type { BiomeBase, BiomeModifier } from '../biomeComposer/types';

// ── Transition Templates ────────────────────────────────────────

interface TransitionTemplate {
  id: string;
  arc: string;
  steps: Array<{
    biome: BiomeBase;
    modifiers: BiomeModifier[];
    tone: BiomeToneTag;
    hint: string;
  }>;
}

const TRANSITION_TEMPLATES: TransitionTemplate[] = [
  {
    id: 'corruption_spread',
    arc: 'From natural peace to corrupted menace',
    steps: [
      { biome: 'forest', modifiers: ['overgrown'], tone: 'peaceful', hint: 'The forest is thick and quiet.' },
      { biome: 'forest', modifiers: ['overgrown', 'infested'], tone: 'mysterious', hint: 'Strange growths cling to the trees.' },
      { biome: 'forest', modifiers: ['corrupted'], tone: 'corrupted', hint: 'The vegetation pulses with unnatural color.' },
      { biome: 'ruins', modifiers: ['corrupted'], tone: 'ancient', hint: 'Ruins emerge from the corrupted growth.' },
      { biome: 'holy_ruins', modifiers: ['ancient'], tone: 'sacred', hint: 'An ancient structure stands amid the decay.' },
    ],
  },
  {
    id: 'urban_collapse',
    arc: 'From order to devastation',
    steps: [
      { biome: 'industrial', modifiers: [], tone: 'industrial', hint: 'The city stretches ahead, still and quiet.' },
      { biome: 'industrial', modifiers: ['abandoned'], tone: 'desperate', hint: 'Signs of hasty evacuation line the streets.' },
      { biome: 'urban_interior', modifiers: ['collapsed'], tone: 'dangerous', hint: 'Buildings lean and groan overhead.' },
      { biome: 'ruins', modifiers: ['collapsed'], tone: 'chaotic', hint: 'The structures have given way entirely.' },
    ],
  },
  {
    id: 'descent_into_unknown',
    arc: 'From familiar ground to alien landscape',
    steps: [
      { biome: 'canyon', modifiers: [], tone: 'desolate', hint: 'Bare rock stretches to the horizon.' },
      { biome: 'canyon', modifiers: ['vertical'], tone: 'mysterious', hint: 'Crevasses open into darkness below.' },
      { biome: 'cave', modifiers: ['underground'], tone: 'oppressive', hint: 'The passage narrows and light fades.' },
      { biome: 'cave', modifiers: ['ancient'], tone: 'ancient', hint: 'Vast caverns echo with forgotten sounds.' },
    ],
  },
  {
    id: 'storm_aftermath',
    arc: 'From calm to catastrophe to silence',
    steps: [
      { biome: 'plains', modifiers: [], tone: 'peaceful', hint: 'Open ground under heavy skies.' },
      { biome: 'plains', modifiers: ['open'], tone: 'dangerous', hint: 'The storm hits with devastating force.' },
      { biome: 'plains', modifiers: ['open'], tone: 'chaotic', hint: 'Debris and flooding reshape the landscape.' },
      { biome: 'plains', modifiers: [], tone: 'desolate', hint: 'Silence follows. The land is changed.' },
    ],
  },
  {
    id: 'sacred_approach',
    arc: 'From wild terrain to reverent ground',
    steps: [
      { biome: 'forest', modifiers: ['dense'], tone: 'mysterious', hint: 'Ancient trees guard an unseen path.' },
      { biome: 'forest', modifiers: [], tone: 'hopeful', hint: 'Light breaks through the canopy ahead.' },
      { biome: 'ruins', modifiers: [], tone: 'ancient', hint: 'Stone pillars rise from the earth.' },
      { biome: 'ruins', modifiers: ['elevated'], tone: 'sacred', hint: 'A temple stands, untouched by time.' },
    ],
  },
];

// ── Clue Generation ─────────────────────────────────────────────

interface CluePool {
  category: ClueCategory;
  items: string[];
}

const CLUE_POOLS_BY_TONE: Record<BiomeToneTag, CluePool[]> = {
  mysterious: [
    { category: 'mystery', items: ['strange carvings on a stone slab', 'faint glowing symbols on the ground', 'a circle of stones arranged deliberately'] },
    { category: 'presence', items: ['footprints that end abruptly', 'a torn cloth caught on a branch', 'an abandoned campfire, still warm'] },
  ],
  dangerous: [
    { category: 'danger', items: ['claw marks scoring the rock face', 'shattered weapons half-buried in dirt', 'dark stains on the ground'] },
    { category: 'conflict', items: ['scorched earth in a wide arc', 'a collapsed barricade', 'broken arrows embedded in a wall'] },
  ],
  sacred: [
    { category: 'history', items: ['intact statues lining a walkway', 'offerings laid before a stone altar', 'inscriptions in an unknown language'] },
    { category: 'mystery', items: ['a faint hum from deep within the structure', 'light filtering through gaps in ancient walls', 'perfectly preserved murals'] },
  ],
  desolate: [
    { category: 'decay', items: ['bleached bones scattered across dry earth', 'rusted equipment half-buried in sand', 'a dried riverbed cutting through the landscape'] },
    { category: 'presence', items: ['a single set of tracks leading nowhere', 'an abandoned shelter with no roof'] },
  ],
  corrupted: [
    { category: 'danger', items: ['vegetation with unnatural coloring', 'dead animals with no visible wounds', 'ground that feels warm underfoot'] },
    { category: 'decay', items: ['trees with blackened bark', 'water with an oily sheen', 'plants growing in impossible directions'] },
  ],
  industrial: [
    { category: 'history', items: ['damaged machinery still humming', 'leaking pipes dripping colored fluid', 'control panels with cracked screens'] },
    { category: 'presence', items: ['a hard hat left on a railing', 'a clipboard with unfinished notes', 'flickering overhead lights'] },
  ],
  peaceful: [
    { category: 'presence', items: ['wildflowers growing through stone cracks', 'birdsong echoing softly', 'a clear stream running over smooth stones'] },
  ],
  chaotic: [
    { category: 'conflict', items: ['rubble from a recent collapse', 'dust still settling in the air', 'unstable ground shifting underfoot'] },
    { category: 'danger', items: ['sparking wires hanging from above', 'fractured support beams', 'glass shards covering the floor'] },
  ],
  ancient: [
    { category: 'history', items: ['moss-covered stone pillars', 'faded murals depicting unknown events', 'crumbled steps leading upward'] },
    { category: 'mystery', items: ['a sealed door with no visible handle', 'symbols that seem to shift when not observed directly'] },
  ],
  desperate: [
    { category: 'presence', items: ['scattered personal belongings', 'messages scratched into walls', 'overturned vehicles blocking the road'] },
    { category: 'conflict', items: ['makeshift barriers torn apart', 'signs of a struggle near a doorway'] },
  ],
  hopeful: [
    { category: 'presence', items: ['fresh growth pushing through destruction', 'a cleared path through debris', 'light breaking through heavy clouds'] },
  ],
  oppressive: [
    { category: 'danger', items: ['walls that seem to close in', 'dripping sounds echoing from every direction', 'an oppressive silence that swallows footsteps'] },
    { category: 'decay', items: ['crumbling surfaces that shed dust at a touch', 'air thick with moisture and the smell of rot'] },
  ],
};

let _clueIdCounter = 0;

function generateCluesForTone(tone: BiomeToneTag, zoneId?: string, count = 2): EnvironmentalClue[] {
  const pools = CLUE_POOLS_BY_TONE[tone] ?? [];
  if (pools.length === 0) return [];

  const clues: EnvironmentalClue[] = [];
  for (let i = 0; i < count; i++) {
    const pool = pools[i % pools.length];
    const item = pool.items[Math.floor(Math.random() * pool.items.length)];
    clues.push({
      id: `clue_${++_clueIdCounter}`,
      description: item,
      category: pool.category,
      inspectable: Math.random() > 0.3,
      zoneId,
    });
  }
  return clues;
}

// ── Public API ──────────────────────────────────────────────────

export function getTransitionTemplates(): TransitionTemplate[] {
  return TRANSITION_TEMPLATES;
}

export function buildTransitionPath(
  templateId: string,
  zoneIds?: string[],
): BiomeTransitionPath | null {
  const template = TRANSITION_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const steps: BiomeTransitionStep[] = template.steps.map((s, i) => ({
    biome: s.biome,
    modifiers: s.modifiers,
    tone: s.tone,
    narrativeHint: s.hint,
    clues: generateCluesForTone(s.tone, zoneIds?.[i]),
  }));

  return {
    steps,
    emotionalArc: template.arc,
    narratorContext: `Transition: ${template.arc}. Current step hints and clues guide narrator pacing.`,
  };
}

/**
 * Given a current biome + tone, suggest what comes next in the story.
 */
export function suggestNextBiome(
  currentBiome: BiomeBase,
  currentTone: BiomeToneTag,
): BiomeTransitionStep | null {
  for (const template of TRANSITION_TEMPLATES) {
    for (let i = 0; i < template.steps.length - 1; i++) {
      const step = template.steps[i];
      if (step.biome === currentBiome && step.tone === currentTone) {
        const next = template.steps[i + 1];
        return {
          biome: next.biome,
          modifiers: next.modifiers,
          tone: next.tone,
          narrativeHint: next.hint,
          clues: generateCluesForTone(next.tone),
        };
      }
    }
  }
  return null;
}

export function generateTransitionClues(
  tone: BiomeToneTag,
  zoneId?: string,
  count?: number,
): EnvironmentalClue[] {
  return generateCluesForTone(tone, zoneId, count);
}
