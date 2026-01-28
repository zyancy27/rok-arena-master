import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DiceRollResult, HitDetermination, ConcentrationResult } from '@/lib/battle-dice';
import { Dices, Brain, Shield, Zap, Target, Sparkles, Info } from 'lucide-react';

interface DiceRollDisplayProps {
  hitDetermination: HitDetermination;
  concentrationResult?: ConcentrationResult;
  attackerName: string;
  defenderName: string;
  isAIAttack?: boolean;
}

export default function DiceRollDisplay({
  hitDetermination,
  concentrationResult,
  attackerName,
  defenderName,
  isAIAttack = false,
}: DiceRollDisplayProps) {
  const { attackRoll, defenseRoll, wouldHit, gap, isMentalAttack } = hitDetermination;
  
  const finalHit = concentrationResult 
    ? !concentrationResult.dodgeSuccess 
    : wouldHit;

  return (
    <div className={`rounded-lg p-3 space-y-3 border ${isAIAttack ? 'bg-red-950/30 border-red-500/30' : 'bg-background/50 border-border/50'}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Dices className={`w-4 h-4 ${isAIAttack ? 'text-red-400' : 'text-primary'}`} />
        {isMentalAttack ? 'Mental Attack Roll' : 'Attack Roll'}
        {isAIAttack && (
          <Badge variant="outline" className="text-xs text-red-400 border-red-500/30">
            AI Roll
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attack Roll */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            {isMentalAttack ? (
              <Brain className="w-3 h-3 text-purple-400" />
            ) : (
              <Zap className="w-3 h-3 text-red-400" />
            )}
            {attackerName}'s Attack
          </div>
          <RollBreakdown roll={attackRoll} />
        </div>

        {/* Defense Roll */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            {isMentalAttack ? (
              <Sparkles className="w-3 h-3 text-cyan-400" />
            ) : (
              <Shield className="w-3 h-3 text-blue-400" />
            )}
            {defenderName}'s Defense
          </div>
          <RollBreakdown roll={defenseRoll} />
        </div>
      </div>

      {/* Concentration Result */}
      {concentrationResult && (
        <div className="pt-2 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Target className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 font-medium">Concentration Used</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                +{concentrationResult.bonusRoll} bonus
              </Badge>
              {concentrationResult.dodgeSuccess ? (
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  Dodge Success!
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 text-xs">
                  Dodge Failed
                </Badge>
              )}
            </div>
          </div>
          {concentrationResult.dodgeSuccess && concentrationResult.statPenalty > 0 && (
            <p className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
              ⚠️ -{concentrationResult.statPenalty}% stat penalty on next action
            </p>
          )}
        </div>
      )}

      {/* Final Result */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Result:</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {attackRoll.total} vs {concentrationResult ? defenseRoll.total + concentrationResult.bonusRoll : defenseRoll.total}
          </span>
          {finalHit ? (
            <Badge className="bg-red-500/20 text-red-400">
              Attack Hits! (Gap: {Math.abs(gap)})
            </Badge>
          ) : (
            <Badge className="bg-green-500/20 text-green-400">
              Attack Misses! (Gap: {Math.abs(gap)})
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function RollBreakdown({ roll }: { roll: DiceRollResult }) {
  const modParts: { label: string; value: number; color: string; description: string }[] = [];
  
  if (roll.modifiers.tierBonus > 0) {
    modParts.push({ 
      label: 'Tier', 
      value: roll.modifiers.tierBonus, 
      color: 'text-purple-400',
      description: 'Power tier bonus (1-7 scaled to 1-5)'
    });
  }
  if (roll.modifiers.statBonus > 0) {
    modParts.push({ 
      label: 'Stats', 
      value: roll.modifiers.statBonus, 
      color: 'text-blue-400',
      description: 'Combat stats averaged (0-100 → 1-5)'
    });
  }
  if (roll.modifiers.battleIqBonus > 0) {
    modParts.push({ 
      label: 'Battle IQ', 
      value: roll.modifiers.battleIqBonus, 
      color: 'text-orange-400',
      description: 'Combat instinct bonus (0-100 → 1-5)'
    });
  }
  if (roll.modifiers.skillBonus > 0) {
    modParts.push({ 
      label: 'Skill', 
      value: roll.modifiers.skillBonus, 
      color: 'text-green-400',
      description: 'Trained ability proficiency (0-100 → 1-5)'
    });
  }

  return (
    <div className="bg-muted/30 rounded-md p-2 space-y-2">
      {/* Visual formula */}
      <div className="flex items-center gap-1 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono text-sm bg-primary/20 text-primary px-2 py-0.5 rounded cursor-help font-bold">
              🎲 {roll.baseRoll}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs font-medium">Base D20 Roll</p>
            <p className="text-xs text-muted-foreground">Random 1-20</p>
          </TooltipContent>
        </Tooltip>
        
        {modParts.map((mod, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className={`text-sm font-mono ${mod.color} cursor-help hover:underline`}>
                +{mod.value}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-medium">{mod.label} Bonus</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">{mod.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <span className="text-muted-foreground">=</span>
        <span className="text-sm font-bold bg-foreground/10 px-2 py-0.5 rounded">{roll.total}</span>
      </div>
      
      {/* Modifier labels row */}
      <div className="flex items-center gap-3 flex-wrap text-[10px]">
        <span className="text-muted-foreground">D20</span>
        {modParts.map((mod, i) => (
          <span key={i} className={`${mod.color} opacity-80`}>
            {mod.label}: +{mod.value}
          </span>
        ))}
      </div>
    </div>
  );
}
