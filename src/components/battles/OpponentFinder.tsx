import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Swords, Search, User, Sparkles, Bot, Users, Dna } from 'lucide-react';
import ChallengeModal from './ChallengeModal';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface UserSummary {
  userId: string;
  profile: Profile;
  characterCount: number;
  speciesCount: number;
}

interface UserCharacter {
  id: string;
  name: string;
  level: number;
}

export default function OpponentFinder() {
  const { user } = useAuth();
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch other users' characters (only need user_id and race for counting)
    const { data: charsData } = await supabase
      .from('characters')
      .select('user_id, race')
      .neq('user_id', user?.id || '');

    if (charsData && charsData.length > 0) {
      // Group by user and count characters + unique species
      const userDataMap = new Map<string, { characterCount: number; species: Set<string> }>();
      
      charsData.forEach(c => {
        if (!userDataMap.has(c.user_id)) {
          userDataMap.set(c.user_id, { characterCount: 0, species: new Set() });
        }
        const userData = userDataMap.get(c.user_id)!;
        userData.characterCount++;
        if (c.race) {
          userData.species.add(c.race);
        }
      });

      // Fetch profiles for these users
      const userIds = [...userDataMap.keys()];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      const summaries: UserSummary[] = [];
      profilesData?.forEach(profile => {
        const userData = userDataMap.get(profile.id);
        if (userData) {
          summaries.push({
            userId: profile.id,
            profile,
            characterCount: userData.characterCount,
            speciesCount: userData.species.size,
          });
        }
      });

      // Sort by username
      summaries.sort((a, b) => 
        (a.profile.display_name || a.profile.username).localeCompare(
          b.profile.display_name || b.profile.username
        )
      );

      setUserSummaries(summaries);
    } else {
      setUserSummaries([]);
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

  const handleChallengeUser = (userId: string) => {
    setSelectedUserId(userId);
    setChallengeModalOpen(true);
  };

  const filteredSummaries = userSummaries.filter(summary => {
    const searchLower = searchQuery.toLowerCase();
    return (
      summary.profile.username.toLowerCase().includes(searchLower) ||
      summary.profile.display_name?.toLowerCase().includes(searchLower)
    );
  });

  const selectedUserProfile = selectedUserId 
    ? userSummaries.find(s => s.userId === selectedUserId)?.profile 
    : null;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-card-gradient border-border animate-pulse">
            <CardContent className="h-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link to="/battles/practice">
            <Bot className="w-4 h-4 mr-2" />
            Practice vs AI
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by player name..."
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
      ) : filteredSummaries.length === 0 ? (
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
        <div className="space-y-3">
          {filteredSummaries.map((summary) => (
            <Card key={summary.userId} className="bg-card-gradient border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={summary.profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {(summary.profile.display_name || summary.profile.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {summary.profile.display_name || summary.profile.username || 'Unknown Player'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="w-3 h-3" />
                          {summary.characterCount} character{summary.characterCount !== 1 ? 's' : ''}
                        </Badge>
                        {summary.speciesCount > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Dna className="w-3 h-3" />
                            {summary.speciesCount} species
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleChallengeUser(summary.userId)}
                    className="shrink-0"
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Challenge
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Challenge Modal */}
      {selectedUserId && selectedUserProfile && (
        <ChallengeModal
          open={challengeModalOpen}
          onOpenChange={setChallengeModalOpen}
          targetUserId={selectedUserId}
          targetUsername={selectedUserProfile.display_name || selectedUserProfile.username}
          userCharacters={userCharacters}
        />
      )}
    </div>
  );
}
