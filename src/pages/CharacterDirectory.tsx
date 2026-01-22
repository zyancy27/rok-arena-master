import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CharacterCard from '@/components/characters/CharacterCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { POWER_TIERS } from '@/lib/game-constants';
import { Search, Plus, Users, Filter } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  user_id: string;
  username?: string;
}

export default function CharacterDirectory() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [raceFilter, setRaceFilter] = useState<string>('all');

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    // Fetch characters
    const { data: charData, error: charError } = await supabase
      .from('characters')
      .select('id, name, level, race, home_planet, user_id')
      .order('created_at', { ascending: false });

    if (charError || !charData) {
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(charData.map(c => c.user_id))];

    // Fetch all profiles for these users
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    // Create a map of user_id to username
    const profileMap = new Map(profilesData?.map(p => [p.id, p.username]) || []);

    // Merge the data
    const charactersWithProfiles = charData.map(char => ({
      ...char,
      username: profileMap.get(char.user_id),
    }));

    setCharacters(charactersWithProfiles);
    setLoading(false);
  };

  // Get unique races for filter
  const uniqueRaces = [...new Set(characters.map(c => c.race).filter(Boolean))];

  // Filter characters
  const filteredCharacters = characters.filter(character => {
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      character.race?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      character.home_planet?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = levelFilter === 'all' || character.level === parseInt(levelFilter);
    const matchesRace = raceFilter === 'all' || character.race === raceFilter;

    return matchesSearch && matchesLevel && matchesRace;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Character Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse all characters in the Realm
          </p>
        </div>
        <Button asChild>
          <Link to="/characters/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Character
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card-gradient border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, race, or planet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {POWER_TIERS.map((tier) => (
                    <SelectItem key={tier.level} value={tier.level.toString()}>
                      Tier {tier.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={raceFilter} onValueChange={setRaceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Race" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Races</SelectItem>
                  {uniqueRaces.map((race) => (
                    <SelectItem key={race} value={race!}>
                      {race}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-card-gradient border-border animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : filteredCharacters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              id={character.id}
              name={character.name}
              level={character.level}
              race={character.race}
              home_planet={character.home_planet}
              username={character.username}
              showOwner
            />
          ))}
        </div>
      ) : (
        <Card className="bg-card-gradient border-border">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Characters Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || levelFilter !== 'all' || raceFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Be the first to create a character!'}
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
  );
}
