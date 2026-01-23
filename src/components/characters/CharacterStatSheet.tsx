import { CHARACTER_STATS, getStatLabel, type CharacterStats } from '@/lib/character-stats';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Brain, 
  Dumbbell, 
  Flame, 
  Zap, 
  Shield, 
  Heart, 
  Target, 
  Sparkles 
} from 'lucide-react';

const iconMap = {
  Brain,
  Dumbbell,
  Flame,
  Zap,
  Shield,
  Heart,
  Target,
  Sparkles,
};

interface CharacterStatSheetProps {
  stats: CharacterStats;
  compact?: boolean;
}

export default function CharacterStatSheet({ stats, compact = false }: CharacterStatSheetProps) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {CHARACTER_STATS.map((stat) => {
        const value = stats[stat.key as keyof CharacterStats] ?? 50;
        const Icon = iconMap[stat.icon as keyof typeof iconMap];
        
        return (
          <Tooltip key={stat.key}>
            <TooltipTrigger asChild>
              <div className={`space-y-1 ${compact ? 'p-2' : 'p-3'} rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-help`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon 
                      className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} 
                      style={{ color: stat.color }}
                    />
                    <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
                      {stat.name}
                    </span>
                  </div>
                  <span className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
                    {value}
                  </span>
                </div>
                <Progress 
                  value={value} 
                  className={`${compact ? 'h-1.5' : 'h-2'}`}
                  style={{
                    '--progress-color': stat.color,
                  } as React.CSSProperties}
                />
                {!compact && (
                  <p className="text-xs text-muted-foreground">
                    {getStatLabel(value)}
                  </p>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="font-semibold">{stat.name}: {value}/100</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
