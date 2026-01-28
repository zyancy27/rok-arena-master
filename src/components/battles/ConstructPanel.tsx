import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Swords, Sparkles, Target, Wrench } from 'lucide-react';
import type { Construct, ConstructRepairResult } from '@/lib/battle-dice';

interface ConstructPanelProps {
  constructs: Construct[];
  characterId: string;
  concentrationUsesRemaining: number;
  onRepairConstruct: (construct: Construct) => void;
  disabled?: boolean;
}

const CONSTRUCT_ICONS: Record<Construct['type'], React.ReactNode> = {
  barrier: <Shield className="w-4 h-4" />,
  summon: <Sparkles className="w-4 h-4" />,
  weapon: <Swords className="w-4 h-4" />,
  trap: <Target className="w-4 h-4" />,
  other: <Sparkles className="w-4 h-4" />,
};

export default function ConstructPanel({
  constructs,
  characterId,
  concentrationUsesRemaining,
  onRepairConstruct,
  disabled = false,
}: ConstructPanelProps) {
  const myConstructs = constructs.filter(c => c.creatorId === characterId);

  if (myConstructs.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-purple-300">
        <Sparkles className="w-4 h-4" />
        <span>Active Constructs</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {myConstructs.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {myConstructs.map((construct) => {
          const durabilityPercent = (construct.currentDurability / construct.maxDurability) * 100;
          const isDamaged = construct.currentDurability < construct.maxDurability;
          const canRepair = isDamaged && concentrationUsesRemaining > 0 && !disabled;

          return (
            <div
              key={construct.id}
              className="bg-background/40 rounded-md p-2 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-purple-400">
                  {CONSTRUCT_ICONS[construct.type]}
                </span>
                <span className="text-sm font-medium flex-1">{construct.name}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    durabilityPercent > 66
                      ? 'text-green-400 border-green-400/50'
                      : durabilityPercent > 33
                      ? 'text-yellow-400 border-yellow-400/50'
                      : 'text-red-400 border-red-400/50'
                  }`}
                >
                  {construct.currentDurability}/{construct.maxDurability}
                </Badge>
              </div>

              <Progress
                value={durabilityPercent}
                className="h-1.5"
              />

              {isDamaged && (
                <div className="flex items-center gap-2 mt-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRepairConstruct(construct)}
                        disabled={!canRepair}
                        className="h-6 text-xs gap-1"
                      >
                        <Wrench className="w-3 h-3" />
                        Repair
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Use 1 Concentration to repair this construct</p>
                      <p className="text-xs text-amber-400">Warning: Stat penalty on next action</p>
                    </TooltipContent>
                  </Tooltip>
                  {!canRepair && concentrationUsesRemaining <= 0 && (
                    <span className="text-xs text-muted-foreground">No concentration left</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
