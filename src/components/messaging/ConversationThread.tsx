import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2, Pencil, Check, X, Users } from 'lucide-react';
import { useConversation } from '@/hooks/use-conversation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ConversationSummary } from '@/hooks/use-conversations';

interface Props {
  conversation: ConversationSummary;
}

export default function ConversationThread({ conversation }: Props) {
  const { user } = useAuth();
  const {
    messages,
    participants,
    loading,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    broadcastTyping,
  } = useConversation(conversation.id);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, typingUsers.size]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    setSending(true);
    broadcastTyping(false);
    const result = await sendMessage(body);
    if (result?.error) setDraft(body);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      broadcastTyping(true);
    }
  };

  const startEdit = (id: string, body: string) => {
    setEditingId(id);
    setEditDraft(body);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const body = editDraft.trim();
    if (body) await editMessage(editingId, body);
    setEditingId(null);
    setEditDraft('');
  };

  const profileFor = (uid: string) => participants.find((p) => p.user_id === uid);

  // Read receipts: latest message read by everyone else
  const otherParticipants = participants.filter((p) => p.user_id !== user?.id);
  const seenByAll = (() => {
    const myMessages = messages.filter((m) => m.sender_id === user?.id && !m.pending);
    if (!myMessages.length || otherParticipants.length === 0) return null;
    const minRead = otherParticipants.reduce<number | null>((acc, p) => {
      if (!p.last_read_at) return null;
      const ts = new Date(p.last_read_at).getTime();
      if (acc === null) return ts;
      return Math.min(acc, ts);
    }, null);
    if (minRead === null) return null;
    const latestSeen = [...myMessages]
      .reverse()
      .find((m) => new Date(m.created_at).getTime() <= minRead);
    return latestSeen?.id || null;
  })();

  const typingNames = Array.from(typingUsers)
    .map((uid) => {
      const p = profileFor(uid);
      return p?.display_name || p?.username;
    })
    .filter(Boolean) as string[];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={conversation.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {conversation.type === 'group' ? (
              <Users className="w-4 h-4" />
            ) : (
              conversation.title.charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{conversation.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {conversation.type === 'group'
              ? `${participants.length} members`
              : '@' + (conversation.participants[0]?.username || '')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {loading && (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            No messages yet. Say hi 👋
          </p>
        )}
        {messages.map((m, idx) => {
          const mine = m.sender_id === user?.id;
          const sender = profileFor(m.sender_id);
          const showAvatar =
            !mine &&
            (idx === 0 || messages[idx - 1].sender_id !== m.sender_id);
          const isLastSeen = seenByAll === m.id;
          return (
            <div
              key={m.id}
              className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}
            >
              {!mine && (
                <div className="w-7 shrink-0">
                  {showAvatar && (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {(sender?.display_name || sender?.username || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              <div className={cn('max-w-[75%] group', mine && 'items-end')}>
                {!mine && showAvatar && conversation.type === 'group' && (
                  <p className="text-[10px] text-muted-foreground mb-0.5 px-1">
                    {sender?.display_name || sender?.username}
                  </p>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
                    mine
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm',
                    m.pending && 'opacity-60',
                  )}
                >
                  {editingId === m.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={2}
                        className="bg-background text-foreground"
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={saveEdit}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    m.body
                  )}
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 px-1 mt-0.5 text-[10px] text-muted-foreground',
                    mine ? 'justify-end' : 'justify-start',
                  )}
                >
                  <span>
                    {format(new Date(m.created_at), 'HH:mm')}
                    {m.edited_at && ' · edited'}
                  </span>
                  {mine && editingId !== m.id && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => startEdit(m.id, m.body)}
                        className="hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMessage(m.id)}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {mine && isLastSeen && !m.pending && (
                    <span className="text-primary">· Seen</span>
                  )}
                  {mine && m.pending && <span>· Sending…</span>}
                </div>
              </div>
            </div>
          );
        })}

        {typingNames.length > 0 && (
          <div className="text-xs text-muted-foreground italic px-2">
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing
            <span className="inline-flex ml-1">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse [animation-delay:150ms]">.</span>
              <span className="animate-pulse [animation-delay:300ms]">.</span>
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2 flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="resize-none min-h-[40px] max-h-32"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
