import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Swords, Plus, Clock, CheckCircle, Users } from 'lucide-react';
import OpponentFinder from '@/components/battles/OpponentFinder';
import BattleSimulation from '@/components/battles/BattleSimulation';

interface Character {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
  powers: string | null;
  abilities: string | null;
  personality?: string | null;
  mentality?: string | null;
  stat_speed?: number | null;
  stat_strength?: number | null;
  stat_skill?: number | null;
}

interface BattleParticipant {
  character_id: string;
  turn_order: number;
  character: {
    name: string;
    image_url: string | null;
    user_id: string;
  };
}

interface Battle {
  id: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  winner_id: string | null;
  loser_id: string | null;
  challenged_user_id: string | null;
  participants: BattleParticipant[];
}

export default function Battles() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBattles();
      fetchCharacters();
      setupRealtime();
    }

    return () => {
      supabase.removeChannel(supabase.channel('my-battles'));
    };
  }, [user]);

  const setupRealtime = () => {
    supabase
      .channel('my-battles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_participants',
        },
        () => {
          // Refetch battles when participants change
          fetchBattles();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battles',
        },
        () => {
          // Refetch battles when status changes or battles are deleted
          fetchBattles();
        }
      )
      .subscribe();
  };

  const fetchCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, level, image_url, powers, abilities, personality, mentality, stat_speed, stat_strength, stat_skill')
      .eq('user_id', user?.id);

    if (data) {
      setCharacters(data as Character[]);
    }
  };

  const fetchBattles = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Get user's character IDs first
    const { data: userChars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id);

    const charIds = userChars?.map(c => c.id) || [];

    // Get battles where:
    // 1. User's characters are participants, OR
    // 2. User is the challenged_user_id (pending challenges for them)
    const { data: participations } = await supabase
      .from('battle_participants')
      .select('battle_id')
      .in('character_id', charIds);

    const participatedBattleIds = participations?.map(p => p.battle_id) || [];

    // Also get battles where user is challenged
    const { data: challengedBattles } = await supabase
      .from('battles')
      .select('id')
      .eq('challenged_user_id', user.id)
      .eq('status', 'pending');

    const challengedBattleIds = challengedBattles?.map(b => b.id) || [];

    // Combine and dedupe
    const allBattleIds = [...new Set([...participatedBattleIds, ...challengedBattleIds])];

    if (allBattleIds.length === 0) {
      setBattles([]);
      setLoading(false);
      return;
    }

    // Get battle details with participants
    const { data: battlesData } = await supabase
      .from('battles')
      .select('*')
      .in('id', allBattleIds)
      .order('created_at', { ascending: false });

    if (!battlesData) {
      setBattles([]);
      setLoading(false);
      return;
    }

    // Get participants for all battles
    const { data: allParticipants } = await supabase
      .from('battle_participants')
      .select(`
        battle_id,
        character_id,
        turn_order,
        character:characters(name, image_url, user_id)
      `)
      .in('battle_id', allBattleIds);

    // Combine data
    const battlesWithParticipants: Battle[] = battlesData.map(battle => {
      const battleParticipants = allParticipants
        ?.filter(p => p.battle_id === battle.id)
        .map(p => ({
          character_id: p.character_id,
          turn_order: p.turn_order,
          character: Array.isArray(p.character) ? p.character[0] : p.character
        })) || [];

      return {
        ...battle,
        participants: battleParticipants
      };
    });

    setBattles(battlesWithParticipants);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'active':
        return <Swords className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'completed':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return '';
    }
  };

  const activeBattles = battles.filter(b => b.status === 'active');
  const pendingBattles = battles.filter(b => b.status === 'pending');
  const completedBattles = battles.filter(b => b.status === 'completed');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Swords className="w-8 h-8 text-primary" />
            Battle Arena
          </h1>
          <p className="text-muted-foreground mt-1">
            Challenge opponents and manage your battles
          </p>
        </div>
        <div className="flex gap-2">
          <BattleSimulation characters={characters} />
          <Button asChild>
            <Link to="/characters/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Character
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs for Find Opponents vs My Battles */}
      <Tabs defaultValue="find" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="find" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Find Opponents
          </TabsTrigger>
          <TabsTrigger value="battles" className="flex items-center gap-2">
            <Swords className="w-4 h-4" />
            My Battles
            {battles.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {battles.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="space-y-6">
          <OpponentFinder />
        </TabsContent>

        <TabsContent value="battles" className="space-y-6">
          {loading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-card-gradient border-border animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : battles.length === 0 ? (
            <Card className="bg-card-gradient border-border">
              <CardContent className="py-12 text-center">
                <Swords className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Battles Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Challenge another character to begin your first battle!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Active Battles */}
              {activeBattles.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Swords className="w-5 h-5 text-green-400" />
                    Active Battles ({activeBattles.length})
                  </h2>
                  <div className="grid gap-3">
                    {activeBattles.map((battle) => {
                      const p1 = battle.participants.find(p => p.turn_order === 1);
                      const p2 = battle.participants.find(p => p.turn_order === 2);
                      return (
                        <Link key={battle.id} to={`/battles/${battle.id}`}>
                          <Card className="bg-card-gradient border-border hover:glow-accent transition-all cursor-pointer">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                                  {getStatusIcon(battle.status)}
                                  {battle.status}
                                </Badge>
                                <span className="font-medium">
                                  {p1?.character?.name || 'Unknown'} vs {p2?.character?.name || 'Unknown'}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  Started {new Date(battle.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <Button variant="outline" size="sm">
                                Continue Battle
                              </Button>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pending Battles */}
              {pendingBattles.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    Pending Challenges ({pendingBattles.length})
                  </h2>
                  <div className="grid gap-3">
                    {pendingBattles.map((battle) => {
                      const challenger = battle.participants.find(p => p.turn_order === 1);
                      const isUserChallenged = battle.challenged_user_id === user?.id;
                      const iAmChallenger = challenger?.character?.user_id === user?.id;
                      
                      return (
                        <Link key={battle.id} to={`/battles/${battle.id}`}>
                          <Card className="bg-card-gradient border-border hover:glow-primary transition-all cursor-pointer">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                                  {getStatusIcon(battle.status)}
                                  {battle.status}
                                </Badge>
                                <span className="font-medium">
                                  {isUserChallenged ? (
                                    <>⚔️ <span className="text-primary">An opponent</span> challenged you!</>
                                  ) : iAmChallenger ? (
                                    <>Waiting for opponent to accept...</>
                                  ) : (
                                    <>{challenger?.character?.name || 'Unknown'} vs ???</>
                                  )}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  {new Date(battle.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <Button variant="outline" size="sm">
                                {isUserChallenged ? 'Respond' : 'View'}
                              </Button>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Battles */}
              {completedBattles.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-muted-foreground" />
                    Completed Battles ({completedBattles.length})
                  </h2>
                  <div className="grid gap-3">
                    {completedBattles.map((battle) => {
                      const p1 = battle.participants.find(p => p.turn_order === 1);
                      const p2 = battle.participants.find(p => p.turn_order === 2);
                      return (
                        <Link key={battle.id} to={`/battles/${battle.id}`}>
                          <Card className="bg-card-gradient border-border hover:border-border/80 transition-all cursor-pointer opacity-75">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                                  {getStatusIcon(battle.status)}
                                  {battle.status}
                                </Badge>
                                <span className="font-medium">
                                  {p1?.character?.name || 'Unknown'} vs {p2?.character?.name || 'Unknown'}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  Ended {new Date(battle.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <Button variant="ghost" size="sm">
                                View Transcript
                              </Button>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
