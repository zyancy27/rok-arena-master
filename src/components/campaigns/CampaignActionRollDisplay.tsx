import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  type ActionRollResult,
  type RollOutcome,
  OUTCOME_LABELS,
} from '@/lib/campaign-action-rolls';
import {
  Dices, Shield, Zap, Eye, Search, Ghost, MessageCircle,
  Heart, Compass, Wrench, Footprints, Swords, Info,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof Dices> = {
  attack: Zap,
  defense: Shield,
  strength: Swords,
  agility: Footprints,
  perception: Eye,
  investigation: Search,
  stealth: Ghost,
  social: MessageCircle,
  endurance: Heart,
  survival: Compass,
  utility: Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
  attack: 'text-red-400',
  defense: 'text-blue-400',
  strength: 'text-orange-400',
  agility: 'text-emerald-400',
  perception: 'text-amber-400',
  investigation: 'text-violet-400',
  stealth: 'text-slate-400',
  social: 'text-pink-400',
  endurance: 'text-yellow-400',
  survival: 'text-green-400',
  utility: 'text-cyan-400',
};

const OUTCOME_STYLES: Record<RollOutcome, { bg: string; text: string }> = {
  success: { bg: 'bg-green-500/20', text: 'text-green-400' },
  partial_success: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  failure: { bg: 'bg-red-500/20', text: 'text-red-400' },
  resisted: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  success_with_cost: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
};

interface CampaignActionRollDisplayProps {
  roll: ActionRollResult;
  characterName?: string;
}

export default function CampaignActionRollDisplay({
  roll,
  characterName,
}: CampaignActionRollDisplayProps) {
  const Icon = CATEGORY_ICONS[roll.category] || Dices;
  const color = CATEGORY_COLORS[roll.category] || 'text-primary';
  const outcomeStyle = OUTCOME_STYLES[roll.outcome];

  return (
    <div className="rounded-lg p-3 space-y-2 border bg-background/50 border-border/50">
      {/* Header: Roll Type Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className={`w-4 h-4 ${color}`} />
          <span>{roll.label}</span>
          {roll.checkType === 'opposed' && (
            <Badge variant="outline" className="text-[10px] opacity-70">
              Opposed
            </Badge>
          )}
        </div>
        <Badge className={`${outcomeStyle.bg} ${outcomeStyle.text} text-xs`}>
          {OUTCOME_LABELS[roll.outcome]}
        </Badge>
      </div>

      {/* Roll Breakdown */}
      <div className="bg-muted/30 rounded-md p-2 space-y-1.5">
        {/* Visual formula */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-sm bg-primary/20 text-primary px-2 py-0.5 rounded cursor-help font-bold">
                🎲 {roll.baseRoll}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-medium">Base D20 Roll</p>
              <p className="text-xs text-muted-foreground">Random 1-20</p>
            </TooltipContent>
          </Tooltip>

          {roll.statModifier > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-sm font-mono ${color} cursor-help hover:underline`}>
                  +{roll.statModifier}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">{roll.actingStatLabel} Bonus</p>
                <p className="text-xs text-muted-foreground">Based on relevant character stats</p>
              </TooltipContent>
            </Tooltip>
          )}

          {roll.tierModifier > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-mono text-purple-400 cursor-help hover:underline">
                  +{roll.tierModifier}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">Tier Bonus</p>
                <p className="text-xs text-muted-foreground">Character power level</p>
              </TooltipContent>
            </Tooltip>
          )}

          {roll.luckModifier > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-mono text-yellow-400 cursor-help hover:underline">
                  +{roll.luckModifier}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">Luck Bonus</p>
              </TooltipContent>
            </Tooltip>
          )}

          <span className="text-muted-foreground">=</span>
          <span className="text-sm font-bold bg-foreground/10 px-2 py-0.5 rounded">
            {roll.actingValue}
          </span>
        </div>

        {/* Stat labels row */}
        <div className="flex items-center gap-3 flex-wrap text-[10px]">
          <span className="text-muted-foreground">D20</span>
          {roll.statModifier > 0 && (
            <span className={`${color} opacity-80`}>{roll.actingStatLabel}: +{roll.statModifier}</span>
          )}
          {roll.tierModifier > 0 && (
            <span className="text-purple-400 opacity-80">Tier: +{roll.tierModifier}</span>
          )}
          {roll.luckModifier > 0 && (
            <span className="text-yellow-400 opacity-80">Luck: +{roll.luckModifier}</span>
          )}
        </div>
      </div>

      {/* Result line */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {characterName ? `${characterName}'s ` : ''}{roll.actingStatLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {roll.actingValue} vs {roll.opposingLabel} {roll.opposingValue}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                <Info className="w-3 h-3 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-xs">
                Gap: {Math.abs(roll.gap)} — {roll.gap > 0 ? 'exceeded' : 'fell short of'} the target
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
