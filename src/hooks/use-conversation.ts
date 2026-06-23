import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  pending?: boolean;
}

export interface ParticipantInfo {
  user_id: string;
  role: 'member' | 'admin';
  last_read_at: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TypingPayload {
  user_id: string;
  typing: boolean;
}

export function useConversation(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages + participants
  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    const [{ data: msgRows }, { data: partRows }] = await Promise.all([
      supabase
        .from('messages_decrypted')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('conversation_participants')
        .select('user_id, role, last_read_at')
        .eq('conversation_id', conversationId),
    ]);

    setMessages(
      ((msgRows || []) as ConversationMessage[]).filter((m) => !m.deleted_at),
    );

    const userIds = (partRows || []).map((p) => p.user_id);
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);
    const profileMap = new Map(profileRows?.map((p) => [p.id, p]) || []);

    setParticipants(
      (partRows || []).map((p) => {
        const prof = profileMap.get(p.user_id);
        return {
          user_id: p.user_id,
          role: p.role as 'member' | 'admin',
          last_read_at: p.last_read_at,
          username: prof?.username || '',
          display_name: prof?.display_name || null,
          avatar_url: prof?.avatar_url || null,
        };
      }),
    );

    setLoading(false);
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !user) return;
    load();

    const channel = supabase.channel(`conv:${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch decrypted version
          const { data } = await supabase
            .from('messages_decrypted')
            .select('*')
            .eq('id', (payload.new as { id: string }).id)
            .maybeSingle();
          if (data && !data.deleted_at) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev.filter((m) => !m.pending), data as ConversationMessage];
            });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages_decrypted')
            .select('*')
            .eq('id', (payload.new as { id: string }).id)
            .maybeSingle();
          if (!data) return;
          setMessages((prev) => {
            if (data.deleted_at) return prev.filter((m) => m.id !== data.id);
            return prev.map((m) => (m.id === data.id ? (data as ConversationMessage) : m));
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => load(),
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const p = payload as TypingPayload;
        if (p.user_id === user.id) return;
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (p.typing) next.add(p.user_id);
          else next.delete(p.user_id);
          return next;
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user, load]);

  // Mark as read whenever messages change (and on open)
  useEffect(() => {
    if (!conversationId) return;
    supabase.rpc('mark_conversation_read', { _conversation_id: conversationId });
  }, [conversationId, messages.length]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!conversationId || !user || !body.trim()) return;
      const pendingId = `pending-${Date.now()}`;
      const optimistic: ConversationMessage = {
        id: pendingId,
        conversation_id: conversationId,
        sender_id: user.id,
        body,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, body })
        .select('id, created_at')
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        return { error: error.message };
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, id: data.id, created_at: data.created_at, pending: false }
            : m,
        ),
      );
      return {};
    },
    [conversationId, user],
  );

  const editMessage = useCallback(async (id: string, body: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ body, edited_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    return {};
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    setMessages((prev) => prev.filter((m) => m.id !== id));
    return {};
  }, []);

  const broadcastTyping = useCallback(
    (typing: boolean) => {
      if (!channelRef.current || !user) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id, typing },
      });
      if (typing) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: user.id, typing: false },
          });
        }, 3500);
      }
    },
    [user],
  );

  return {
    messages,
    participants,
    loading,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    broadcastTyping,
    reload: load,
  };
}
