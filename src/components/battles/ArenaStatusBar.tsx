/**
 * Arena Status Bar
 * 
 * Displays the current Living Arena state: stability, hazard level,
 * and environmental pressure. Only shows when arena has taken damage.
 */

import { cn } from '@/lib/utils';
import { AlertTriangle, Shield, Flame } from 'lucide-react';
import type { ArenaState } from '@/lib/living-arena';

interface ArenaStatusBarProps {
  arenaState: ArenaState;
  className?: string;
}

export default function ArenaStatusBar({ arenaState, className }: ArenaStatusBarProps) {
  // Don't show if arena is pristine
  if (arenaState.stability >= 95 && arenaState.hazardLevel <= 5) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-all duration-500',
      arenaState.isCritical
        ? 'bg-destructive/10 border border-destructive/30 animate-pulse'
        : 'bg-muted/30 border border-border/50',
      className,
    )}>
      {/* Stability */}
      <div className="flex items-center gap-1">
        <Shield className={cn('h-3 w-3', arenaState.stability < 30 ? 'text-destructive' : 'text-muted-foreground')} />
        <span className={cn(arenaState.stability < 30 ? 'text-destructive' : 'text-muted-foreground')}>
          {arenaState.stability}%
        </span>
      </div>
      
      {/* Hazard */}
      {arenaState.hazardLevel > 10 && (
        <div className="flex items-center gap-1">
          <Flame className={cn('h-3 w-3', arenaState.hazardLevel > 60 ? 'text-orange-400' : 'text-muted-foreground')} />
          <span className={cn(arenaState.hazardLevel > 60 ? 'text-orange-400' : 'text-muted-foreground')}>
            {arenaState.hazardLevel}%
          </span>
        </div>
      )}
      
      {/* Critical warning */}
      {arenaState.isCritical && (
        <div className="flex items-center gap-1 ml-auto">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span className="text-destructive font-medium">CRITICAL</span>
        </div>
      )}
      
      {/* Condition tags */}
      {arenaState.conditionTags.length > 0 && !arenaState.isCritical && (
        <div className="ml-auto flex gap-1">
          {arenaState.conditionTags.slice(-3).map(tag => (
            <span key={tag} className="text-muted-foreground/60 capitalize">
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
