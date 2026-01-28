import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DiceRollResult, HitDetermination, ConcentrationResult } from '@/lib/battle-dice';
import { Dices, Brain, Shield, Zap, Target, Sparkles } from 'lucide-react';

interface DiceRollDisplayProps {
  hitDetermination: HitDetermination;
  concentrationResult?: ConcentrationResult;
  attackerName: string;
  defenderName: string;
}

export default function DiceRollDisplay({
  hitDetermination,
  concentrationResult,
  attackerName,
  defenderName,
}: DiceRollDisplayProps) {
  const { attackRoll, defenseRoll, wouldHit, gap, isMentalAttack } = hitDetermination;
  
  const finalHit = concentrationResult 
    ? !concentrationResult.dodgeSuccess 
    : wouldHit;

  return (
    <div className="bg-background/50 rounded-lg p-3 space-y-3 border border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Dices className="w-4 h-4 text-primary" />
        {isMentalAttack ? 'Mental Attack Roll' : 'Attack Roll'}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Attack Roll */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs">
            <Target className="w-3 h-3 text-amber-400" />
            <span className="text-muted-foreground">Concentration Used:</span>
            <Badge variant="outline" className="text-xs">
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
          {concentrationResult.dodgeSuccess && concentrationResult.statPenalty > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              ⚠️ -{concentrationResult.statPenalty}% stat penalty on next action
            </p>
          )}
        </div>
      )}

      {/* Final Result */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Result:</span>
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
  );
}

function RollBreakdown({ roll }: { roll: DiceRollResult }) {
  const modParts: { label: string; value: number; color: string }[] = [];
  
  if (roll.modifiers.tierBonus > 0) {
    modParts.push({ label: 'Tier', value: roll.modifiers.tierBonus, color: 'text-purple-400' });
  }
  if (roll.modifiers.statBonus > 0) {
    modParts.push({ label: 'Stats', value: roll.modifiers.statBonus, color: 'text-blue-400' });
  }
  if (roll.modifiers.battleIqBonus > 0) {
    modParts.push({ label: 'BIQ', value: roll.modifiers.battleIqBonus, color: 'text-orange-400' });
  }
  if (roll.modifiers.skillBonus > 0) {
    modParts.push({ label: 'Skill', value: roll.modifiers.skillBonus, color: 'text-green-400' });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help">
          <Badge variant="outline" className="font-mono">
            🎲 {roll.baseRoll}
          </Badge>
          {modParts.map((mod, i) => (
            <span key={i} className={`text-xs ${mod.color}`}>
              +{mod.value}
            </span>
          ))}
          <span className="text-sm font-bold ml-1">= {roll.total}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p>Base Roll: {roll.baseRoll} (d20)</p>
          {modParts.map((mod, i) => (
            <p key={i}>+{mod.value} from {mod.label}</p>
          ))}
          <p className="font-bold pt-1 border-t">Total: {roll.total}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
