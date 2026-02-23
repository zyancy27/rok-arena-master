import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Clock } from 'lucide-react';
import type { ActiveArenaModifiers } from '@/lib/arena-modifiers';

interface ArenaModifierBadgeProps {
  modifiers: ActiveArenaModifiers;
}

/**
 * Compact display of the active daily + weekly arena modifiers.
 * Hoverable for details.
 */
export default function ArenaModifierBadge({ modifiers }: ArenaModifierBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const { daily, weekly, combinedStatMods, dailyResetsIn, weeklyResetsIn } = modifiers;

  // Format stat mods for display
  const statModEntries = Object.entries(combinedStatMods).filter(([, v]) => v !== 0);

  return (
    <TooltipProvider>
      <div className="space-y-1">
        {/* Daily modifier */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs cursor-pointer bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
              onClick={() => setExpanded(prev => !prev)}
            >
              {daily.emoji} {daily.name}
              <Clock className="w-3 h-3 ml-1 opacity-60" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold">{daily.emoji} {daily.name} (Daily)</p>
            <p className="text-xs text-muted-foreground mt-1">{daily.description}</p>
            <p className="text-xs mt-1 opacity-60">Resets in {dailyResetsIn}</p>
          </TooltipContent>
        </Tooltip>

        {/* Weekly modifier */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs cursor-pointer bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors"
              onClick={() => setExpanded(prev => !prev)}
            >
              {weekly.emoji} {weekly.name}
              <Calendar className="w-3 h-3 ml-1 opacity-60" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold">{weekly.emoji} {weekly.name} (Weekly)</p>
            <p className="text-xs text-muted-foreground mt-1">{weekly.description}</p>
            <p className="text-xs mt-1 opacity-60">Resets in {weeklyResetsIn}</p>
          </TooltipContent>
        </Tooltip>

        {/* Expanded stat effects */}
        {expanded && statModEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 animate-fade-in">
            {statModEntries.map(([stat, val]) => (
              <Badge
                key={stat}
                variant="outline"
                className={`text-[10px] ${
                  val > 0
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {stat.replace('_', ' ')} {val > 0 ? '+' : ''}{val}%
              </Badge>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
