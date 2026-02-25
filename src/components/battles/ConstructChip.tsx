import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, User, Bug, Box, Mountain, Zap } from 'lucide-react';
import type { Construct, ConstructCategory } from '@/lib/battle-dice';

const CATEGORY_CONFIG: Record<ConstructCategory, { icon: React.ReactNode; color: string }> = {
  person: { icon: <User className="w-3 h-3" />, color: 'text-blue-400 border-blue-400/40' },
  animal: { icon: <Bug className="w-3 h-3" />, color: 'text-green-400 border-green-400/40' },
  object: { icon: <Box className="w-3 h-3" />, color: 'text-orange-400 border-orange-400/40' },
  barrier: { icon: <Shield className="w-3 h-3" />, color: 'text-cyan-400 border-cyan-400/40' },
  environmental: { icon: <Mountain className="w-3 h-3" />, color: 'text-amber-400 border-amber-400/40' },
  energy: { icon: <Zap className="w-3 h-3" />, color: 'text-purple-400 border-purple-400/40' },
};

interface ConstructChipProps {
  construct: Construct;
  compact?: boolean;
}

export default function ConstructChip({ construct, compact = false }: ConstructChipProps) {
  const config = CATEGORY_CONFIG[construct.type] || CATEGORY_CONFIG.object;
  const durPct = Math.round((construct.currentDurability / construct.maxDurability) * 100);
  const durColor = durPct > 66 ? 'bg-green-500' : durPct > 33 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`gap-1 px-2 py-0.5 text-xs cursor-default ${config.color}`}
        >
          {config.icon}
          <span className="max-w-[80px] truncate">{construct.name}</span>
          {!compact && (
            <span className="flex items-center gap-0.5 ml-0.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${durColor}`} />
              <span className="text-[10px] tabular-nums">{construct.currentDurability}/{construct.maxDurability}</span>
            </span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-medium text-xs">{construct.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{construct.type} construct</p>
        <p className="text-[10px]">Durability: {construct.currentDurability}/{construct.maxDurability}</p>
        {construct.rules?.behaviorSummary && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{construct.rules.behaviorSummary}</p>
        )}
        {construct.rules?.limitations && (
          <p className="text-[10px] text-amber-400 mt-0.5">⚠ {construct.rules.limitations}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
