/**
 * Overcharge Toggle Component
 * Small toggle next to the send button.
 * When active, shows a volatile glow effect.
 */

import { Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OverchargeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export default function OverchargeToggle({ enabled, onToggle, disabled = false }: OverchargeToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => !disabled && onToggle(!enabled)}
            disabled={disabled}
            className={`relative flex items-center justify-center w-9 h-9 rounded-md border transition-all duration-200 ${
              disabled
                ? 'opacity-40 cursor-not-allowed border-border'
                : enabled
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-amber-500/40 hover:text-amber-400/70'
            }`}
            aria-label={enabled ? 'Disable overcharge' : 'Enable overcharge'}
          >
            <Zap className={`w-4 h-4 ${enabled ? 'animate-pulse' : ''}`} />
            {enabled && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium text-xs">
            {enabled ? '⚡ Overcharge ON' : 'Overcharge'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {enabled
              ? 'Attack potency ×1.5-2.0 but glitch chance triples!'
              : 'Boost attack power at the cost of higher glitch risk'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
