import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { Bug, Zap, Wind, BarChart3, Brain, Trophy, CloudLightning, Database, Eye, RefreshCw, Activity, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface BattleStateRow {
  id: string;
  status: string;
  created_at: string;
  chosen_location: string | null;
  dynamic_environment: boolean;
  environment_effects: string | null;
  concentration_uses: unknown;
  winner_id: string | null;
  loser_id: string | null;
}

export function DeveloperTab() {
  const [debugMode, setDebugMode] = useState(false);
  const [battleViewerOpen, setBattleViewerOpen] = useState(false);
  const [battles, setBattles] = useState<BattleStateRow[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<any>(null);
  const [loadingBattles, setLoadingBattles] = useState(false);
  const [pveSession, setPveSession] = useState<any>(null);

  const fetchBattles = async () => {
    setLoadingBattles(true);
    const { data, error } = await supabase
      .from('battles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) setBattles(data as BattleStateRow[]);
    else toast.error('Failed to load battles');
    setLoadingBattles(false);
  };

  const fetchBattleDetails = async (battleId: string) => {
    const [
      { data: battle },
      { data: participants },
      { data: messages },
    ] = await Promise.all([
      supabase.from('battles').select('*').eq('id', battleId).single(),
      supabase.from('battle_participants').select('*, characters(name, level)').eq('battle_id', battleId),
      supabase.from('battle_messages').select('*').eq('battle_id', battleId).order('created_at', { ascending: true }).limit(50),
    ]);
    setSelectedBattle({ battle, participants, messages, messageCount: messages?.length ?? 0 });
  };

  const loadPveSession = () => {
    try {
      const raw = localStorage.getItem('pveBattleSession');
      setPveSession(raw ? JSON.parse(raw) : null);
      if (!raw) toast.info('No active PvE session found');
    } catch {
      setPveSession(null);
      toast.error('Failed to parse PvE session');
    }
  };

  const openBattleViewer = () => {
    setBattleViewerOpen(true);
    fetchBattles();
    loadPveSession();
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'default';
    if (s === 'completed') return 'secondary';
    return 'outline';
  };

  return (
    <>
      <SettingsSection title="Developer / Admin Tools" description="Debug and testing controls — admin only">
        <SettingsToggle label="Enable Debug Mode" description="Show debug overlays and state info" checked={debugMode} onCheckedChange={setDebugMode} />

        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={openBattleViewer}>
            <Database className="w-4 h-4 mr-2" /> Battle State Viewer
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Glitch trigger simulated')}>
            <Zap className="w-4 h-4 mr-2" /> Force Glitch Trigger
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Momentum spike simulated')}>
            <BarChart3 className="w-4 h-4 mr-2" /> Simulate Momentum Spike
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('AI profile override coming soon')}>
            <Brain className="w-4 h-4 mr-2" /> Override AI Profile
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Environmental collapse simulated')}>
            <CloudLightning className="w-4 h-4 mr-2" /> Simulate Environmental Collapse
          </Button>
        </div>
      </SettingsSection>

      <Dialog open={battleViewerOpen} onOpenChange={setBattleViewerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5" /> Battle State Viewer
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[65vh] pr-2">
            {/* PvE Session */}
            {pveSession && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Active PvE Session
                </h3>
                <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border">
                  {JSON.stringify(pveSession, null, 2)}
                </pre>
              </div>
            )}

            {/* PvP Battles */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Recent PvP Battles
              </h3>
              <Button variant="ghost" size="sm" onClick={fetchBattles} disabled={loadingBattles}>
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBattles ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {battles.length === 0 && !loadingBattles && (
              <p className="text-xs text-muted-foreground">No battles found.</p>
            )}

            <div className="space-y-2">
              {battles.map(b => (
                <button
                  key={b.id}
                  onClick={() => fetchBattleDetails(b.id)}
                  className="w-full text-left bg-muted/30 hover:bg-muted/60 rounded-lg p-3 border transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono truncate max-w-[200px]">{b.id}</span>
                    <Badge variant={statusColor(b.status)}>{b.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {b.chosen_location ?? 'No location'} · {new Date(b.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected battle detail */}
            {selectedBattle && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Battle Detail
                </h3>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Battle State</p>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border">
                    {JSON.stringify(selectedBattle.battle, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Participants ({selectedBattle.participants?.length ?? 0})
                  </p>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border">
                    {JSON.stringify(selectedBattle.participants, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Messages ({selectedBattle.messageCount})
                  </p>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedBattle.messages, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
