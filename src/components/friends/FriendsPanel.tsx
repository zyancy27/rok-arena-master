import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends, FriendshipWithProfile } from '@/hooks/use-friends';
import { 
  Users, UserPlus, UserCheck, UserX, Search, 
  Heart, Eye, Loader2, Mail, Check, X 
} from 'lucide-react';

interface SearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function FriendsPanel() {
  const { user } = useAuth();
  const {
    friends,
    pendingRequests,
    followers,
    following,
    loading,
    sendFriendRequest,
    followUser,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    unfollowUser,
    isFriend,
    isFollowing,
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await sendFriendRequest(userId);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Friend request sent!');
    }
    setActionLoading(null);
  };

  const handleFollow = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await followUser(userId);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Now following!');
    }
    setActionLoading(null);
  };

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await acceptFriendRequest(friendshipId);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Friend request accepted!');
    }
    setActionLoading(null);
  };

  const handleReject = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await rejectFriendRequest(friendshipId);
    if (error) {
      toast.error(error);
    }
    setActionLoading(null);
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await removeFriend(friendshipId);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Friend removed');
    }
    setActionLoading(null);
  };

  const handleUnfollow = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await unfollowUser(friendshipId);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Unfollowed');
    }
    setActionLoading(null);
  };

  const UserCard = ({ 
    profile, 
    actions 
  }: { 
    profile: SearchResult; 
    actions: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {profile.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.display_name || profile.username}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {actions}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Friends & Connections
        </CardTitle>
        <CardDescription>
          Connect with other players and view their solar systems
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg border bg-background/50">
            <h4 className="text-sm font-semibold text-muted-foreground">Search Results</h4>
            {searchResults.map((result) => (
              <UserCard
                key={result.id}
                profile={result}
                actions={
                  <>
                    {!isFriend(result.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendFriendRequest(result.id)}
                        disabled={actionLoading === result.id}
                      >
                        {actionLoading === result.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add Friend
                          </>
                        )}
                      </Button>
                    )}
                    {!isFollowing(result.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFollow(result.id)}
                        disabled={actionLoading === result.id}
                      >
                        {actionLoading === result.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Friend Requests
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </h4>
            {pendingRequests.map((request) => (
              <UserCard
                key={request.id}
                profile={request.profile}
                actions={
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request.id)}
                      disabled={actionLoading === request.id}
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading === request.id}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}

        {/* Tabs for Friends/Following/Followers */}
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends" className="gap-1">
              <Heart className="w-4 h-4" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-1">
              <Eye className="w-4 h-4" />
              Following ({following.length})
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-1">
              <Users className="w-4 h-4" />
              Followers ({followers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-2 mt-4">
            {friends.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No friends yet</p>
            ) : (
              friends.map((friend) => (
                <UserCard
                  key={friend.id}
                  profile={friend.profile}
                  actions={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveFriend(friend.id)}
                      disabled={actionLoading === friend.id}
                    >
                      {actionLoading === friend.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </Button>
                  }
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-2 mt-4">
            {following.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Not following anyone</p>
            ) : (
              following.map((follow) => (
                <UserCard
                  key={follow.id}
                  profile={follow.profile}
                  actions={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnfollow(follow.id)}
                      disabled={actionLoading === follow.id}
                    >
                      {actionLoading === follow.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Unfollow'
                      )}
                    </Button>
                  }
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="followers" className="space-y-2 mt-4">
            {followers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No followers yet</p>
            ) : (
              followers.map((follower) => (
                <UserCard
                  key={follower.id}
                  profile={follower.profile}
                  actions={
                    !isFollowing(follower.profile.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFollow(follower.profile.id)}
                        disabled={actionLoading === follower.profile.id}
                      >
                        {actionLoading === follower.profile.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Follow Back'
                        )}
                      </Button>
                    )
                  }
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
