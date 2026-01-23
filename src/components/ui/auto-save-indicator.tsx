import { Loader2, Check, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  canUndo: boolean;
  onUndo: () => void;
  className?: string;
}

export function AutoSaveIndicator({
  isSaving,
  lastSaved,
  canUndo,
  onUndo,
  className,
}: AutoSaveIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      {isSaving ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </span>
      ) : lastSaved ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Check className="w-3 h-3 text-green-500" />
          Saved at {formatTime(lastSaved)}
        </span>
      ) : null}
      
      {canUndo && !isSaving && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          className="h-6 px-2 text-xs"
        >
          <Undo2 className="w-3 h-3 mr-1" />
          Undo
        </Button>
      )}
    </div>
  );
}
