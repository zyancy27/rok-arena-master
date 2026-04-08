/**
 * Character Summary Tags
 *
 * Generates and displays plain-language summary tags from character data.
 * Tags like:
 * - "Direct speaker"
 * - "High battle instinct"
 * - "Mystic archetype"
 * - "World-linked origin"
 * - "Aggressive combat style"
 */

import { Badge } from '@/components/ui/badge';
import type { CharacterStats } from '@/lib/character-stats';

interface CharacterSummaryTagsProps {
  name: string;
  race?: string;
  homePlanet?: string;
  powers?: string;
  abilities?: string;
  personality?: string;
  mentality?: string;
  stats: CharacterStats;
  level: number;
  compact?: boolean;
}

interface SummaryTag {
  label: string;
  color: string; // tailwind border/text classes
}

function generateTags(props: CharacterSummaryTagsProps): SummaryTag[] {
  const tags: SummaryTag[] = [];

  // Power tier tag
  if (props.level >= 8) {
    tags.push({ label: 'Cosmic tier', color: 'border-purple-500/30 text-purple-400' });
  } else if (props.level >= 5) {
    tags.push({ label: 'High power', color: 'border-amber-500/30 text-amber-400' });
  }

  // Origin tags
  if (props.race) {
    tags.push({ label: props.race, color: 'border-cyan-500/30 text-cyan-400' });
  }
  if (props.homePlanet) {
    tags.push({ label: 'World-linked origin', color: 'border-emerald-500/30 text-emerald-400' });
  }

  // Stat-based tags
  const { stat_battle_iq, stat_intelligence, stat_strength, stat_speed, stat_power, stat_skill, stat_stamina, stat_durability } = props.stats;
  
  if (stat_battle_iq >= 75) tags.push({ label: 'High battle instinct', color: 'border-red-500/30 text-red-400' });
  if (stat_intelligence >= 80) tags.push({ label: 'Genius-level intellect', color: 'border-blue-500/30 text-blue-400' });
  if (stat_strength >= 80) tags.push({ label: 'Superhuman strength', color: 'border-orange-500/30 text-orange-400' });
  if (stat_speed >= 80) tags.push({ label: 'Blinding speed', color: 'border-yellow-500/30 text-yellow-400' });
  if (stat_power >= 80) tags.push({ label: 'Immense power', color: 'border-violet-500/30 text-violet-400' });
  if (stat_skill >= 80) tags.push({ label: 'Master technician', color: 'border-teal-500/30 text-teal-400' });
  if (stat_durability >= 80 && stat_stamina >= 80) tags.push({ label: 'Tank build', color: 'border-stone-500/30 text-stone-400' });
  if (stat_speed >= 70 && stat_skill >= 70 && stat_strength < 50) tags.push({ label: 'Finesse fighter', color: 'border-emerald-500/30 text-emerald-400' });

  // Archetype tags
  const personality = props.personality?.toLowerCase() || '';
  const mentality = props.mentality?.toLowerCase() || '';

  if (personality.includes('archetype:boy_scout')) tags.push({ label: 'Hero archetype', color: 'border-blue-500/30 text-blue-400' });
  if (personality.includes('archetype:anti_hero')) tags.push({ label: 'Anti-hero', color: 'border-purple-500/30 text-purple-400' });
  if (personality.includes('archetype:noble_villain')) tags.push({ label: 'Noble villain', color: 'border-amber-500/30 text-amber-400' });
  if (personality.includes('archetype:extreme_villain')) tags.push({ label: 'Chaos incarnate', color: 'border-red-600/30 text-red-500' });

  // Combat style
  if (mentality.includes('approach:traditional')) tags.push({ label: 'Honorable combatant', color: 'border-sky-500/30 text-sky-400' });
  if (mentality.includes('approach:unconventional')) tags.push({ label: 'Ruthless tactics', color: 'border-rose-500/30 text-rose-400' });

  // Alignment
  if (mentality.includes('alignment:good')) tags.push({ label: 'Good-aligned', color: 'border-green-500/30 text-green-400' });
  if (mentality.includes('alignment:evil')) tags.push({ label: 'Evil-aligned', color: 'border-red-500/30 text-red-400' });

  // Power type hints
  const powers = (props.powers || '').toLowerCase();
  if (/magic|arcane|mystic|sorcery|spell|enchant/i.test(powers)) tags.push({ label: 'Mystic archetype', color: 'border-indigo-500/30 text-indigo-400' });
  if (/psych|telekin|telepath|mental|mind/i.test(powers)) tags.push({ label: 'Psychic wielder', color: 'border-fuchsia-500/30 text-fuchsia-400' });
  if (/tech|cyber|mech|robot|hack|engineer/i.test(powers)) tags.push({ label: 'Tech-based', color: 'border-cyan-500/30 text-cyan-400' });
  if (/fire|flame|blaze|inferno|burn/i.test(powers)) tags.push({ label: 'Pyrokinetic', color: 'border-orange-500/30 text-orange-400' });
  if (/ice|frost|cryo|freeze|cold/i.test(powers)) tags.push({ label: 'Cryokinetic', color: 'border-sky-500/30 text-sky-400' });

  // Cap at reasonable number
  return tags.slice(0, props.compact ? 4 : 8);
}

export default function CharacterSummaryTags(props: CharacterSummaryTagsProps) {
  const tags = generateTags(props);

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <span
          key={i}
          className={`inline-flex items-center text-[10px] px-1.5 py-0 rounded-full border ${tag.color}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

export { generateTags, type SummaryTag };
