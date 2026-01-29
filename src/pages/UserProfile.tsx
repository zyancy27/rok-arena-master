import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/use-friends';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CharacterCard from '@/components/characters/CharacterCard';
import { toast } from 'sonner';
import { User, Users, BookOpen, Shield, Lock, UserPlus, UserCheck, Eye, Clock, Loader2, Heart } from 'lucide-react';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const {
    isFriend,
    isFollowing,
    hasSentRequest,
    sendFriendRequest,
    followUser,
    removeFriend,
    unfollowUser,
    cancelSentRequest,
    friends,
    following,
  } = useFriends();

  // Fetch the profile by username
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

  // Fetch user's public characters (only if profile is not private)
  const { data: characters, isLoading: charactersLoading } = useQuery({
    queryKey: ['user-characters', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', profile!.id)
        .order('updated_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !profile?.is_private,
  });

  // Fetch user's public races
  const { data: races, isLoading: racesLoading } = useQuery({
    queryKey: ['user-races', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('races')
        .select('*')
        .eq('user_id', profile!.id)
        .order('updated_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !profile?.is_private,
  });

  // Fetch user's published stories
  const { data: stories, isLoading: storiesLoading } = useQuery({
    queryKey: ['user-stories', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !profile?.is_private,
  });

  // Fetch user's friends (only if they haven't hidden their friends list)
  const { data: userFriends, isLoading: friendsLoading } = useQuery({
    queryKey: ['user-friends', profile?.id],
    queryFn: async () => {
      // First check if the user has hidden their friends list
      if ((profile as any)?.hide_friends_list && !isOwnProfile) {
        return [];
      }

      // Get accepted friendships
      const { data: friendshipData, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${profile!.id},addressee_id.eq.${profile!.id}`)
        .eq('status', 'accepted')
        .eq('is_follow', false);

      if (error) throw error;
      if (!friendshipData || friendshipData.length === 0) return [];

      // Get the other user IDs
      const otherUserIds = friendshipData.map(f => 
        f.requester_id === profile!.id ? f.addressee_id : f.requester_id
      );

      // Fetch their profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherUserIds)
        .limit(8);

      return profiles || [];
    },
    enabled: !!profile?.id && !profile?.is_private,
  });

  const isOwnProfile = user?.id === profile?.id;
  const showFriendsList = !(profile as any)?.hide_friends_list || isOwnProfile;

  // Action handlers for friend/follow
  const handleSendFriendRequest = async () => {
    if (!profile) return;
    setActionLoading('friend');
    const { error } = await sendFriendRequest(profile.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Friend request sent!');
    }
    setActionLoading(null);
  };

  const handleCancelRequest = async () => {
    if (!profile) return;
    setActionLoading('cancel');
    const { error } = await cancelSentRequest(profile.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Request cancelled');
    }
    setActionLoading(null);
  };

  const handleRemoveFriend = async () => {
    if (!profile) return;
    const friendship = friends.find(f => f.profile.id === profile.id);
    if (!friendship) return;
    setActionLoading('unfriend');
    const { error } = await removeFriend(friendship.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Friend removed');
    }
    setActionLoading(null);
  };

  const handleFollow = async () => {
    if (!profile) return;
    setActionLoading('follow');
    const { error } = await followUser(profile.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Now following!');
    }
    setActionLoading(null);
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    const followRelation = following.find(f => f.profile.id === profile.id);
    if (!followRelation) return;
    setActionLoading('unfollow');
    const { error } = await unfollowUser(followRelation.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Unfollowed');
    }
    setActionLoading(null);
  };

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-card-gradient border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-card-gradient border-border">
          <CardContent className="pt-6 text-center py-12">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The user "{username}" doesn't exist or their profile is private.
            </p>
            <Button asChild>
              <Link to="/characters">Browse Characters</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.is_private && !isOwnProfile) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-card-gradient border-border">
          <CardContent className="pt-6 text-center py-12">
            <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Private Profile</h2>
            <p className="text-muted-foreground mb-4">
              This user has set their profile to private.
            </p>
            <Button asChild>
              <Link to="/characters">Browse Characters</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="bg-card-gradient border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary/30">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              {profile.bio && (
                <p className="mt-3 text-foreground/80">{profile.bio}</p>
              )}
            </div>
            {isOwnProfile ? (
              <Button variant="outline" asChild>
                <Link to="/profile">Edit Profile</Link>
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Friend Request Button */}
                {isFriend(profile.id) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFriend}
                    disabled={actionLoading === 'unfriend'}
                    className="text-destructive hover:text-destructive"
                  >
                    {actionLoading === 'unfriend' ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-1" />
                    )}
                    Unfriend
                  </Button>
                ) : hasSentRequest(profile.id) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelRequest}
                    disabled={actionLoading === 'cancel'}
                  >
                    {actionLoading === 'cancel' ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Clock className="w-4 h-4 mr-1" />
                    )}
                    Request Sent
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSendFriendRequest}
                    disabled={actionLoading === 'friend'}
                  >
                    {actionLoading === 'friend' ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-1" />
                    )}
                    Add Friend
                  </Button>
                )}

                {/* Follow Button */}
                {isFollowing(profile.id) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnfollow}
                    disabled={actionLoading === 'unfollow'}
                  >
                    {actionLoading === 'unfollow' ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Eye className="w-4 h-4 mr-1" />
                    )}
                    Following
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFollow}
                    disabled={actionLoading === 'follow'}
                  >
                    {actionLoading === 'follow' ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Eye className="w-4 h-4 mr-1" />
                    )}
                    Follow
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Characters Section */}
      <Card className="bg-card-gradient border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Characters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {charactersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : characters && characters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  id={character.id}
                  name={character.name}
                  level={character.level}
                  race={character.race}
                  home_planet={character.home_planet}
                  image_url={character.image_url}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              No public characters yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Friends Section */}
      {showFriendsList && (
        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-cosmic-pink" />
              Friends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {friendsLoading ? (
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-16 rounded-full" />
                ))}
              </div>
            ) : userFriends && userFriends.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {userFriends.map((friend) => (
                  <Link
                    key={friend.id}
                    to={`/profile/${friend.username}`}
                    className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12 border-2 border-primary/30">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {friend.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {friend.display_name || friend.username}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {(profile as any)?.hide_friends_list && !isOwnProfile 
                  ? "Friends list is private" 
                  : "No friends yet"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Races Section */}
      {races && races.length > 0 && (
        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Custom Races
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {races.map((race) => (
                <Card key={race.id} className="bg-muted/30 border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {race.image_url && (
                        <img
                          src={race.image_url}
                          alt={race.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h4 className="font-semibold">{race.name}</h4>
                        {race.home_planet && (
                          <p className="text-xs text-muted-foreground">
                            From {race.home_planet}
                          </p>
                        )}
                        {race.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {race.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stories Section */}
      {stories && stories.length > 0 && (
        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cosmic-gold" />
              Published Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stories.map((story) => (
                <Card key={story.id} className="bg-muted/30 border-border/50">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold">{story.title}</h4>
                    {story.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {story.summary}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
