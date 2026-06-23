import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConversationSummary } from '@/hooks/use-conversations';
import { formatDistanceToNowStrict } from 'date-fns';

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading conversations…</div>
    );
  }
  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No conversations yet. Start one from a friend or battle/campaign teammate.
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {conversations.map((c) => (
        <button
          type="button"
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            'flex items-start gap-3 px-3 py-3 text-left border-b border-border hover:bg-muted/40 transition-colors',
            activeId === c.id && 'bg-muted/60',
          )}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={c.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {c.type === 'group' ? (
                <Users className="w-4 h-4" />
              ) : (
                c.title.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'truncate text-sm',
                  c.unread ? 'font-semibold' : 'font-medium',
                )}
              >
                {c.title}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNowStrict(new Date(c.last_message_at), {
                  addSuffix: false,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'truncate text-xs text-muted-foreground',
                  c.unread && 'text-foreground',
                )}
              >
                {c.last_message_preview || 'No messages yet'}
              </span>
              {c.unread && (
                <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                  new
                </Badge>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
