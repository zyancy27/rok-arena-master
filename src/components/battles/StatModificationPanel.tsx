/**
 * Stat Modification Panel
 * Allows players to temporarily modify stats during battle.
 * Changes are skill-gated: higher skill = better efficiency.
 * Modifications affect dice rolls in real-time.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Settings2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

export interface StatModification {
  stat: string;
  delta: number; // Positive = boost, negative = sacrifice
  label: string;
}

interface StatModificationPanelProps {
  skillStat: number;
  currentMods: StatModification[];
  onApplyMod: (mod: StatModification) => void;
  onResetMods: () => void;
  characterName: string;
}

const MODIFIABLE_STATS = [
  { key: 'stat_speed', label: 'Speed', icon: '⚡' },
  { key: 'stat_durability', label: 'Durability', icon: '🛡️' },
  { key: 'stat_power', label: 'Power', icon: '💥' },
  { key: 'stat_strength', label: 'Strength', icon: '💪' },
  { key: 'stat_battle_iq', label: 'Battle IQ', icon: '🧠' },
];

/**
 * Calculate efficiency based on skill stat.
 * Higher skill = you get more value per point invested.
 * Skill 50 = 1:1, Skill 100 = 1:1.5, Skill 0 = 1:0.6
 */
function getSkillEfficiency(skillStat: number): number {
  return 0.6 + (skillStat / 100) * 0.9;
}

/**
 * Calculate the effective boost/penalty with skill scaling.
 * Boosts are capped to prevent inflating power.
 */
function getEffectiveDelta(rawDelta: number, skillStat: number): number {
  const efficiency = getSkillEfficiency(skillStat);
  const effective = Math.round(rawDelta * efficiency);
  // Cap boosts at +20, penalties uncapped
  return rawDelta > 0 ? Math.min(effective, 20) : effective;
}

export default function StatModificationPanel({
  skillStat,
  currentMods,
  onApplyMod,
  onResetMods,
  characterName,
}: StatModificationPanelProps) {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [delta, setDelta] = useState(0);

  const efficiency = getSkillEfficiency(skillStat);
  const totalBoost = currentMods.filter(m => m.delta > 0).reduce((s, m) => s + m.delta, 0);
  const totalSacrifice = currentMods.filter(m => m.delta < 0).reduce((s, m) => s + Math.abs(m.delta), 0);

  // Balance check: total boosts should roughly equal total sacrifices
  const isBalanced = totalBoost <= totalSacrifice + 5;

  const handleApply = () => {
    if (!selectedStat || delta === 0) return;
    
    const statConfig = MODIFIABLE_STATS.find(s => s.key === selectedStat);
    if (!statConfig) return;

    const effectiveDelta = getEffectiveDelta(delta, skillStat);
    
    onApplyMod({
      stat: selectedStat,
      delta: effectiveDelta,
      label: `${statConfig.label} ${effectiveDelta > 0 ? '+' : ''}${effectiveDelta}`,
    });

    setSelectedStat(null);
    setDelta(0);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="w-3 h-3" />
          Modify Stats
          {currentMods.length > 0 && (
            <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
              {currentMods.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-3" side="top">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Stat Modifications</span>
          <Badge variant="outline" className="text-[10px]">
            Skill Efficiency: {Math.round(efficiency * 100)}%
          </Badge>
        </div>

        {/* Current Mods */}
        {currentMods.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {currentMods.map((mod, i) => (
              <Badge
                key={i}
                variant="outline"
                className={`text-[10px] ${
                  mod.delta > 0
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {mod.delta > 0 ? <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDown className="w-2.5 h-2.5 mr-0.5" />}
                {mod.label}
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={onResetMods}>
              <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
              Reset
            </Button>
          </div>
        )}

        {/* Balance Warning */}
        {!isBalanced && (
          <p className="text-[10px] text-amber-400">
            ⚠ Boosts exceed sacrifices — consider reducing a stat to balance.
          </p>
        )}

        {/* Stat Selector */}
        <div className="grid grid-cols-5 gap-1">
          {MODIFIABLE_STATS.map((stat) => (
            <Button
              key={stat.key}
              variant={selectedStat === stat.key ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-[10px] flex-col gap-0 px-1"
              onClick={() => setSelectedStat(stat.key)}
            >
              <span>{stat.icon}</span>
              <span className="truncate">{stat.label.slice(0, 4)}</span>
            </Button>
          ))}
        </div>

        {/* Delta Slider */}
        {selectedStat && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {MODIFIABLE_STATS.find(s => s.key === selectedStat)?.label}
              </span>
              <span className={delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground'}>
                {delta > 0 ? '+' : ''}{delta} → effective: {delta > 0 ? '+' : ''}{getEffectiveDelta(delta, skillStat)}
              </span>
            </div>
            <Slider
              min={-20}
              max={20}
              step={5}
              value={[delta]}
              onValueChange={([v]) => setDelta(v)}
            />
            <Button size="sm" className="w-full h-7 text-xs" onClick={handleApply} disabled={delta === 0}>
              Apply Modification
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Higher Skill improves modification efficiency. Boosts are capped at +20.
        </p>
      </PopoverContent>
    </Popover>
  );
}
