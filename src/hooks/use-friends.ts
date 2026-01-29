import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FriendshipWithProfile {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  is_follow: boolean;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendshipWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendshipWithProfile[]>([]);
  const [followers, setFollowers] = useState<FriendshipWithProfile[]>([]);
  const [following, setFollowing] = useState<FriendshipWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get all friendships where user is involved
      const { data: friendshipData, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      if (!friendshipData) {
        setLoading(false);
        return;
      }

      // Get all related user IDs
      const userIds = new Set<string>();
      friendshipData.forEach(f => {
        userIds.add(f.requester_id);
        userIds.add(f.addressee_id);
      });
      userIds.delete(user.id);

      // Fetch profiles for all users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Process friendships into categories
      const processedFriends: FriendshipWithProfile[] = [];
      const processedPending: FriendshipWithProfile[] = [];
      const processedSentRequests: FriendshipWithProfile[] = [];
      const processedFollowers: FriendshipWithProfile[] = [];
      const processedFollowing: FriendshipWithProfile[] = [];

      friendshipData.forEach(f => {
        const otherUserId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const profile = profileMap.get(otherUserId);
        if (!profile) return;

        const friendshipWithProfile: FriendshipWithProfile = {
          ...f,
          status: f.status as 'pending' | 'accepted' | 'blocked',
          profile,
        };

        if (f.is_follow) {
          // It's a follow relationship
          if (f.requester_id === user.id) {
            processedFollowing.push(friendshipWithProfile);
          } else {
            processedFollowers.push(friendshipWithProfile);
          }
        } else {
          // It's a friend request
          if (f.status === 'accepted') {
            processedFriends.push(friendshipWithProfile);
          } else if (f.status === 'pending') {
            if (f.addressee_id === user.id) {
              processedPending.push(friendshipWithProfile);
            } else {
              // User sent this request
              processedSentRequests.push(friendshipWithProfile);
            }
          }
        }
      });

      setFriends(processedFriends);
      setPendingRequests(processedPending);
      setSentRequests(processedSentRequests);
      setFollowers(processedFollowers);
      setFollowing(processedFollowing);
    } catch (error) {
      console.error('Failed to fetch friendships:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriendships();
  }, [fetchFriendships]);

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending',
        is_follow: false,
      });

    if (!error) {
      fetchFriendships();
    }
    return { error: error?.message };
  };

  const followUser = async (addresseeId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'accepted',
        is_follow: true,
      });

    if (!error) {
      fetchFriendships();
    }
    return { error: error?.message };
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (!error) {
      fetchFriendships();
    }
    return { error: error?.message };
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (!error) {
      fetchFriendships();
    }
    return { error: error?.message };
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (!error) {
      fetchFriendships();
    }
    return { error: error?.message };
  };

  const unfollowUser = async (friendshipId: string) => {
    return removeFriend(friendshipId);
  };

  const isFriend = (userId: string): boolean => {
    return friends.some(f => f.profile.id === userId);
  };

  const isFollowing = (userId: string): boolean => {
    return following.some(f => f.profile.id === userId);
  };

  const hasPendingRequest = (userId: string): boolean => {
    return pendingRequests.some(f => f.profile.id === userId);
  };

  const hasSentRequest = (userId: string): boolean => {
    return sentRequests.some(f => f.profile.id === userId);
  };

  const cancelSentRequest = async (userId: string) => {
    const request = sentRequests.find(f => f.profile.id === userId);
    if (!request) return { error: 'Request not found' };

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', request.id);

    if (!error) {
      fetchFriendships();
    }
    return { error: error?.message };
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
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
    hasPendingRequest,
    hasSentRequest,
    cancelSentRequest,
    refresh: fetchFriendships,
  };
}
