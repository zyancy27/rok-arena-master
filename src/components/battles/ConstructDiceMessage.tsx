import { Badge } from '@/components/ui/badge';
import { Shield, Swords, Sparkles, Wrench, X } from 'lucide-react';
import type { ConstructDefenseResult, ConstructRepairResult, Construct } from '@/lib/battle-dice';

interface ConstructDiceMessageProps {
  type: 'attack' | 'repair';
  construct: Construct;
  attackResult?: ConstructDefenseResult;
  repairResult?: ConstructRepairResult;
  attackerName?: string;
  defenderName?: string;
}

export default function ConstructDiceMessage({
  type,
  construct,
  attackResult,
  repairResult,
  attackerName,
  defenderName,
}: ConstructDiceMessageProps) {
  if (type === 'attack' && attackResult) {
    const { attackRoll, defenseRoll, damage, destroyed, remainingDurability } = attackResult;

    return (
      <div className={`p-3 rounded-lg border ${destroyed ? 'bg-red-500/10 border-red-500/30' : damage > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Swords className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium">
            {attackerName} attacks {construct.name}!
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div className="bg-red-500/20 rounded p-1.5">
            <div className="text-red-300 font-medium">Attack Roll</div>
            <div className="font-mono">
              🎲 {attackRoll.baseRoll} + {attackRoll.modifiers.tierBonus + attackRoll.modifiers.statBonus + attackRoll.modifiers.skillBonus} = <span className="text-red-400 font-bold">{attackRoll.total}</span>
            </div>
          </div>
          <div className="bg-blue-500/20 rounded p-1.5">
            <div className="text-blue-300 font-medium">Construct Defense</div>
            <div className="font-mono">
              🛡️ {defenseRoll.baseRoll} + {defenseRoll.modifiers.tierBonus + defenseRoll.modifiers.statBonus + defenseRoll.modifiers.skillBonus + defenseRoll.modifiers.battleIqBonus} = <span className="text-blue-400 font-bold">{defenseRoll.total}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {destroyed ? (
            <Badge variant="destructive" className="gap-1">
              <X className="w-3 h-3" />
              DESTROYED!
            </Badge>
          ) : damage > 0 ? (
            <>
              <Badge variant="outline" className="text-orange-400 border-orange-400/50">
                -{damage} Durability
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                {remainingDurability} remaining
              </Badge>
            </>
          ) : (
            <Badge variant="outline" className="text-green-400 border-green-400/50 gap-1">
              <Shield className="w-3 h-3" />
              Blocked!
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (type === 'repair' && repairResult) {
    const { repairAmount, newDurability, statPenalty } = repairResult;

    return (
      <div className="p-3 rounded-lg border bg-purple-500/10 border-purple-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">
            {defenderName} repairs {construct.name}!
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-green-400 border-green-400/50 gap-1">
            <Sparkles className="w-3 h-3" />
            +{repairAmount} Durability
          </Badge>
          <Badge variant="outline" className="text-blue-400 border-blue-400/50">
            Now at {newDurability}/{construct.maxDurability}
          </Badge>
          <Badge variant="outline" className="text-amber-400 border-amber-400/50">
            -{statPenalty}% stats next action
          </Badge>
        </div>
      </div>
    );
  }

  return null;
}
