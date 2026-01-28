import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConcentration, type HitDetermination, type ConcentrationResult } from '@/lib/battle-dice';
import type { CharacterStats } from '@/lib/character-stats';
import { Target, Brain, Zap, Shield } from 'lucide-react';

interface ConcentrationButtonProps {
  hitDetermination: HitDetermination;
  defenderStats: CharacterStats;
  usesRemaining: number;
  onUseConcentration: (result: ConcentrationResult) => void;
  onSkip: () => void;
  disabled?: boolean;
}

export default function ConcentrationButton({
  hitDetermination,
  defenderStats,
  usesRemaining,
  onUseConcentration,
  onSkip,
  disabled = false,
}: ConcentrationButtonProps) {
  const [isRolling, setIsRolling] = useState(false);

  const handleConcentration = () => {
    if (usesRemaining <= 0 || disabled) return;
    
    setIsRolling(true);
    
    // Animate the roll
    setTimeout(() => {
      const result = useConcentration(defenderStats, hitDetermination);
      setIsRolling(false);
      onUseConcentration(result);
    }, 800);
  };

  const concentrationPotential = Math.max(1, Math.min(3, 
    1 + Math.floor((defenderStats.stat_intelligence + defenderStats.stat_speed) / 100)
  ));

  return (
    <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-lg p-4 space-y-3 animate-pulse-glow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-amber-100">Incoming Attack!</span>
        </div>
        <Badge 
          variant="outline" 
          className={`${usesRemaining <= 1 ? 'text-red-400 border-red-400/50' : 'text-amber-400 border-amber-400/50'}`}
        >
          {usesRemaining}/3 Uses Left
        </Badge>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          Attack Roll: <span className="text-red-400 font-mono">{hitDetermination.attackRoll.total}</span> vs 
          Defense Roll: <span className="text-blue-400 font-mono">{hitDetermination.defenseRoll.total}</span>
        </p>
        <p className="text-amber-400 mt-1">
          Gap: {Math.abs(hitDetermination.gap)} — This attack will hit!
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/30 rounded p-2">
        <Brain className="w-4 h-4 text-purple-400" />
        <span>INT: {defenderStats.stat_intelligence}</span>
        <Zap className="w-4 h-4 text-yellow-400 ml-2" />
        <span>SPD: {defenderStats.stat_speed}</span>
        <Shield className="w-4 h-4 text-cyan-400 ml-2" />
        <span>Potential: +1 to +{concentrationPotential}</span>
      </div>

      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleConcentration}
              disabled={usesRemaining <= 0 || disabled || isRolling}
              className={`flex-1 ${isRolling ? 'animate-pulse' : 'glow-primary'}`}
              variant="default"
            >
              {isRolling ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Concentrating...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Use Concentration
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Roll +1 to +{concentrationPotential} to dodge</p>
            <p className="text-xs text-amber-400">Warning: Stat penalty on next move if successful</p>
          </TooltipContent>
        </Tooltip>

        <Button
          onClick={onSkip}
          variant="outline"
          disabled={isRolling}
          className="shrink-0"
        >
          Take Hit
        </Button>
      </div>

      {usesRemaining <= 1 && usesRemaining > 0 && (
        <p className="text-xs text-amber-400 text-center">
          ⚠️ Last concentration use! Choose wisely.
        </p>
      )}
      
      {usesRemaining <= 0 && (
        <p className="text-xs text-red-400 text-center">
          No concentration uses remaining this battle.
        </p>
      )}
    </div>
  );
}
