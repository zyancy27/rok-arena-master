import { Sparkles, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SolarSystemTabsProps {
  onGalaxyClick: () => void;
  onCreatePlanetClick: () => void;
  className?: string;
}

export default function SolarSystemTabs({ 
  onGalaxyClick, 
  onCreatePlanetClick,
  className 
}: SolarSystemTabsProps) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-1 p-1 bg-background/80 backdrop-blur-md rounded-lg border border-border/50 shadow-lg",
      className
    )}>
      <button
        onClick={onGalaxyClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">Galaxy</span>
      </button>
      
      <div className="w-px h-6 bg-border/50" />
      
      <button
        onClick={onCreatePlanetClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">New Planet</span>
      </button>
    </div>
  );
}
