/**
 * Character Review Panel
 *
 * Displays a live plain-language summary of the character being created/edited.
 * Used on the final step of the wizard stepper.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Globe, Swords, Smile, BookOpen, Target, Sparkles } from 'lucide-react';
import CharacterSummaryTags from './CharacterSummaryTags';
import type { CharacterStats } from '@/lib/character-stats';
import { POWER_TIERS } from '@/lib/game-constants';

interface CharacterReviewPanelProps {
  name: string;
  level: number;
  imageUrl?: string;
  imageFile?: File | null;
  race?: string;
  subRace?: string;
  age?: string;
  sex?: string;
  homePlanet?: string;
  homeMoon?: string;
  powers?: string;
  abilities?: string;
  weaponsItems?: string;
  personality?: string;
  mentality?: string;
  lore?: string;
  stats: CharacterStats;
  appearanceFilledCount?: number;
  timelineEventCount?: number;
}

function ReviewSection({
  icon,
  label,
  children,
  empty,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={`p-1 rounded shrink-0 ${empty ? 'text-muted-foreground/40' : 'text-primary'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className={`text-xs mt-0.5 ${empty ? 'text-muted-foreground/50 italic' : 'text-foreground/80'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CharacterReviewPanel({
  name,
  level,
  imageUrl,
  imageFile,
  race,
  subRace,
  age,
  sex,
  homePlanet,
  homeMoon,
  powers,
  abilities,
  weaponsItems,
  personality,
  mentality,
  lore,
  stats,
  appearanceFilledCount,
  timelineEventCount,
}: CharacterReviewPanelProps) {
  const tier = POWER_TIERS.find(t => t.level === level);
  const displayImage = imageFile ? URL.createObjectURL(imageFile) : imageUrl || undefined;
  const cleanPersonality = personality?.replace(/\[ARCHETYPE:[^\]]+\]\s*/gi, '').trim();
  const cleanMentality = mentality?.replace(/\[(ALIGNMENT|APPROACH):[^\]]+\]\s*/gi, '').trim();

  // Count filled sections
  const filledSections = [
    !!(race || homePlanet),
    !!(powers || abilities || weaponsItems),
    !!(personality || mentality),
    !!(lore || (appearanceFilledCount && appearanceFilledCount > 0)),
    Object.values(stats).some(v => v !== 50),
  ].filter(Boolean).length;

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-primary/30">
            <AvatarImage src={displayImage} />
            <AvatarFallback className="bg-primary/20 text-primary text-lg">
              {name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate">{name || 'Unnamed Character'}</h3>
            <p className="text-[11px] text-muted-foreground">
              {tier ? `Tier ${level}: ${tier.name}` : `Tier ${level}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                {filledSections}/5 sections filled
              </Badge>
            </div>
          </div>
        </div>

        {/* Summary Tags */}
        <CharacterSummaryTags
          name={name}
          race={race}
          homePlanet={homePlanet}
          powers={powers}
          abilities={abilities}
          personality={personality}
          mentality={mentality}
          stats={stats}
          level={level}
        />

        {/* Section Summaries */}
        <div className="space-y-2.5 pt-1 border-t border-border/50">
          <ReviewSection icon={<Globe className="w-3.5 h-3.5" />} label="Origin" empty={!race && !homePlanet}>
            {race || homePlanet ? (
              <>
                {race && <span>{race}{subRace ? ` (${subRace})` : ''}</span>}
                {race && homePlanet && ' · '}
                {homePlanet && <span>{homePlanet}{homeMoon ? ` / ${homeMoon}` : ''}</span>}
                {age && <span> · Age {age}</span>}
                {sex && <span> · {sex}</span>}
              </>
            ) : 'No origin details set'}
          </ReviewSection>

          <ReviewSection icon={<Swords className="w-3.5 h-3.5" />} label="Powers & Equipment" empty={!powers && !abilities}>
            {powers ? (
              <p className="line-clamp-2">{powers}</p>
            ) : 'No powers defined'}
            {abilities && <p className="line-clamp-1 mt-0.5 text-muted-foreground">{abilities.split('\n')[0]}</p>}
          </ReviewSection>

          <ReviewSection icon={<Smile className="w-3.5 h-3.5" />} label="Personality" empty={!cleanPersonality && !cleanMentality}>
            {cleanPersonality || cleanMentality ? (
              <p className="line-clamp-2">{cleanPersonality || cleanMentality}</p>
            ) : 'No personality details'}
          </ReviewSection>

          <ReviewSection icon={<Target className="w-3.5 h-3.5" />} label="Stats" empty={!Object.values(stats).some(v => v !== 50)}>
            {Object.values(stats).some(v => v !== 50) ? (
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats)
                  .filter(([, v]) => v !== 50)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <span key={k} className="text-[10px] px-1 py-0 rounded bg-muted border border-border">
                      {k.replace('stat_', '').replace(/_/g, ' ')} {v}
                    </span>
                  ))}
              </div>
            ) : 'Default stats (50 each)'}
          </ReviewSection>

          <ReviewSection icon={<BookOpen className="w-3.5 h-3.5" />} label="Lore" empty={!lore && !appearanceFilledCount && !timelineEventCount}>
            {lore ? (
              <p className="line-clamp-2">{lore}</p>
            ) : 'No backstory'}
            {(appearanceFilledCount || 0) > 0 && (
              <p className="text-muted-foreground mt-0.5">{appearanceFilledCount} appearance details</p>
            )}
            {(timelineEventCount || 0) > 0 && (
              <p className="text-muted-foreground">{timelineEventCount} timeline events</p>
            )}
          </ReviewSection>
        </div>
      </CardContent>
    </Card>
  );
}
