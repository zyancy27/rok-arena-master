import { DEFAULT_STATS, type CharacterStats } from '@/lib/character-stats';

export interface CharacterContextInput {
  characterId?: string;
  name: string;
  tier?: number;
  stats?: Partial<CharacterStats> | null;
  abilities?: string | string[] | null;
  powers?: string | string[] | null;
  equippedItems?: string[];
  statusEffects?: Array<string | { type: string; intensity?: string }>;
  stamina?: number | null;
  energy?: number | null;
}

export interface ResolvedCharacterContext {
  characterId?: string;
  name: string;
  tier: number;
  stats: CharacterStats;
  equippedItems: string[];
  abilities: string[];
  powers: string[];
  statusEffects: Array<{ type: string; intensity?: string }>;
  stamina: number;
  energy: number;
  staminaState: 'drained' | 'strained' | 'steady' | 'surging';
  energyState: 'depleted' | 'low' | 'steady' | 'charged';
}

function toList(value?: string | string[] | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(item => item.trim()).filter(Boolean);
  return value
    .split(/\n|,|;/)
    .map(item => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function toStatusEffects(statusEffects?: Array<string | { type: string; intensity?: string }>) {
  return (statusEffects || []).map(effect => typeof effect === 'string' ? { type: effect } : effect);
}

function getStateLabel(value: number, labels: [string, string, string, string]) {
  if (value <= 25) return labels[0];
  if (value <= 45) return labels[1];
  if (value <= 75) return labels[2];
  return labels[3];
}

export const CharacterContextResolver = {
  resolve(input: CharacterContextInput): ResolvedCharacterContext {
    const stats: CharacterStats = { ...DEFAULT_STATS, ...(input.stats || {}) };
    const stamina = Math.max(0, Math.min(100, Math.round(input.stamina ?? stats.stat_stamina ?? 50)));
    const energy = Math.max(0, Math.min(100, Math.round(input.energy ?? stats.stat_power ?? 50)));

    return {
      characterId: input.characterId,
      name: input.name,
      tier: input.tier ?? 1,
      stats,
      equippedItems: (input.equippedItems || []).filter(Boolean),
      abilities: toList(input.abilities),
      powers: toList(input.powers),
      statusEffects: toStatusEffects(input.statusEffects),
      stamina,
      energy,
      staminaState: getStateLabel(stamina, ['drained', 'strained', 'steady', 'surging']) as ResolvedCharacterContext['staminaState'],
      energyState: getStateLabel(energy, ['depleted', 'low', 'steady', 'charged']) as ResolvedCharacterContext['energyState'],
    };
  },
};
