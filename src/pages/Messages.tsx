import { useState } from 'react';
import { useConversations } from '@/hooks/use-conversations';
import ConversationList from '@/components/messaging/ConversationList';
import ConversationThread from '@/components/messaging/ConversationThread';
import NewConversationDialog from '@/components/messaging/NewConversationDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Plus } from 'lucide-react';

export default function Messages() {
  const { conversations, loading } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const active = conversations.find((c) => c.id === activeId) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Messages
        </h1>
        <Button onClick={() => setNewOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      <Card className="bg-card-gradient border-border overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[70vh]">
          <div className="border-r border-border overflow-y-auto">
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              onSelect={setActiveId}
              loading={loading}
            />
          </div>
          <div className="overflow-hidden">
            {active ? (
              <ConversationThread conversation={active} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6 text-center">
                Select a conversation, or start a new one.
              </div>
            )}
          </div>
        </div>
      </Card>

      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => setActiveId(id)}
      />
    </div>
  );
}
