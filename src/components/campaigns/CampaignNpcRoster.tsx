/**
 * CampaignNpcRoster — Known NPC panel showing name, role, last seen,
 * emotional tone, and relationship summary. Displayed in the narrator tab.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, MapPin, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CampaignNpc {
  id: string;
  name: string;
  full_name: string | null;
  role: string;
  current_zone: string | null;
  status: string;
  emotional_tone: string | null;
  relationship_summary: string | null;
  trust_disposition: number;
  last_seen_day: number | null;
  occupation: string | null;
  story_relevance_level: string;
}

interface CampaignNpcRosterProps {
  campaignId: string;
  currentDay: number;
}

const emotionColors: Record<string, string> = {
  grateful: 'text-green-400',
  admiring: 'text-primary',
  friendly: 'text-accent',
  neutral: 'text-muted-foreground',
  suspicious: 'text-amber-400',
  irritated: 'text-amber-500',
  fearful: 'text-destructive/70',
  hostile: 'text-destructive',
};

function getEmotionColor(tone: string | null): string {
  if (!tone) return 'text-muted-foreground';
  const t = tone.toLowerCase();
  for (const [key, color] of Object.entries(emotionColors)) {
    if (t.includes(key)) return color;
  }
  return 'text-muted-foreground';
}

function getTrustLabel(trust: number): { label: string; color: string } {
  if (trust >= 60) return { label: 'Trusting', color: 'text-green-400' };
  if (trust >= 30) return { label: 'Friendly', color: 'text-accent' };
  if (trust >= 0) return { label: 'Neutral', color: 'text-muted-foreground' };
  if (trust >= -30) return { label: 'Wary', color: 'text-amber-400' };
  return { label: 'Hostile', color: 'text-destructive' };
}

export default function CampaignNpcRoster({ campaignId, currentDay }: CampaignNpcRosterProps) {
  const [npcs, setNpcs] = useState<CampaignNpc[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [expandedNpcId, setExpandedNpcId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('campaign_npcs')
        .select('id, name, full_name, role, current_zone, status, emotional_tone, relationship_summary, trust_disposition, last_seen_day, occupation, story_relevance_level')
        .eq('campaign_id', campaignId)
        .eq('status', 'alive')
        .order('story_relevance_level', { ascending: true });
      if (data) setNpcs(data as any);
    };
    fetch();
  }, [campaignId]);

  if (npcs.length === 0) return null;

  const relevantNpcs = npcs.filter(n => n.story_relevance_level !== 'background');
  const backgroundNpcs = npcs.filter(n => n.story_relevance_level === 'background');

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-border/20">
          <Users className="w-3.5 h-3.5 text-accent" />
          Known NPCs ({npcs.length})
          {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 py-2 space-y-2 max-h-[300px] overflow-y-auto">
          {relevantNpcs.map(npc => {
            const trust = getTrustLabel(npc.trust_disposition);
            const emotionColor = getEmotionColor(npc.emotional_tone);
            const isExpanded = expandedNpcId === npc.id;
            const daysSince = npc.last_seen_day != null ? currentDay - npc.last_seen_day : null;

            return (
              <button
                key={npc.id}
                onClick={() => setExpandedNpcId(isExpanded ? null : npc.id)}
                className="w-full text-left p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors border border-border/20"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-accent">{npc.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground/90 truncate">{npc.name}</span>
                      {npc.occupation && (
                        <span className="text-[9px] text-muted-foreground/60 truncate">· {npc.occupation}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px]">
                      {npc.emotional_tone && npc.emotional_tone !== 'neutral' && (
                        <span className={emotionColor}>{npc.emotional_tone}</span>
                      )}
                      <span className={trust.color}>{trust.label}</span>
                    </div>
                  </div>
                  {npc.current_zone && (
                    <span className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5 shrink-0">
                      <MapPin className="w-2.5 h-2.5" />
                      {npc.current_zone}
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                    {npc.relationship_summary && (
                      <p className="text-[10px] text-foreground/60 italic">{npc.relationship_summary}</p>
                    )}
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50">
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1">{npc.role}</Badge>
                      {daysSince != null && (
                        <span>Last seen: {daysSince === 0 ? 'today' : `${daysSince}d ago`}</span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {backgroundNpcs.length > 0 && (
            <div className="pt-1">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Background</p>
              <div className="flex flex-wrap gap-1">
                {backgroundNpcs.map(npc => (
                  <Badge key={npc.id} variant="outline" className="text-[8px] h-4 px-1.5 border-border/20 text-muted-foreground/50">
                    {npc.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
