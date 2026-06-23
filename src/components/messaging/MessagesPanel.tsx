import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConversations } from '@/hooks/use-conversations';
import ConversationList from './ConversationList';
import ConversationThread from './ConversationThread';
import NewConversationDialog from './NewConversationDialog';

export default function MessagesPanel() {
  const { conversations, loading, unreadCount } = useConversations();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const active = conversations.find((c) => c.id === activeId) || null;

  // Suppress global toast when the panel has a thread open
  useEffect(() => {
    const w = window as unknown as { __activeConversationId?: string | null };
    w.__activeConversationId = open && active ? active.id : null;
    return () => {
      w.__activeConversationId = null;
    };
  }, [open, active]);

  const handleCreated = (id: string) => {
    setActiveId(id);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-10 w-10">
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] p-0 flex flex-col"
        >
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setActiveId(null)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <SheetTitle>{active ? active.title : 'Messages'}</SheetTitle>
              </div>
              <div className="flex items-center gap-1">
                {!active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setNewOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <Link to="/messages" onClick={() => setOpen(false)}>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            {active ? (
              <ConversationThread conversation={active} />
            ) : (
              <div className="h-full overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  activeId={null}
                  onSelect={setActiveId}
                  loading={loading}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
