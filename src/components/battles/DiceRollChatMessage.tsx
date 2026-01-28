import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type HitDetermination, type ConcentrationResult } from '@/lib/battle-dice';
import { Dices, ChevronDown, Target, Zap, Shield, Brain, Sparkles, Info } from 'lucide-react';
import { useState } from 'react';

interface DiceRollChatMessageProps {
  hitDetermination: HitDetermination;
  concentrationResult?: ConcentrationResult;
  attackerName: string;
  defenderName: string;
  timestamp: Date;
  isAIRoll?: boolean; // Indicates this is an AI opponent's attack roll
}

export default function DiceRollChatMessage({
  hitDetermination,
  concentrationResult,
  attackerName,
  defenderName,
  timestamp,
  isAIRoll = false,
}: DiceRollChatMessageProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const { attackRoll, defenseRoll, wouldHit, gap, isMentalAttack } = hitDetermination;
  
  const finalHit = concentrationResult 
    ? !concentrationResult.dodgeSuccess 
    : wouldHit;

  return (
    <div className={`border rounded-lg overflow-hidden ${isAIRoll ? 'bg-red-950/20 border-red-500/30' : 'bg-background/80 border-border/60'}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Dices className={`w-4 h-4 ${isAIRoll ? 'text-red-400' : 'text-primary'}`} />
            <span className="text-sm font-medium">
              {isMentalAttack ? '🧠 Mental' : '⚔️'} {isAIRoll ? 'AI Attack' : 'Attack Roll'}
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
            {/* Attack Roll with full breakdown */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {isMentalAttack ? (
                  <Brain className="w-3 h-3 text-purple-400" />
                ) : (
                  <Zap className="w-3 h-3 text-red-400" />
                )}
                <span className="text-muted-foreground font-medium">{attackerName}'s Attack</span>
              </div>
              <RollBreakdownDisplay roll={attackRoll} />
            </div>

            {/* Defense Roll with full breakdown */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {isMentalAttack ? (
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Shield className="w-3 h-3 text-blue-400" />
                )}
                <span className="text-muted-foreground font-medium">{defenderName}'s Defense</span>
              </div>
              <RollBreakdownDisplay roll={defenseRoll} />
            </div>

            {/* Concentration */}
            {concentrationResult && (
              <div className="pt-2 border-t border-border/30 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 font-medium">Concentration Used</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs font-mono bg-amber-500/10 text-amber-400 border-amber-500/30">
                      +{concentrationResult.bonusRoll} bonus
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
                <p className="text-xs text-muted-foreground">
                  New Defense: {defenseRoll.total} + {concentrationResult.bonusRoll} = {defenseRoll.total + concentrationResult.bonusRoll}
                </p>
              </div>
            )}

            {/* Stat Penalty Warning */}
            {concentrationResult?.dodgeSuccess && concentrationResult.statPenalty > 0 && (
              <p className="text-xs text-amber-400 italic bg-amber-500/10 px-2 py-1 rounded">
                ⚠️ -{concentrationResult.statPenalty}% stats on next action
              </p>
            )}

            {/* Result Summary */}
            <div className="pt-2 border-t border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Result:</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${finalHit ? 'text-red-400' : 'text-green-400'}`}>
                  {attackRoll.total} vs {concentrationResult ? defenseRoll.total + concentrationResult.bonusRoll : defenseRoll.total}
                </span>
                <Badge className={`text-xs ${finalHit ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {finalHit ? `Hit by ${Math.abs(gap)}` : `Missed by ${Math.abs(gap)}`}
                </Badge>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Detailed roll breakdown showing D20 + each modifier
 */
function RollBreakdownDisplay({ roll }: { roll: { baseRoll: number; modifiers: { tierBonus: number; statBonus: number; battleIqBonus: number; skillBonus: number }; total: number } }) {
  const { baseRoll, modifiers, total } = roll;
  
  const modifierParts = [
    { label: 'Tier', value: modifiers.tierBonus, color: 'text-purple-400', description: 'Power tier bonus (levels 1-7 scaled)' },
    { label: 'Stats', value: modifiers.statBonus, color: 'text-blue-400', description: 'Relevant combat stats averaged and scaled' },
    { label: 'Battle IQ', value: modifiers.battleIqBonus, color: 'text-orange-400', description: 'Combat instinct and tactical awareness' },
    { label: 'Skill', value: modifiers.skillBonus, color: 'text-green-400', description: 'Trained ability proficiency bonus' },
  ].filter(m => m.value > 0);

  return (
    <div className="bg-muted/30 rounded px-2 py-1.5 space-y-1">
      {/* Main roll display */}
      <div className="flex items-center gap-1 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono text-sm bg-primary/20 text-primary px-1.5 py-0.5 rounded cursor-help">
              🎲 {baseRoll}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Base D20 roll (1-20)</p>
          </TooltipContent>
        </Tooltip>
        
        {modifierParts.map((mod, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className={`text-xs font-mono ${mod.color} cursor-help`}>
                + {mod.value}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">{mod.label} Bonus</p>
              <p className="text-xs text-muted-foreground">{mod.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <span className="text-xs text-muted-foreground">=</span>
        <span className="font-bold text-sm">{total}</span>
      </div>
      
      {/* Modifier breakdown labels */}
      {modifierParts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {modifierParts.map((mod, i) => (
            <span key={i} className={`text-[10px] ${mod.color} opacity-70`}>
              {mod.label}:+{mod.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
