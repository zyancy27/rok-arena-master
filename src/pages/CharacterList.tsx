import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, User, Edit, Globe, Sparkles } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  image_url: string | null;
  updated_at: string;
}

export default function CharacterList() {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchCharacters();
    }
  }, [user]);

  const fetchCharacters = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, level, race, home_planet, image_url, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch characters:', error);
    } else {
      setCharacters(data || []);
    }
    setLoading(false);
  };

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (char.race?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (char.home_planet?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Characters</h1>
          <p className="text-muted-foreground text-sm">
            {characters.length} character{characters.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <Button asChild>
          <Link to="/characters/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Character
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, race, or planet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Character Grid */}
      {filteredCharacters.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {characters.length === 0 ? (
              <>
                <User className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Characters Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first character to start building your universe.
                </p>
                <Button asChild>
                  <Link to="/characters/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Character
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search query.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCharacters.map((character) => (
            <Card
              key={character.id}
              className="group bg-card/50 hover:bg-card/80 transition-all border-border hover:border-primary/50 overflow-hidden"
            >
              <CardContent className="p-0">
                {/* Image or placeholder */}
                <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
                  {character.image_url ? (
                    <img
                      src={character.image_url}
                      alt={character.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Lv. {character.level}
                  </Badge>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg truncate mb-1">
                    {character.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    {character.race && (
                      <span className="truncate">{character.race}</span>
                    )}
                    {character.race && character.home_planet && (
                      <span>•</span>
                    )}
                    {character.home_planet && (
                      <span className="flex items-center gap-1 truncate">
                        <Globe className="w-3 h-3" />
                        {character.home_planet}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/characters/${character.id}`}>
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="default" size="sm" className="flex-1">
                      <Link to={`/characters/${character.id}/edit`}>
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
