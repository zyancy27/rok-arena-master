import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Wrench } from 'lucide-react';
import type { Construct } from '@/lib/battle-dice';
import ConstructChip from './ConstructChip';

interface ConstructPanelProps {
  constructs: Construct[];
  characterId: string;
  concentrationUsesRemaining: number;
  onRepairConstruct: (construct: Construct) => void;
  disabled?: boolean;
}

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

      <div className="flex flex-wrap gap-1.5">
        {myConstructs.map((construct) => {
          const isDamaged = construct.currentDurability < construct.maxDurability;
          const canRepair = isDamaged && concentrationUsesRemaining > 0 && !disabled;

          return (
            <div key={construct.id} className="flex items-center gap-1">
              <ConstructChip construct={construct} />
              {isDamaged && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRepairConstruct(construct)}
                      disabled={!canRepair}
                      className="h-5 w-5 p-0"
                    >
                      <Wrench className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Repair (costs 1 Concentration)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
