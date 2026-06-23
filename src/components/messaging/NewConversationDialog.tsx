import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

interface Candidate {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  source: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export default function NewConversationDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'direct' | 'group'>('direct');

  useEffect(() => {
    if (!open || !user) return;
    setSelected(new Set());
    setGroupName('');
    setQuery('');
    loadCandidates();
  }, [open, user]);

  const loadCandidates = async () => {
    if (!user) return;
    setLoading(true);
    const map = new Map<string, Candidate>();

    // 1. Friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, is_follow, status')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const friendIds = (friendships || [])
      .filter((f) => !f.is_follow)
      .map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));

    // 2. Battle teammates
    const { data: myChars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id);
    const myCharIds = (myChars || []).map((c) => c.id);

    let battleMateIds: string[] = [];
    if (myCharIds.length > 0) {
      const { data: myBattleParts } = await supabase
        .from('battle_participants')
        .select('battle_id')
        .in('character_id', myCharIds);
      const battleIds = Array.from(
        new Set((myBattleParts || []).map((p) => p.battle_id)),
      );
      if (battleIds.length > 0) {
        const { data: allParts } = await supabase
          .from('battle_participants')
          .select('character_id, characters!inner(user_id)')
          .in('battle_id', battleIds);
        battleMateIds = (allParts || [])
          .map((p) => (p as { characters: { user_id: string } }).characters?.user_id)
          .filter((uid): uid is string => !!uid && uid !== user.id);
      }
    }

    // 3. Campaign teammates
    const { data: myCampParts } = await supabase
      .from('campaign_participants')
      .select('campaign_id')
      .eq('user_id', user.id);
    const campIds = Array.from(new Set((myCampParts || []).map((p) => p.campaign_id)));
    let campMateIds: string[] = [];
    if (campIds.length > 0) {
      const { data: allCamp } = await supabase
        .from('campaign_participants')
        .select('user_id')
        .in('campaign_id', campIds);
      campMateIds = (allCamp || [])
        .map((p) => p.user_id)
        .filter((uid) => uid !== user.id);
    }

    const allIds = Array.from(
      new Set([...friendIds, ...battleMateIds, ...campMateIds]),
    );
    if (allIds.length === 0) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', allIds);

    (profiles || []).forEach((p) => {
      const sources: string[] = [];
      if (friendIds.includes(p.id)) sources.push('Friend');
      if (battleMateIds.includes(p.id)) sources.push('Battle');
      if (campMateIds.includes(p.id)) sources.push('Campaign');
      map.set(p.id, {
        user_id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        source: sources.join(' · '),
      });
    });

    setCandidates(Array.from(map.values()));
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        (c.display_name || '').toLowerCase().includes(q),
    );
  }, [candidates, query]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartDirect = async (id: string) => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc('start_direct_conversation', {
      _other_user: id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onCreated(data as unknown as string);
    onOpenChange(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Name your group');
      return;
    }
    if (selected.size === 0) {
      toast.error('Add at least one person');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('create_group_conversation', {
      _name: groupName,
      _member_ids: Array.from(selected),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onCreated(data as unknown as string);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            You can message friends and anyone in your battles or campaigns.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'direct' | 'group')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="direct">Direct</TabsTrigger>
            <TabsTrigger value="group">
              <Users className="w-4 h-4 mr-1" /> Group
            </TabsTrigger>
          </TabsList>

          <Input
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-3"
          />

          <TabsContent value="direct" className="mt-3 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                No eligible contacts yet — add friends or join a battle/campaign.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleStartDirect(c.user_id)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted/50 text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.avatar_url || undefined} />
                    <AvatarFallback>
                      {c.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {c.display_name || c.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{c.source}</p>
                  </div>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="group" className="mt-3 space-y-3">
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto border border-border rounded">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  No eligible contacts.
                </p>
              ) : (
                filtered.map((c) => (
                  <label
                    key={c.user_id}
                    className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(c.user_id)}
                      onCheckedChange={() => toggleSelect(c.user_id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback>
                        {c.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {c.display_name || c.username}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{c.source}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateGroup}
                disabled={submitting || selected.size === 0 || !groupName.trim()}
              >
                Create group ({selected.size})
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
