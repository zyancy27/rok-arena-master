import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConversationParticipantProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ConversationSummary {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread: boolean;
  my_last_read_at: string | null;
  participants: ConversationParticipantProfile[];
  title: string;
  avatar_url: string | null;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // 1. conversations I'm in (RLS guards visibility)
    const { data: convRows } = await supabase
      .from('conversations')
      .select('id, type, name, last_message_at, last_message_preview')
      .order('last_message_at', { ascending: false });

    if (!convRows?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = convRows.map((c) => c.id);

    // 2. all participants for those conversations
    const { data: partRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, last_read_at')
      .in('conversation_id', convIds);

    // 3. profiles for everyone we see
    const userIds = Array.from(new Set((partRows || []).map((p) => p.user_id)));
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map<string, ConversationParticipantProfile>();
    (profileRows || []).forEach((p) =>
      profileMap.set(p.id, {
        user_id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      }),
    );

    const summaries: ConversationSummary[] = convRows.map((c) => {
      const parts = (partRows || []).filter((p) => p.conversation_id === c.id);
      const my = parts.find((p) => p.user_id === user.id);
      const others = parts
        .filter((p) => p.user_id !== user.id)
        .map((p) => profileMap.get(p.user_id))
        .filter(Boolean) as ConversationParticipantProfile[];

      const unread =
        !!c.last_message_at &&
        (!my?.last_read_at ||
          new Date(c.last_message_at).getTime() >
            new Date(my.last_read_at).getTime());

      const title =
        c.type === 'group'
          ? c.name || 'Group chat'
          : others[0]?.display_name || others[0]?.username || 'Direct message';

      return {
        id: c.id,
        type: c.type as 'direct' | 'group',
        name: c.name,
        last_message_at: c.last_message_at,
        last_message_preview: c.last_message_preview,
        unread,
        my_last_read_at: my?.last_read_at || null,
        participants: others,
        title,
        avatar_url: c.type === 'direct' ? others[0]?.avatar_url || null : null,
      };
    });

    setConversations(summaries);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: any change in my conversations refreshes the list
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-conversations-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const unreadCount = conversations.filter((c) => c.unread).length;

  const startDirect = useCallback(
    async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('start_direct_conversation', {
        _other_user: otherUserId,
      });
      if (error) return { error: error.message };
      await load();
      return { id: data as unknown as string };
    },
    [load],
  );

  const createGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const { data, error } = await supabase.rpc('create_group_conversation', {
        _name: name,
        _member_ids: memberIds,
      });
      if (error) return { error: error.message };
      await load();
      return { id: data as unknown as string };
    },
    [load],
  );

  return { conversations, loading, unreadCount, reload: load, startDirect, createGroup };
}
