import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CharacterCard from '@/components/characters/CharacterCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords, Plus, Users, BookOpen } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
}

export default function Hub() {
  const { profile, user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            Your Characters
          </h2>
          <Button variant="outline" asChild>
            <Link to="/characters/new">
              <Plus className="w-4 h-4 mr-2" />
              New Character
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-card-gradient border-border animate-pulse">
                <CardContent className="h-40" />
              </Card>
            ))}
          </div>
        ) : userCharacters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                id={character.id}
                name={character.name}
                level={character.level}
                race={character.race}
                home_planet={character.home_planet}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-card-gradient border-border">
            <CardContent className="py-12 text-center">
              <Swords className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Characters Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first character to begin your journey in the arena.
              </p>
              <Button asChild>
                <Link to="/characters/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Character
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
