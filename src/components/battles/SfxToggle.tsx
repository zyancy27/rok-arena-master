import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SfxToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export default function SfxToggle({ muted, onToggle }: SfxToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {muted ? 'Unmute SFX' : 'Mute SFX'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
