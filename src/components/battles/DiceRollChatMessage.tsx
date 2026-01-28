import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { type HitDetermination, type ConcentrationResult } from '@/lib/battle-dice';
import { Dices, ChevronDown, Target, Zap, Shield, Brain, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface DiceRollChatMessageProps {
  hitDetermination: HitDetermination;
  concentrationResult?: ConcentrationResult;
  attackerName: string;
  defenderName: string;
  timestamp: Date;
}

export default function DiceRollChatMessage({
  hitDetermination,
  concentrationResult,
  attackerName,
  defenderName,
  timestamp,
}: DiceRollChatMessageProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const { attackRoll, defenseRoll, wouldHit, gap, isMentalAttack } = hitDetermination;
  
  const finalHit = concentrationResult 
    ? !concentrationResult.dodgeSuccess 
    : wouldHit;

  return (
    <div className="bg-background/80 border border-border/60 rounded-lg overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {isMentalAttack ? '🧠 Mental' : '⚔️'} Attack Roll
            </span>
            {finalHit ? (
              <Badge className="bg-red-500/20 text-red-400 text-xs">
                Hit!
              </Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                Miss!
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString()}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 border-t border-border/40">
            {/* Attack Roll */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs">
                {isMentalAttack ? (
                  <Brain className="w-3 h-3 text-purple-400" />
                ) : (
                  <Zap className="w-3 h-3 text-red-400" />
                )}
                <span className="text-muted-foreground">{attackerName}</span>
              </div>
              <RollDisplay roll={attackRoll} />
            </div>

            {/* Defense Roll */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {isMentalAttack ? (
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Shield className="w-3 h-3 text-blue-400" />
                )}
                <span className="text-muted-foreground">{defenderName}</span>
              </div>
              <RollDisplay roll={defenseRoll} />
            </div>

            {/* Concentration */}
            {concentrationResult && (
              <div className="flex items-center justify-between pt-1 border-t border-border/30">
                <div className="flex items-center gap-2 text-xs">
                  <Target className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400">Concentration</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs font-mono">
                    +{concentrationResult.bonusRoll}
                  </Badge>
                  {concentrationResult.dodgeSuccess ? (
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      Dodged!
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 text-xs">
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Stat Penalty Warning */}
            {concentrationResult?.dodgeSuccess && concentrationResult.statPenalty > 0 && (
              <p className="text-xs text-amber-400 italic">
                ⚠️ -{concentrationResult.statPenalty}% stats on next action
              </p>
            )}

            {/* Gap Display */}
            <div className="text-center pt-1">
              <span className="text-xs text-muted-foreground">
                Gap: <span className={finalHit ? 'text-red-400' : 'text-green-400'}>{gap > 0 ? '+' : ''}{gap}</span>
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function RollDisplay({ roll }: { roll: { baseRoll: number; modifiers: { tierBonus: number; statBonus: number; battleIqBonus: number; skillBonus: number }; total: number } }) {
  const mods: string[] = [];
  if (roll.modifiers.tierBonus > 0) mods.push(`T+${roll.modifiers.tierBonus}`);
  if (roll.modifiers.statBonus > 0) mods.push(`S+${roll.modifiers.statBonus}`);
  if (roll.modifiers.battleIqBonus > 0) mods.push(`BIQ+${roll.modifiers.battleIqBonus}`);
  if (roll.modifiers.skillBonus > 0) mods.push(`SK+${roll.modifiers.skillBonus}`);

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="font-mono text-muted-foreground">🎲{roll.baseRoll}</span>
      {mods.length > 0 && (
        <span className="text-muted-foreground/70">
          ({mods.join(' ')})
        </span>
      )}
      <span className="font-bold text-foreground">= {roll.total}</span>
    </div>
  );
}
