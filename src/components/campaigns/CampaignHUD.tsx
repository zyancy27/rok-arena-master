/**
 * CampaignHUD — Persistent status bar showing campaign spine:
 * current arc, pressure, time/day, location mood, and scene status.
 * Reads from campaign_brain + campaign state to surface what matters NOW.
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Flame, Clock, MapPin, AlertTriangle, Compass,
  TrendingUp, Zap, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CampaignHUDProps {
  campaignId: string;
  currentZone: string;
  timeOfDay: string;
  dayCount: number;
  campaignStatus: string;
}

interface CampaignBrainSnapshot {
  current_arc: string | null;
  current_pressure: string | null;
  active_story_beats: any[];
  unresolved_threads: any[];
  remaining_narrative_runway: string | null;
  gated_opportunities: any[];
  current_location: string | null;
}

interface LocationMood {
  zone_name: string;
  location_mood: string | null;
  controlled_by: string | null;
  control_type: string | null;
}

const pressureColors: Record<string, string> = {
  critical: 'text-destructive',
  high: 'text-amber-400',
  rising: 'text-amber-300',
  moderate: 'text-muted-foreground',
  low: 'text-muted-foreground/70',
};

const pressureIcons: Record<string, typeof Flame> = {
  critical: Flame,
  high: AlertTriangle,
  rising: TrendingUp,
  moderate: Eye,
  low: Eye,
};

function classifyPressure(pressure: string | null): string {
  if (!pressure) return 'low';
  const p = pressure.toLowerCase();
  if (/(critical|catastrophic|overwhelming)/.test(p)) return 'critical';
  if (/(high|hostile|dangerous|volatile)/.test(p)) return 'high';
  if (/(rising|escalating|building|tense)/.test(p)) return 'rising';
  if (/(moderate|guarded|watchful)/.test(p)) return 'moderate';
  return 'low';
}

export default function CampaignHUD({
  campaignId,
  currentZone,
  timeOfDay,
  dayCount,
  campaignStatus,
}: CampaignHUDProps) {
  const [brain, setBrain] = useState<CampaignBrainSnapshot | null>(null);
  const [locationMood, setLocationMood] = useState<LocationMood | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (campaignStatus !== 'active') return;

    const fetchBrain = async () => {
      const { data } = await supabase
        .from('campaign_brain')
        .select('current_arc, current_pressure, active_story_beats, unresolved_threads, remaining_narrative_runway, gated_opportunities, current_location')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (data) setBrain(data as any);
    };

    const fetchLocation = async () => {
      const { data } = await supabase
        .from('campaign_location_state')
        .select('zone_name, location_mood, controlled_by, control_type')
        .eq('campaign_id', campaignId)
        .eq('zone_name', currentZone)
        .maybeSingle();
      if (data) setLocationMood(data as any);
    };

    fetchBrain();
    fetchLocation();
  }, [campaignId, currentZone, campaignStatus]);

  const pressureLevel = useMemo(() => classifyPressure(brain?.current_pressure ?? null), [brain?.current_pressure]);
  const PressureIcon = pressureIcons[pressureLevel] ?? Eye;
  const pressureColor = pressureColors[pressureLevel] ?? 'text-muted-foreground';

  const activeBeats = useMemo(() => {
    if (!brain?.active_story_beats || !Array.isArray(brain.active_story_beats)) return [];
    return brain.active_story_beats.slice(0, 3);
  }, [brain?.active_story_beats]);

  const unresolvedCount = Array.isArray(brain?.unresolved_threads) ? brain!.unresolved_threads.length : 0;
  const gatedCount = Array.isArray(brain?.gated_opportunities) ? brain!.gated_opportunities.filter((g: any) => g?.status !== 'expired').length : 0;

  if (campaignStatus !== 'active' || !brain) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="bg-card/60 backdrop-blur-sm border-b border-border/30 px-3 py-1.5 relative z-10">
        {/* Compact row — always visible */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {/* Arc */}
            {brain.current_arc && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <Compass className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate font-medium text-foreground/80">{brain.current_arc}</span>
              </span>
            )}

            {/* Pressure */}
            <span className={`flex items-center gap-0.5 ${pressureColor}`}>
              <PressureIcon className="w-3 h-3" />
              <span className="capitalize">{pressureLevel}</span>
            </span>

            {/* Location mood */}
            {locationMood?.location_mood && locationMood.location_mood !== 'neutral' && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-border/40">
                {locationMood.location_mood}
              </Badge>
            )}

            {/* Threads/opportunities counter */}
            {(unresolvedCount > 0 || gatedCount > 0) && (
              <span className="ml-auto flex items-center gap-1.5">
                {unresolvedCount > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-400/70">
                    <Zap className="w-2.5 h-2.5" />
                    {unresolvedCount}
                  </span>
                )}
                {gatedCount > 0 && (
                  <span className="flex items-center gap-0.5 text-primary/70">
                    <Eye className="w-2.5 h-2.5" />
                    {gatedCount}
                  </span>
                )}
              </span>
            )}

            {expanded ? <ChevronUp className="w-3 h-3 shrink-0 ml-auto" /> : <ChevronDown className="w-3 h-3 shrink-0 ml-auto" />}
          </button>
        </CollapsibleTrigger>

        {/* Expanded detail */}
        <CollapsibleContent>
          <div className="pt-2 pb-1 space-y-1.5 border-t border-border/20 mt-1.5">
            {/* Active story beats */}
            {activeBeats.length > 0 && (
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Active beats</span>
                {activeBeats.map((beat: any, i: number) => (
                  <p key={i} className="text-[10px] text-foreground/70 pl-2 border-l border-primary/30">
                    {typeof beat === 'string' ? beat : beat?.description || beat?.beat || JSON.stringify(beat)}
                  </p>
                ))}
              </div>
            )}

            {/* Current pressure description */}
            {brain.current_pressure && (
              <p className="text-[10px] text-muted-foreground italic">
                Pressure: {brain.current_pressure}
              </p>
            )}

            {/* Narrative runway */}
            {brain.remaining_narrative_runway && (
              <p className="text-[10px] text-muted-foreground/60">
                Runway: {brain.remaining_narrative_runway}
              </p>
            )}

            {/* Territory info */}
            {locationMood?.controlled_by && (
              <p className="text-[10px] text-muted-foreground/60">
                Territory: {locationMood.controlled_by} ({locationMood.control_type ?? 'control'})
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
