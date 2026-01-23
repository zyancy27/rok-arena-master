import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Swords, Search, User, Sparkles } from 'lucide-react';
import { POWER_TIERS } from '@/lib/game-constants';
import ChallengeModal from './ChallengeModal';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Character {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
  user_id: string;
  profile?: Profile;
}

interface UserCharacter {
  id: string;
  name: string;
  level: number;
}

export default function OpponentFinder() {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Character | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch other users' characters
    const { data: charsData } = await supabase
      .from('characters')
      .select('id, name, level, image_url, user_id')
      .neq('user_id', user?.id || '')
      .order('name');

    if (charsData && charsData.length > 0) {
      // Fetch profiles for these characters
      const userIds = [...new Set(charsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map<string, Profile>();
      profilesData?.forEach(p => profilesMap.set(p.id, p));

      const enrichedChars = charsData.map(c => ({
        ...c,
        profile: profilesMap.get(c.user_id),
      }));

      setCharacters(enrichedChars);
    }

    // Fetch current user's characters for the challenge modal
    if (user) {
      const { data: userCharsData } = await supabase
        .from('characters')
        .select('id, name, level')
        .eq('user_id', user.id);

      setUserCharacters(userCharsData || []);
    }

    setLoading(false);
  };

  const handleChallenge = (character: Character) => {
    setSelectedTarget(character);
    setChallengeModalOpen(true);
  };

  const getTierName = (level: number) => {
    const tier = POWER_TIERS.find(t => t.level === level);
    return tier?.name || `Tier ${level}`;
  };

  const filteredCharacters = characters.filter(char => {
    const searchLower = searchQuery.toLowerCase();
    return (
      char.name.toLowerCase().includes(searchLower) ||
      char.profile?.username.toLowerCase().includes(searchLower) ||
      char.profile?.display_name?.toLowerCase().includes(searchLower) ||
      getTierName(char.level).toLowerCase().includes(searchLower)
    );
  });

  // Group characters by user
  const charactersByUser = filteredCharacters.reduce((acc, char) => {
    const userId = char.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        profile: char.profile,
        characters: [],
      };
    }
    acc[userId].characters.push(char);
    return acc;
  }, {} as Record<string, { profile?: Profile; characters: Character[] }>);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-card-gradient border-border animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by player name, character name, or tier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {userCharacters.length === 0 ? (
        <Card className="bg-card-gradient border-border">
          <CardContent className="py-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create a Character First</h3>
            <p className="text-muted-foreground text-sm">
              You need at least one character to challenge others.
            </p>
          </CardContent>
        </Card>
      ) : Object.keys(charactersByUser).length === 0 ? (
        <Card className="bg-card-gradient border-border">
          <CardContent className="py-8 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Opponents Found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery ? 'Try a different search term.' : 'No other players have created characters yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(charactersByUser).map(([userId, { profile, characters: userChars }]) => (
            <Card key={userId} className="bg-card-gradient border-border">
              <CardContent className="p-4 space-y-4">
                {/* User Header */}
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {(profile?.display_name || profile?.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {profile?.display_name || profile?.username || 'Unknown Player'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {userChars.length} character{userChars.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Characters Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {userChars.map((char) => (
                    <div
                      key={char.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                    >
                      <Avatar className="w-12 h-12 rounded-lg">
                        <AvatarImage src={char.image_url || undefined} />
                        <AvatarFallback className="bg-accent text-accent-foreground rounded-lg">
                          {char.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{char.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {getTierName(char.level)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleChallenge(char)}
                        className="shrink-0"
                      >
                        <Swords className="w-4 h-4 mr-1" />
                        Fight
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Challenge Modal */}
      {selectedTarget && (
        <ChallengeModal
          open={challengeModalOpen}
          onOpenChange={setChallengeModalOpen}
          targetCharacter={{
            id: selectedTarget.id,
            name: selectedTarget.name,
            level: selectedTarget.level,
          }}
          userCharacters={userCharacters}
        />
      )}
    </div>
  );
}
