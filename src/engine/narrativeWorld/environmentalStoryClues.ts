/**
 * System 3 — Environmental Story Clues
 *
 * Generates narrative evidence of past events when environments are created.
 * These clues allow the narrator to reference meaningful details.
 */

import type { EnvironmentalClue, ClueCategory } from './types';
import type { BiomeBase } from '../biomeComposer/types';

// ── Clue databases by biome ─────────────────────────────────────

interface ClueEntry {
  description: string;
  category: ClueCategory;
  inspectable: boolean;
  discoveryPrompt?: string;
}

const CLUE_DB: Record<string, ClueEntry[]> = {
  forest: [
    { description: 'dead animals with no visible wounds', category: 'danger', inspectable: true, discoveryPrompt: 'Something killed these creatures without leaving a mark.' },
    { description: 'corrupted vegetation pulsing faintly', category: 'decay', inspectable: true },
    { description: 'abandoned camping equipment scattered near a tree', category: 'presence', inspectable: true, discoveryPrompt: 'Whoever was here left in a hurry.' },
    { description: 'claw marks scoring the bark of several trees', category: 'conflict', inspectable: false },
    { description: 'a trail of broken branches leading deeper into the woods', category: 'mystery', inspectable: true },
    { description: 'mushrooms growing in a perfect circle', category: 'mystery', inspectable: true, discoveryPrompt: 'The pattern seems too deliberate to be natural.' },
  ],
  ruins: [
    { description: 'broken statues missing their heads', category: 'history', inspectable: true, discoveryPrompt: 'These statues were defaced deliberately.' },
    { description: 'scattered tools rusted beyond use', category: 'decay', inspectable: false },
    { description: 'ancient carvings partially worn by time', category: 'history', inspectable: true, discoveryPrompt: 'The symbols seem to tell a story, but parts are missing.' },
    { description: 'scorch marks radiating from a central point', category: 'conflict', inspectable: true },
    { description: 'collapsed archways framing empty doorways', category: 'decay', inspectable: false },
    { description: 'a stone tablet cracked in half', category: 'mystery', inspectable: true },
  ],
  urban: [
    { description: 'leaking pipes dripping colored fluid', category: 'danger', inspectable: false },
    { description: 'flickering lights casting unsteady shadows', category: 'presence', inspectable: false },
    { description: 'damaged machinery sparking intermittently', category: 'danger', inspectable: true, discoveryPrompt: 'The machine still has power running through it.' },
    { description: 'graffiti warnings sprayed across a wall', category: 'presence', inspectable: true, discoveryPrompt: 'Someone tried to warn others away from this area.' },
    { description: 'a vehicle overturned and abandoned', category: 'conflict', inspectable: true },
    { description: 'shattered windows with glass on the inside', category: 'conflict', inspectable: true, discoveryPrompt: 'The force came from outside.' },
  ],
  cave: [
    { description: 'scratch marks on the cave walls at various heights', category: 'presence', inspectable: true },
    { description: 'bones arranged in a deliberate pattern', category: 'mystery', inspectable: true, discoveryPrompt: 'This arrangement was intentional.' },
    { description: 'luminescent moss growing in patches', category: 'mystery', inspectable: false },
    { description: 'tool marks where rock was chipped away', category: 'history', inspectable: true },
  ],
  rocky: [
    { description: 'a cairn of stacked stones', category: 'presence', inspectable: true, discoveryPrompt: 'Someone marked this spot.' },
    { description: 'deep gouges in the rock surface', category: 'conflict', inspectable: false },
    { description: 'burned ground with no fuel source visible', category: 'mystery', inspectable: true },
  ],
  plains: [
    { description: 'trampled grass in wide swaths', category: 'conflict', inspectable: false },
    { description: 'a collapsed watchtower', category: 'history', inspectable: true },
    { description: 'an abandoned supply crate, contents missing', category: 'presence', inspectable: true, discoveryPrompt: 'Taken recently. The wood is still damp.' },
  ],
  desert: [
    { description: 'half-buried structures poking through sand', category: 'history', inspectable: true },
    { description: 'glass-like patches of fused sand', category: 'danger', inspectable: true, discoveryPrompt: 'Something generated extreme heat here.' },
    { description: 'dried wells with rope still dangling', category: 'decay', inspectable: false },
  ],
  volcanic: [
    { description: 'obsidian shards scattered across the ground', category: 'danger', inspectable: false },
    { description: 'stone formations twisted into unnatural shapes', category: 'mystery', inspectable: true },
    { description: 'vents hissing toxic gas at intervals', category: 'danger', inspectable: false },
  ],
};

// Generic fallback
const GENERIC_CLUES: ClueEntry[] = [
  { description: 'signs of a struggle on the ground', category: 'conflict', inspectable: false },
  { description: 'an object partially buried in dirt', category: 'mystery', inspectable: true, discoveryPrompt: 'You could dig this out if you wanted.' },
  { description: 'unusual silence where there should be ambient noise', category: 'danger', inspectable: false },
];

// ── Public API ──────────────────────────────────────────────────

let _clueId = 0;

export function generateStoryClues(
  biome: BiomeBase | string,
  zoneId?: string,
  count = 3,
): EnvironmentalClue[] {
  const pool = CLUE_DB[biome] ?? GENERIC_CLUES;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((entry) => ({
    id: `storyclue_${++_clueId}`,
    description: entry.description,
    category: entry.category,
    inspectable: entry.inspectable,
    discoveryPrompt: entry.discoveryPrompt,
    zoneId,
  }));
}

/**
 * Build a narrator-ready summary of all clues for a zone.
 */
export function clueNarratorSummary(clues: EnvironmentalClue[]): string {
  if (clues.length === 0) return '';
  const descriptions = clues.map((c) => c.description);
  if (descriptions.length === 1) return `You notice ${descriptions[0]}.`;
  const last = descriptions.pop()!;
  return `You notice ${descriptions.join(', ')}, and ${last}.`;
}
