import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Global subscription that fires a toast whenever a new message arrives
 * in any conversation the current user is a participant in.
 *
 * RLS guarantees we only receive INSERTs we are allowed to SELECT, so
 * a single channel is enough — no need to track every conversation id.
 *
 * Skips:
 *  - messages the current user sent
 *  - messages in the conversation the user is currently viewing
 *    (the /messages page sets `window.__activeConversationId`)
 */
export function useMessageNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`global-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const row = payload.new as {
            id: string;
            sender_id: string;
            conversation_id: string;
          };

          // Skip own messages
          if (row.sender_id === user.id) return;
          // Dedupe across reconnects
          if (seenIdsRef.current.has(row.id)) return;
          seenIdsRef.current.add(row.id);

          // Skip if user is viewing that exact conversation (or whole messages page open)
          const activeId = (window as unknown as {
            __activeConversationId?: string | null;
          }).__activeConversationId;
          if (activeId && activeId === row.conversation_id) return;

          // Fetch decrypted body + sender profile + conversation title
          const [{ data: msg }, { data: prof }, { data: conv }] = await Promise.all([
            supabase
              .from('messages_decrypted')
              .select('body')
              .eq('id', row.id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('username, display_name')
              .eq('id', row.sender_id)
              .maybeSingle(),
            supabase
              .from('conversations')
              .select('type, name')
              .eq('id', row.conversation_id)
              .maybeSingle(),
          ]);

          const senderName = prof?.display_name || prof?.username || 'Someone';
          const title =
            conv?.type === 'group' && conv?.name
              ? `${senderName} in ${conv.name}`
              : `${senderName} sent you a message`;
          const preview = (msg?.body || '').slice(0, 120) || 'New message';

          toast(title, {
            description: preview,
            action: {
              label: 'Open',
              onClick: () => {
                if (location.pathname !== '/messages') navigate('/messages');
              },
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, location.pathname]);
}
