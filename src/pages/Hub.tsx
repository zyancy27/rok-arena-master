import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useFriends } from '@/hooks/use-friends';
import CharacterCard from '@/components/characters/CharacterCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Swords, Plus, Users, BookOpen, UserPlus } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
}

export default function Hub() {
  const { profile, user } = useAuth();
  const { friends, pendingRequests, loading: friendsLoading } = useFriends();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCharacters();
    }
  }, [user]);

  const fetchCharacters = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, level, race, home_planet')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6);

    if (!error && data) {
      setCharacters(data);
    }
    setCharactersLoading(false);
  };

  const userCharacters = characters;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-glow bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent">
          Welcome, {profile?.display_name || profile?.username || 'Warrior'}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          The arena awaits. Create characters, challenge opponents, and prove your worth in the Realm of Kings.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/characters/new">
          <Card className="bg-card-gradient border-border hover:glow-primary transition-all cursor-pointer h-full">
            <CardHeader className="text-center">
              <Plus className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle>Create Character</CardTitle>
              <CardDescription>Forge a new warrior for the arena</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/characters">
          <Card className="bg-card-gradient border-border hover:glow-accent transition-all cursor-pointer h-full">
            <CardHeader className="text-center">
              <Users className="w-12 h-12 mx-auto text-accent mb-2" />
              <CardTitle>Browse Characters</CardTitle>
              <CardDescription>Explore all characters in the realm</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/rules">
          <Card className="bg-card-gradient border-border hover:glow-gold transition-all cursor-pointer h-full">
            <CardHeader className="text-center">
              <BookOpen className="w-12 h-12 mx-auto text-cosmic-gold mb-2" />
              <CardTitle>R.O.K. Rules</CardTitle>
              <CardDescription>Learn the laws of combat</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* User's Characters */}
      <Card className="bg-card-gradient border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Your Characters
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/my-characters">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {charactersLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : userCharacters.length > 0 ? (
            <div className="space-y-2">
              {userCharacters.map((character) => (
                <Link
                  key={character.id}
                  to={`/characters/${character.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {character.level}
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">{character.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {character.race || 'Unknown Race'}{character.home_planet ? ` • ${character.home_planet}` : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Swords className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground mb-3">No characters yet</p>
              <Button size="sm" asChild>
                <Link to="/characters/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Character
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friends Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            Friends
            {pendingRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {pendingRequests.length} pending
              </span>
            )}
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/friends">
              <UserPlus className="w-4 h-4 mr-2" />
              Manage Friends
            </Link>
          </Button>
        </div>

        {friendsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-muted" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : friends.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {friends.slice(0, 12).map((friend) => (
              <Link
                key={friend.id}
                to={`/profile/${friend.profile.username}`}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card-gradient border border-border hover:glow-accent transition-all"
              >
                <Avatar className="w-16 h-16 border-2 border-accent">
                  <AvatarImage src={friend.profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent/20 text-accent text-lg">
                    {(friend.profile.display_name || friend.profile.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-center truncate w-full">
                  {friend.profile.display_name || friend.profile.username}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-card-gradient border-border">
            <CardContent className="py-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-2">No Friends Yet</h3>
              <p className="text-muted-foreground mb-4">
                Connect with other warriors in the realm.
              </p>
              <Button asChild>
                <Link to="/friends">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Find Friends
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
