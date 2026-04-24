/**
 * Global Community Suggestions modal + header trigger.
 *
 * - Header button is mounted once in MainLayout.
 * - Modal has two tabs: "Send idea" (submit form) and "Community" (feed + upvotes).
 * - Suggestions live in `public.suggestions`; one upvote per user enforced by
 *   `public.suggestion_votes` UNIQUE(suggestion_id, user_id).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Lightbulb, Send, ThumbsUp, Loader2, MessageSquarePlus, Search, Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = [
  { value: 'character_creation', label: 'Character Creation' },
  { value: 'campaign', label: 'Campaign Mode' },
  { value: 'battles', label: 'Battles' },
  { value: 'ui_hud', label: 'UI / HUD' },
  { value: 'worldbuilding', label: 'Worldbuilding' },
  { value: 'community', label: 'Community' },
  { value: 'bug', label: 'Bugs / Issues' },
  { value: 'other', label: 'Other' },
] as const;

interface Suggestion {
  id: string;
  user_id: string;
  username: string;
  title: string | null;
  body: string;
  category: string;
  page_context: string | null;
  vote_count: number;
  created_at: string;
}

type SortMode = 'top' | 'new';

export default function SuggestionsButton() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-cosmic-gold hover:text-cosmic-gold hover:bg-cosmic-gold/10"
        aria-label="Send a suggestion"
      >
        <Lightbulb className="w-4 h-4" />
        <span className="hidden sm:inline">Ideas</span>
      </Button>
      <SuggestionsModal
        open={open}
        onOpenChange={setOpen}
        user={user}
        username={profile?.display_name || profile?.username || null}
      />
    </>
  );
}

function SuggestionsModal({
  open, onOpenChange, user, username,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string } | null;
  username: string | null;
}) {
  const location = useLocation();
  const [tab, setTab] = useState<'submit' | 'feed'>('feed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cosmic-gold" />
            Community Ideas
          </DialogTitle>
          <DialogDescription>
            Got an idea to improve the app? Share it — and upvote what others want too.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="py-10 text-center space-y-3">
            <Lightbulb className="w-10 h-10 text-cosmic-gold mx-auto" />
            <p className="text-sm text-muted-foreground">
              Log in or create a profile to send suggestions and upvote ideas.
            </p>
            <Button asChild className="glow-primary">
              <a href="/auth">Log in / Sign up</a>
            </Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'submit' | 'feed')} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 mb-3">
              <TabsTrigger value="feed">Community feed</TabsTrigger>
              <TabsTrigger value="submit">
                <MessageSquarePlus className="w-3.5 h-3.5 mr-1" /> Send idea
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submit" className="flex-1 overflow-y-auto">
              <SubmitForm
                userId={user.id}
                username={username || 'Anonymous'}
                pageContext={location.pathname}
                onSubmitted={() => setTab('feed')}
              />
            </TabsContent>

            <TabsContent value="feed" className="flex-1 overflow-y-auto min-h-0">
              <SuggestionFeed userId={user.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Submit form ───────── */

function SubmitForm({
  userId, username, pageContext, onSubmitted,
}: {
  userId: string;
  username: string;
  pageContext: string;
  onSubmitted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error('Tell us your idea before sending.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from('suggestions').insert({
        user_id: userId,
        username,
        title: title.trim() || null,
        body: body.trim(),
        category,
        page_context: pageContext,
      } as never);
      if (error) throw error;
      setSuccess(true);
      toast.success('Thanks — your idea was sent.');
      // Don't wipe form text until they explicitly clear it; success flag is enough.
      setTimeout(() => {
        setTitle(''); setBody(''); setCategory('other'); setSuccess(false);
        onSubmitted();
      }, 900);
    } catch (err) {
      // Per spec: do NOT erase typed text on failure.
      toast.error(err instanceof Error ? err.message : 'Could not send your suggestion.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sug-title" className="text-xs uppercase tracking-wide">
          Title <Badge variant="outline" className="text-[9px] py-0">optional</Badge>
        </Label>
        <Input
          id="sug-title" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Short and catchy" maxLength={120} disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sug-body" className="text-xs uppercase tracking-wide">Your idea</Label>
        <Textarea
          id="sug-body" value={body} onChange={(e) => setBody(e.target.value)}
          rows={5} placeholder="Help shape the project — what would make this better?"
          required maxLength={4000} disabled={busy}
        />
        <p className="text-[10px] text-muted-foreground text-right">{body.length}/4000</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide">Category</Label>
        <Select value={category} onValueChange={setCategory} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full glow-primary" disabled={busy || !body.trim()}>
        {busy
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
          : success
            ? <><Sparkles className="w-4 h-4 mr-2" /> Sent!</>
            : <><Send className="w-4 h-4 mr-2" /> Send your suggestion</>}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Posted as <span className="text-foreground">{username}</span>. Your text stays here if sending fails.
      </p>
    </form>
  );
}

/* ───────── Feed ───────── */

function SuggestionFeed({ userId }: { userId: string }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>('top');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [voting, setVoting] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const orderBy = sort === 'top'
      ? { col: 'vote_count', asc: false }
      : { col: 'created_at', asc: false };
    const { data: sData } = await supabase
      .from('suggestions')
      .select('*')
      .order(orderBy.col, { ascending: orderBy.asc })
      .limit(200);
    const { data: vData } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('user_id', userId);
    setItems((sData as Suggestion[]) || []);
    setMyVotes(new Set(((vData as { suggestion_id: string }[]) || []).map((v) => v.suggestion_id)));
    setLoading(false);
  }, [sort, userId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const blob = `${s.title ?? ''} ${s.body} ${s.username}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, categoryFilter, search]);

  const toggleVote = async (s: Suggestion) => {
    if (voting.has(s.id)) return;
    setVoting((prev) => new Set(prev).add(s.id));
    const hadVoted = myVotes.has(s.id);

    // Optimistic UI
    setMyVotes((prev) => {
      const next = new Set(prev);
      if (hadVoted) next.delete(s.id); else next.add(s.id);
      return next;
    });
    setItems((prev) => prev.map((x) =>
      x.id === s.id ? { ...x, vote_count: x.vote_count + (hadVoted ? -1 : 1) } : x,
    ));

    try {
      if (hadVoted) {
        const { error } = await supabase
          .from('suggestion_votes')
          .delete()
          .eq('suggestion_id', s.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suggestion_votes')
          .insert({ suggestion_id: s.id, user_id: userId } as never);
        if (error) throw error;
      }
    } catch (err) {
      // Revert
      setMyVotes((prev) => {
        const next = new Set(prev);
        if (hadVoted) next.add(s.id); else next.delete(s.id);
        return next;
      });
      setItems((prev) => prev.map((x) =>
        x.id === s.id ? { ...x, vote_count: x.vote_count + (hadVoted ? 1 : -1) } : x,
      ));
      toast.error(err instanceof Error ? err.message : 'Vote failed.');
    } finally {
      setVoting((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[160px] relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ideas…" className="pl-8 h-9 text-xs"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Most upvoted</SelectItem>
            <SelectItem value="new">Newest</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading ideas…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground text-sm">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 text-cosmic-gold/60" />
          {items.length === 0
            ? 'No ideas yet — be the first to send one.'
            : 'No suggestions match your filters.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const voted = myVotes.has(s.id);
            const cat = CATEGORIES.find((c) => c.value === s.category);
            return (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-background/40 p-3 flex gap-3"
              >
                <button
                  type="button"
                  onClick={() => toggleVote(s)}
                  disabled={voting.has(s.id)}
                  className={`shrink-0 flex flex-col items-center justify-center w-12 rounded-md border transition-colors ${
                    voted
                      ? 'bg-cosmic-gold/20 border-cosmic-gold/50 text-cosmic-gold'
                      : 'bg-muted/30 border-border text-muted-foreground hover:border-cosmic-gold/40 hover:text-cosmic-gold'
                  }`}
                  aria-pressed={voted}
                  aria-label={voted ? 'Remove your upvote' : 'Upvote this idea'}
                >
                  {voting.has(s.id)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ThumbsUp className={`w-4 h-4 ${voted ? 'fill-cosmic-gold' : ''}`} />}
                  <span className="text-xs font-bold mt-0.5">{s.vote_count}</span>
                </button>
                <div className="flex-1 min-w-0">
                  {s.title && (
                    <h4 className="font-semibold text-sm leading-tight">{s.title}</h4>
                  )}
                  <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                    {s.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] py-0 border-primary/30 text-primary">
                      {cat?.label ?? s.category}
                    </Badge>
                    <span>by <span className="text-foreground">{s.username}</span></span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
