import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConcentration, useOffensiveConcentration, type HitDetermination, type ConcentrationResult, type OffensiveConcentrationResult } from '@/lib/battle-dice';
import type { CharacterStats } from '@/lib/character-stats';
import { Target, Brain, Zap, Shield, Swords } from 'lucide-react';

interface ConcentrationButtonProps {
  hitDetermination: HitDetermination;
  defenderStats?: CharacterStats;
  attackerStats?: CharacterStats;
  usesRemaining: number;
  mode?: 'defense' | 'offense';
  onUseConcentration?: (result: ConcentrationResult) => void;
  onUseOffensiveConcentration?: (result: OffensiveConcentrationResult) => void;
  onSkip: () => void;
  disabled?: boolean;
  characterName?: string;
  opponentName?: string;
}

export default function ConcentrationButton({
  hitDetermination,
  defenderStats,
  attackerStats,
  usesRemaining,
  mode = 'defense',
  onUseConcentration,
  onUseOffensiveConcentration,
  onSkip,
  disabled = false,
  characterName,
  opponentName,
}: ConcentrationButtonProps) {
  const [isRolling, setIsRolling] = useState(false);

  const handleConcentration = () => {
    if (usesRemaining <= 0 || disabled) return;
    
    setIsRolling(true);
    
    setTimeout(() => {
      if (mode === 'offense' && attackerStats && onUseOffensiveConcentration) {
        const result = useOffensiveConcentration(attackerStats, hitDetermination);
        setIsRolling(false);
        onUseOffensiveConcentration(result);
      } else if (mode === 'defense' && defenderStats && onUseConcentration) {
        const result = useConcentration(defenderStats, hitDetermination);
        setIsRolling(false);
        onUseConcentration(result);
      }
    }, 800);
  };

  const concentrationPotential = 5;
  const isOffense = mode === 'offense';
  const gap = Math.abs(hitDetermination.gap);

  return (
    <div className={`bg-gradient-to-br ${isOffense ? 'from-blue-500/20 to-cyan-500/20 border-blue-500/50' : 'from-amber-500/20 to-orange-500/20 border-amber-500/50'} border rounded-lg p-4 space-y-3 animate-pulse-glow`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOffense ? <Swords className="w-5 h-5 text-blue-400" /> : <Target className="w-5 h-5 text-amber-400" />}
          <span className={`font-semibold ${isOffense ? 'text-blue-100' : 'text-amber-100'}`}>
            {isOffense ? 'Near Miss! Focus to Land It?' : 'Incoming Attack!'}
          </span>
        </div>
        <Badge 
          variant="outline" 
          className={`${usesRemaining <= 1 ? 'text-red-400 border-red-400/50' : isOffense ? 'text-blue-400 border-blue-400/50' : 'text-amber-400 border-amber-400/50'}`}
        >
          {usesRemaining}/3 Uses Left
        </Badge>
      </div>

      <div className="text-sm text-muted-foreground">
        {isOffense ? (
          <>
            <p>
              Your Attack: <span className="text-blue-400 font-mono">{hitDetermination.attackRoll.total}</span> vs 
              Defense: <span className="text-red-400 font-mono">{hitDetermination.defenseRoll.total}</span>
            </p>
            <p className="text-blue-400 mt-1">
              Missed by {gap} — Concentrate to push through!
            </p>
          </>
        ) : (
          <>
            <p>
              Attack Roll: <span className="text-red-400 font-mono">{hitDetermination.attackRoll.total}</span> vs 
              Defense Roll: <span className="text-blue-400 font-mono">{hitDetermination.defenseRoll.total}</span>
            </p>
            <p className="text-amber-400 mt-1">
              Gap: {gap} — This attack will hit!
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/30 rounded p-2">
        <Brain className="w-4 h-4 text-purple-400" />
        <span>INT: {isOffense ? attackerStats?.stat_intelligence : defenderStats?.stat_intelligence}</span>
        <Zap className="w-4 h-4 text-yellow-400 ml-2" />
        <span>SPD: {isOffense ? attackerStats?.stat_speed : defenderStats?.stat_speed}</span>
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
                  {isOffense ? <Swords className="w-4 h-4 mr-2" /> : <Target className="w-4 h-4 mr-2" />}
                  Use Concentration
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Roll +1 to +{concentrationPotential} to {isOffense ? 'land the hit' : 'dodge'}</p>
            <p className="text-xs text-amber-400">Warning: Stat penalty on next move if successful</p>
          </TooltipContent>
        </Tooltip>

        <Button
          onClick={onSkip}
          variant="outline"
          disabled={isRolling}
          className="shrink-0"
        >
          {isOffense ? 'Accept Miss' : 'Take Hit'}
        </Button>
      </div>

      {usesRemaining <= 1 && usesRemaining > 0 && (
        <p className={`text-xs ${isOffense ? 'text-blue-400' : 'text-amber-400'} text-center`}>
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
