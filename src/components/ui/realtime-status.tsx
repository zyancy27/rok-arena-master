import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface RealtimeStatusProps {
  status: ConnectionStatus;
  className?: string;
}

export function RealtimeStatus({ status, className }: RealtimeStatusProps) {
  const config = {
    connecting: {
      icon: Loader2,
      label: 'Connecting…',
      dot: 'bg-yellow-500 animate-pulse',
      iconClass: 'animate-spin text-yellow-500',
    },
    connected: {
      icon: Wifi,
      label: 'Live',
      dot: 'bg-emerald-500',
      iconClass: 'text-emerald-500',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Offline',
      dot: 'bg-destructive animate-pulse',
      iconClass: 'text-destructive',
    },
    error: {
      icon: WifiOff,
      label: 'Connection lost',
      dot: 'bg-destructive animate-pulse',
      iconClass: 'text-destructive',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        'bg-background/80 backdrop-blur-sm border border-border/50',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      <Icon className={cn('h-3 w-3', config.iconClass)} />
      <span className="text-muted-foreground">{config.label}</span>
    </div>
  );
}
