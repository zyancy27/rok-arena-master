import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { Bug, Zap, Wind, BarChart3, Brain, Trophy, CloudLightning, Database, Eye, RefreshCw, Activity, Swords, Users, Circle, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

interface OnlineUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  presence_ref?: string;
}

interface UserStats {
  totalUsers: number;
  activeBattles: number;
  pendingBattles: number;
  completedBattles: number;
  totalCharacters: number;
}

export function DeveloperTab() {
  const [debugMode, setDebugMode] = useState(false);
  const [battleViewerOpen, setBattleViewerOpen] = useState(false);
  const [sessionInspectorOpen, setSessionInspectorOpen] = useState(false);
  const [battles, setBattles] = useState<BattleStateRow[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<any>(null);
  const [loadingBattles, setLoadingBattles] = useState(false);
  const [pveSession, setPveSession] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string>>({});
  const [userBattleCounts, setUserBattleCounts] = useState<Record<string, number>>({});
  const [userCharCounts, setUserCharCounts] = useState<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

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

  const fetchSessionData = useCallback(async () => {
    setLoadingUsers(true);
    const [
      { data: profiles },
      { data: roles },
      { data: battlesData },
      { data: characters },
    ] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_url').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('battles').select('id, status'),
      supabase.from('characters').select('id, user_id'),
    ]);

    if (profiles) setAllUsers(profiles);

    // Build roles map
    const rMap: Record<string, string> = {};
    roles?.forEach(r => {
      if (!rMap[r.user_id] || r.role === 'admin') rMap[r.user_id] = r.role;
      else if (r.role === 'moderator' && rMap[r.user_id] !== 'admin') rMap[r.user_id] = r.role;
    });
    setUserRolesMap(rMap);

    // Battle stats
    const active = battlesData?.filter(b => b.status === 'active').length ?? 0;
    const pending = battlesData?.filter(b => b.status === 'pending').length ?? 0;
    const completed = battlesData?.filter(b => b.status === 'completed').length ?? 0;
    setUserStats({
      totalUsers: profiles?.length ?? 0,
      activeBattles: active,
      pendingBattles: pending,
      completedBattles: completed,
      totalCharacters: characters?.length ?? 0,
    });

    // Char counts per user
    const cCounts: Record<string, number> = {};
    characters?.forEach(c => { cCounts[c.user_id] = (cCounts[c.user_id] || 0) + 1; });
    setUserCharCounts(cCounts);

    setLoadingUsers(false);
  }, []);

  const openSessionInspector = () => {
    setSessionInspectorOpen(true);
    fetchSessionData();

    // Set up presence channel to track who's online
    const channel = supabase.channel('admin-presence', {
      config: { presence: { key: 'admin-tracker' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach(p => { if (p.user_id) ids.add(p.user_id); });
        });
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        }
      });

    channelRef.current = channel;
  };

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const statusColor = (s: string) => {
    if (s === 'active') return 'default';
    if (s === 'completed') return 'secondary';
    return 'outline';
  };

  const roleBadgeVariant = (role: string) => {
    if (role === 'admin') return 'destructive' as const;
    if (role === 'moderator') return 'default' as const;
    return 'secondary' as const;
  };

  return (
    <>
      <SettingsSection title="Developer / Admin Tools" description="Debug and testing controls — admin only">
        <SettingsToggle label="Enable Debug Mode" description="Show debug overlays and state info" checked={debugMode} onCheckedChange={setDebugMode} />

        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={openBattleViewer}>
            <Database className="w-4 h-4 mr-2" /> Battle State Viewer
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={openSessionInspector}>
            <Users className="w-4 h-4 mr-2" /> User Session Inspector
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Glitch trigger simulated')}>
            <Zap className="w-4 h-4 mr-2" /> Force Glitch Trigger
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Momentum spike simulated')}>
            <BarChart3 className="w-4 h-4 mr-2" /> Simulate Momentum Spike
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Opponent profile override coming soon')}>
            <Brain className="w-4 h-4 mr-2" /> Override Opponent Profile
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Environmental collapse simulated')}>
            <CloudLightning className="w-4 h-4 mr-2" /> Simulate Environmental Collapse
          </Button>
        </div>
      </SettingsSection>

      {/* Battle State Viewer Dialog */}
      <Dialog open={battleViewerOpen} onOpenChange={setBattleViewerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5" /> Battle State Viewer
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[65vh] pr-2">
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

      {/* User Session Inspector Dialog */}
      <Dialog open={sessionInspectorOpen} onOpenChange={(open) => {
        setSessionInspectorOpen(open);
        if (!open && channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" /> User Session Inspector
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[65vh] pr-2">
            {/* Platform Stats */}
            {userStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Total Users', value: userStats.totalUsers, icon: Users },
                  { label: 'Active Battles', value: userStats.activeBattles, icon: Swords },
                  { label: 'Pending Battles', value: userStats.pendingBattles, icon: Activity },
                  { label: 'Completed', value: userStats.completedBattles, icon: Trophy },
                  { label: 'Characters', value: userStats.totalCharacters, icon: Eye },
                  { label: 'Online Now', value: onlineUserIds.size, icon: Circle },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-center gap-1.5 mb-1">
                      <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <span className="text-lg font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* User List */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> All Users
              </h3>
              <Button variant="ghost" size="sm" onClick={fetchSessionData} disabled={loadingUsers}>
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="space-y-1.5">
              {allUsers.map(user => {
                const isOnline = onlineUserIds.has(user.id);
                const role = userRolesMap[user.id] ?? 'user';
                const charCount = userCharCounts[user.id] ?? 0;

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 bg-muted/30 hover:bg-muted/50 rounded-lg p-2.5 border transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(user.display_name ?? user.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                          isOnline ? 'text-green-500 fill-green-500' : 'text-muted-foreground/40 fill-muted-foreground/40'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {user.display_name ?? user.username}
                        </span>
                        <Badge variant={roleBadgeVariant(role)} className="text-[10px] px-1.5 py-0">
                          {role}
                        </Badge>
                        {isOnline && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-500 border-green-500/30">
                            online
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono truncate max-w-[140px]">{user.id.slice(0, 8)}…</span>
                        <span>·</span>
                        <span>{charCount} chars</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}