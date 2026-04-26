/**
 * Hidden diagnostic panel — campaign brain + recent turn deltas.
 *
 * Access: /internal/campaign-brain  (admin role + internal gate password)
 *
 * Lets you verify that:
 *  - The narrator still has the full campaign end-goal in `campaign_brain`
 *  - World state (NPCs, hooks, location, pressure, time) is being updated
 *  - The last 10 turn logs are flowing into deltas the brain can promote
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search, Brain, Clock, MapPin, Activity } from 'lucide-react';

interface CampaignRow {
  id: string;
  name: string;
  status: string | null;
  current_zone: string | null;
  day_count: number | null;
  updated_at: string | null;
}

interface BrainRow {
  campaign_id: string;
  premise: string | null;
  genre: string | null;
  tone: string | null;
  campaign_objective: string | null;
  core_storyline: string | null;
  victory_conditions: unknown;
  failure_conditions: unknown;
  major_arcs: unknown;
  current_arc: string | null;
  active_story_beats: unknown;
  unresolved_threads: unknown;
  known_truths: unknown;
  hidden_truths: unknown;
  future_pressures: unknown;
  campaign_length_target: string | null;
  remaining_narrative_runway: string | null;
  current_day: number | null;
  current_time_block: string | null;
  elapsed_hours: number | null;
  world_summary: string | null;
  faction_state: unknown;
  npc_roster_summary: unknown;
  current_location: string | null;
  current_pressure: string | null;
  story_hooks: unknown;
  gated_opportunities: unknown;
  region_moods: unknown;
  regional_social_heat: unknown;
  consequence_summary: unknown;
  player_impact_log: unknown;
  updated_at: string | null;
}

interface TurnLogRow {
  id: string;
  campaign_id: string;
  turn_number: number;
  day_number: number | null;
  time_block: string | null;
  zone: string | null;
  raw_input: string | null;
  parsed_intent: unknown;
  resolved_action: unknown;
  roll_result: unknown;
  scene_beat_summary: string | null;
  time_advance: number | null;
  npc_deltas: unknown;
  hook_deltas: unknown;
  opportunity_deltas: unknown;
  consequence_deltas: unknown;
  promoted: boolean | null;
  created_at: string;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function summarize(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `${v.length} items`;
  if (typeof v === 'object') return `${Object.keys(v).length} keys`;
  return String(v);
}

function JsonBlock({ value }: { value: unknown }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <pre className="text-xs bg-muted/30 border border-border rounded p-2 overflow-auto max-h-72 whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

export default function CampaignBrainDiagnostics() {
  const [params, setParams] = useSearchParams();
  const initialId = params.get('campaign') ?? '';
  const [campaignId, setCampaignId] = useState(initialId);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [brain, setBrain] = useState<BrainRow | null>(null);
  const [turns, setTurns] = useState<TurnLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load campaign list (admin RLS allows them all via is_admin_or_moderator).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status, current_zone, day_count, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      setCampaigns((data ?? []) as CampaignRow[]);
      if (!campaignId && data && data.length > 0) {
        setCampaignId(data[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSnapshot = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [brainRes, turnsRes] = await Promise.all([
        supabase.from('campaign_brain').select('*').eq('campaign_id', id).maybeSingle(),
        supabase
          .from('campaign_turn_logs')
          .select('*')
          .eq('campaign_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (brainRes.error) throw brainRes.error;
      if (turnsRes.error) throw turnsRes.error;
      setBrain((brainRes.data as BrainRow | null) ?? null);
      setTurns((turnsRes.data ?? []) as TurnLogRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBrain(null);
      setTurns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      setParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('campaign', campaignId);
        return next;
      }, { replace: true });
      void loadSnapshot(campaignId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const selectedCampaign = useMemo(
    () => campaigns.find(c => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Campaign Brain Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live view of <code>campaign_brain</code> + last 10 turn logs. Internal use only.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">← Admin</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSnapshot(campaignId)}
            disabled={!campaignId || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select campaign</CardTitle>
          <CardDescription>
            Showing the {campaigns.length} most recently updated campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={campaignId}
                onChange={e => setCampaignId(e.target.value.trim())}
                placeholder="Paste campaign UUID or pick below"
                className="pl-8 font-mono text-xs"
              />
            </div>
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-1">
              {campaigns.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCampaignId(c.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted/40 transition-colors ${
                    c.id === campaignId ? 'bg-muted/60 border border-primary/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{c.name || '(untitled)'}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {c.status ?? '—'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {c.id}
                  </div>
                </button>
              ))}
              {campaigns.length === 0 && (
                <p className="text-sm text-muted-foreground">No campaigns visible.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {selectedCampaign && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{selectedCampaign.name}</CardTitle>
              <Badge variant="outline">{selectedCampaign.status ?? 'unknown'}</Badge>
              <Badge variant="secondary" className="gap-1">
                <MapPin className="w-3 h-3" />
                {selectedCampaign.current_zone ?? '—'}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                Day {selectedCampaign.day_count ?? '—'}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* BRAIN SNAPSHOT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5" />
            campaign_brain snapshot
          </CardTitle>
          <CardDescription>
            {brain?.updated_at ? `Updated ${new Date(brain.updated_at).toLocaleString()}` : 'No brain row yet for this campaign.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!brain ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <>
              {/* End-goal section */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  End-goal & arc
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <Field label="Premise" value={brain.premise} />
                  <Field label="Core storyline" value={brain.core_storyline} />
                  <Field label="Campaign objective" value={brain.campaign_objective} />
                  <Field label="Current arc" value={brain.current_arc} />
                  <Field label="Length target" value={brain.campaign_length_target} />
                  <Field label="Runway remaining" value={brain.remaining_narrative_runway} />
                  <Field label="Genre" value={brain.genre} />
                  <Field label="Tone" value={brain.tone} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Labeled title={`Victory conditions (${asArray(brain.victory_conditions).length})`}>
                    <JsonBlock value={brain.victory_conditions} />
                  </Labeled>
                  <Labeled title={`Failure conditions (${asArray(brain.failure_conditions).length})`}>
                    <JsonBlock value={brain.failure_conditions} />
                  </Labeled>
                  <Labeled title={`Major arcs (${asArray(brain.major_arcs).length})`}>
                    <JsonBlock value={brain.major_arcs} />
                  </Labeled>
                  <Labeled title={`Active story beats (${asArray(brain.active_story_beats).length})`}>
                    <JsonBlock value={brain.active_story_beats} />
                  </Labeled>
                </div>
              </section>

              <Separator />

              {/* World pulse */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  World pulse
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Field label="Day" value={brain.current_day} />
                  <Field label="Time block" value={brain.current_time_block} />
                  <Field label="Elapsed hours" value={brain.elapsed_hours} />
                  <Field label="Pressure" value={brain.current_pressure} />
                  <Field label="Location" value={brain.current_location} />
                </div>
                <Field label="World summary" value={brain.world_summary} multiline />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Labeled title={`Faction state (${asArray(brain.faction_state).length})`}>
                    <JsonBlock value={brain.faction_state} />
                  </Labeled>
                  <Labeled title={`NPC roster summary (${asArray(brain.npc_roster_summary).length})`}>
                    <JsonBlock value={brain.npc_roster_summary} />
                  </Labeled>
                  <Labeled title="Region moods">
                    <JsonBlock value={brain.region_moods} />
                  </Labeled>
                  <Labeled title="Regional social heat">
                    <JsonBlock value={brain.regional_social_heat} />
                  </Labeled>
                </div>
              </section>

              <Separator />

              {/* Threads, hooks, truths */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Threads · hooks · truths
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Labeled title={`Unresolved threads (${asArray(brain.unresolved_threads).length})`}>
                    <JsonBlock value={brain.unresolved_threads} />
                  </Labeled>
                  <Labeled title={`Story hooks (${asArray(brain.story_hooks).length})`}>
                    <JsonBlock value={brain.story_hooks} />
                  </Labeled>
                  <Labeled title={`Gated opportunities (${asArray(brain.gated_opportunities).length})`}>
                    <JsonBlock value={brain.gated_opportunities} />
                  </Labeled>
                  <Labeled title={`Future pressures (${asArray(brain.future_pressures).length})`}>
                    <JsonBlock value={brain.future_pressures} />
                  </Labeled>
                  <Labeled title={`Known truths (${asArray(brain.known_truths).length})`}>
                    <JsonBlock value={brain.known_truths} />
                  </Labeled>
                  <Labeled title={`Hidden truths (${asArray(brain.hidden_truths).length})`}>
                    <JsonBlock value={brain.hidden_truths} />
                  </Labeled>
                  <Labeled title={`Consequence summary (${asArray(brain.consequence_summary).length})`}>
                    <JsonBlock value={brain.consequence_summary} />
                  </Labeled>
                  <Labeled title={`Player impact log (${asArray(brain.player_impact_log).length})`}>
                    <JsonBlock value={brain.player_impact_log} />
                  </Labeled>
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>

      {/* TURN DELTAS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Last {turns.length} turn deltas
          </CardTitle>
          <CardDescription>
            Most recent first. <code>promoted=true</code> means the delta has been folded into the brain/NPCs/locations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {turns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No turn logs yet.</p>
          ) : (
            turns.map(t => (
              <div key={t.id} className="border border-border rounded p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">Turn {t.turn_number}</Badge>
                  <Badge variant="outline">Day {t.day_number ?? '—'}</Badge>
                  <Badge variant="outline">{t.time_block ?? '—'}</Badge>
                  <Badge variant="outline">{t.zone ?? '—'}</Badge>
                  {t.promoted ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">promoted</Badge>
                  ) : (
                    <Badge variant="secondary">pending promotion</Badge>
                  )}
                  <span className="text-muted-foreground ml-auto">
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
                {t.raw_input && (
                  <p className="text-sm italic text-muted-foreground">"{t.raw_input}"</p>
                )}
                {t.scene_beat_summary && (
                  <p className="text-sm">{t.scene_beat_summary}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                  <span>NPC Δ: {asArray(t.npc_deltas).length}</span>
                  <span>Hook Δ: {asArray(t.hook_deltas).length}</span>
                  <span>Opportunity Δ: {asArray(t.opportunity_deltas).length}</span>
                  <span>Consequence Δ: {asArray(t.consequence_deltas).length}</span>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Inspect full row
                  </summary>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Labeled title="Parsed intent"><JsonBlock value={t.parsed_intent} /></Labeled>
                    <Labeled title="Resolved action"><JsonBlock value={t.resolved_action} /></Labeled>
                    <Labeled title="Roll result"><JsonBlock value={t.roll_result} /></Labeled>
                    <Labeled title="NPC deltas"><JsonBlock value={t.npc_deltas} /></Labeled>
                    <Labeled title="Hook deltas"><JsonBlock value={t.hook_deltas} /></Labeled>
                    <Labeled title="Opportunity deltas"><JsonBlock value={t.opportunity_deltas} /></Labeled>
                    <Labeled title="Consequence deltas"><JsonBlock value={t.consequence_deltas} /></Labeled>
                  </div>
                </details>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: unknown;
  multiline?: boolean;
}) {
  const text = summarize(value);
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {multiline ? (
        <div className="text-sm whitespace-pre-wrap">{text}</div>
      ) : (
        <div className="text-sm truncate" title={text}>
          {text}
        </div>
      )}
    </div>
  );
}

function Labeled({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
