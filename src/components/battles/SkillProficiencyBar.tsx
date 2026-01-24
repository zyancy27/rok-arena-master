import { Target, AlertTriangle, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getSkillProficiency, getSkillBarColor } from '@/lib/battle-physics';

interface SkillProficiencyBarProps {
  skillStat: number;
  characterName: string;
  compact?: boolean;
}

export default function SkillProficiencyBar({ skillStat, characterName, compact = false }: SkillProficiencyBarProps) {
  const proficiency = getSkillProficiency(skillStat);
  const barColor = getSkillBarColor(skillStat);
  
  const isLowSkill = skillStat <= 30;
  const isHighSkill = skillStat >= 80;
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3" style={{ color: barColor }} />
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${skillStat}%`, 
                    backgroundColor: barColor 
                  }}
                />
              </div>
              {isLowSkill && (
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              )}
              {isHighSkill && (
                <Sparkles className="w-3 h-3 text-purple-400" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold capitalize">{proficiency.proficiencyLevel} ({skillStat}/100)</p>
              <p className="text-xs text-muted-foreground">{proficiency.description}</p>
              {isLowSkill && (
                <p className="text-xs text-amber-500">⚠️ Low skill may cause unexpected battle outcomes!</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: barColor }} />
          <span className="text-sm font-medium">{characterName}'s Skill</span>
        </div>
        <Badge 
          variant="outline" 
          className="capitalize text-xs"
          style={{ 
            borderColor: barColor,
            color: barColor,
          }}
        >
          {proficiency.proficiencyLevel}
        </Badge>
      </div>
      
      <div className="relative">
        <Progress 
          value={skillStat} 
          className="h-2"
          style={{ 
            ['--progress-foreground' as string]: barColor,
          }}
        />
        {isLowSkill && (
          <div className="absolute -right-1 -top-1">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
        )}
        {isHighSkill && (
          <div className="absolute -right-1 -top-1">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">{proficiency.description}</p>
      
      {isLowSkill && (
        <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200">
            Low skill proficiency may cause attacks to misfire, powers to surge unexpectedly, 
            or techniques to fail mid-execution during battle!
          </p>
        </div>
      )}
    </div>
  );
}
