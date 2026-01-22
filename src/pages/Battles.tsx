import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Battle {
  id: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  winner_id: string | null;
  loser_id: string | null;
}

export default function Battles() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBattles();
    }
  }, [user]);

  const fetchBattles = async () => {
    // Get user's character IDs first
    const { data: userChars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user?.id);

    if (!userChars || userChars.length === 0) {
      setLoading(false);
      return;
    }

    const charIds = userChars.map(c => c.id);

    // Get battles where user's characters are participants
    const { data: participations } = await supabase
      .from('battle_participants')
      .select('battle_id')
      .in('character_id', charIds);

    if (!participations || participations.length === 0) {
      setLoading(false);
      return;
    }

    const battleIds = [...new Set(participations.map(p => p.battle_id))];

    // Get battle details
    const { data: battlesData } = await supabase
      .from('battles')
      .select('*')
      .in('id', battleIds)
      .order('created_at', { ascending: false });

    if (battlesData) {
      setBattles(battlesData as Battle[]);
    }
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
            Your active and past battles
          </p>
        </div>
        <Button asChild>
          <Link to="/characters">
            <Plus className="w-4 h-4 mr-2" />
            Challenge Someone
          </Link>
        </Button>
      </div>

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
            <Button asChild>
              <Link to="/characters">
                <Swords className="w-4 h-4 mr-2" />
                Browse Characters
              </Link>
            </Button>
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
                {activeBattles.map((battle) => (
                  <Link key={battle.id} to={`/battles/${battle.id}`}>
                    <Card className="bg-card-gradient border-border hover:glow-accent transition-all cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                            {getStatusIcon(battle.status)}
                            {battle.status}
                          </Badge>
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
                ))}
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
                {pendingBattles.map((battle) => (
                  <Link key={battle.id} to={`/battles/${battle.id}`}>
                    <Card className="bg-card-gradient border-border hover:glow-primary transition-all cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                            {getStatusIcon(battle.status)}
                            {battle.status}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            Created {new Date(battle.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
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
                {completedBattles.map((battle) => (
                  <Link key={battle.id} to={`/battles/${battle.id}`}>
                    <Card className="bg-card-gradient border-border hover:border-border/80 transition-all cursor-pointer opacity-75">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                            {getStatusIcon(battle.status)}
                            {battle.status}
                          </Badge>
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
