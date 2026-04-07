/**
 * CampaignPressureIndicator — Ambient display of active pressures,
 * gated opportunities, and unresolved threads.
 * Non-gamey, subtle, narrative-first. Shown in the narrator tab or as an overlay.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Lock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CampaignPressureIndicatorProps {
  campaignId: string;
}

interface PressureData {
  currentPressure: string | null;
  futurePressures: any[];
  unresolvedThreads: any[];
  gatedOpportunities: any[];
  storyHooks: any[];
}

export default function CampaignPressureIndicator({ campaignId }: CampaignPressureIndicatorProps) {
  const [data, setData] = useState<PressureData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: brain } = await supabase
        .from('campaign_brain')
        .select('current_pressure, future_pressures, unresolved_threads, gated_opportunities, story_hooks')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (brain) {
        setData({
          currentPressure: (brain as any).current_pressure,
          futurePressures: Array.isArray((brain as any).future_pressures) ? (brain as any).future_pressures : [],
          unresolvedThreads: Array.isArray((brain as any).unresolved_threads) ? (brain as any).unresolved_threads : [],
          gatedOpportunities: Array.isArray((brain as any).gated_opportunities) ? (brain as any).gated_opportunities : [],
          storyHooks: Array.isArray((brain as any).story_hooks) ? (brain as any).story_hooks : [],
        });
      }
    };
    fetch();
  }, [campaignId]);

  if (!data) return null;

  const activeOpps = data.gatedOpportunities.filter((g: any) => g?.status !== 'expired' && g?.status !== 'claimed');
  const activeThreads = data.unresolvedThreads.slice(0, 5);
  const activeHooks = data.storyHooks.slice(0, 3);

  const hasContent = activeThreads.length > 0 || activeOpps.length > 0 || activeHooks.length > 0;
  if (!hasContent && !data.currentPressure) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-border/20">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          Story Pressure
          {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 py-2 space-y-3 max-h-[280px] overflow-y-auto">
          {/* Current pressure */}
          {data.currentPressure && (
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-amber-400/60 font-semibold">Current pressure</p>
              <p className="text-[10px] text-foreground/70 italic">{data.currentPressure}</p>
            </div>
          )}

          {/* Unresolved threads */}
          {activeThreads.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-semibold flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                Unresolved ({data.unresolvedThreads.length})
              </p>
              {activeThreads.map((thread: any, i: number) => (
                <p key={i} className="text-[10px] text-foreground/60 pl-2 border-l border-amber-400/20">
                  {typeof thread === 'string' ? thread : thread?.description || thread?.thread || JSON.stringify(thread)}
                </p>
              ))}
            </div>
          )}

          {/* Gated opportunities */}
          {activeOpps.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-primary/50 font-semibold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Opportunities ({activeOpps.length})
              </p>
              {activeOpps.map((opp: any, i: number) => (
                <div key={i} className="text-[10px] text-foreground/60 pl-2 border-l border-primary/20">
                  <span>{typeof opp === 'string' ? opp : opp?.description || opp?.name || JSON.stringify(opp)}</span>
                  {opp?.condition && (
                    <span className="text-muted-foreground/40 ml-1">— {opp.condition}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Story hooks */}
          {activeHooks.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-accent/50 font-semibold">Hooks</p>
              {activeHooks.map((hook: any, i: number) => (
                <p key={i} className="text-[10px] text-foreground/50 pl-2 border-l border-accent/20">
                  {typeof hook === 'string' ? hook : hook?.description || hook?.hook || JSON.stringify(hook)}
                </p>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
