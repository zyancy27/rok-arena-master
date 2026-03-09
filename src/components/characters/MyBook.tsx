import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildMyBookChapters, type MyBookChapter, type MyBookInput } from '@/lib/my-book-data';
import { BookOpen, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Swords, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function MyBook() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<MyBookChapter[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('rok-mybook-bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const touchStartX = useRef(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Fetch all data in parallel
      const [charsRes, racesRes, groupsRes, storiesRes, systemsRes, campaignsRes, membersRes] = await Promise.all([
        supabase.from('characters').select('id, name, level, race, home_planet, image_url').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('races').select('id, name, description, home_planet').eq('user_id', user.id).order('name'),
        supabase.from('character_groups').select('id, name, description, color').eq('user_id', user.id).order('name'),
        supabase.from('stories').select('id, title, summary, character_id, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20),
        supabase.from('solar_systems').select('id, name').eq('user_id', user.id),
        supabase.from('campaign_participants').select('campaign_id, campaigns(id, name, status, description)').eq('user_id', user.id),
        supabase.from('character_group_members').select('group_id').eq('character_id', user.id), // we'll count differently
      ]);

      // Count members per group
      const groups = (groupsRes.data || []);
      // Get member counts for each group
      const groupIds = groups.map(g => g.id);
      let memberCounts: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: allMembers } = await supabase.from('character_group_members').select('group_id').in('group_id', groupIds);
        for (const m of (allMembers || [])) {
          memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
        }
      }

      // Count planets per solar system
      const systems = (systemsRes.data || []);
      let planetCounts: Record<string, number> = {};
      if (systems.length > 0) {
        const sysIds = systems.map(s => s.id);
        const { data: planets } = await supabase.from('planet_customizations').select('solar_system_id').in('solar_system_id', sysIds);
        for (const p of (planets || [])) {
          if (p.solar_system_id) planetCounts[p.solar_system_id] = (planetCounts[p.solar_system_id] || 0) + 1;
        }
      }

      const input: MyBookInput = {
        characters: charsRes.data || [],
        races: racesRes.data || [],
        groups: groups.map(g => ({ ...g, memberCount: memberCounts[g.id] || 0 })),
        stories: storiesRes.data || [],
        solarSystems: systems.map(s => ({ ...s, planetCount: planetCounts[s.id] || 0 })),
        campaigns: (campaignsRes.data || []).map((c: any) => c.campaigns).filter(Boolean),
      };

      setChapters(buildMyBookChapters(input));
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    localStorage.setItem('rok-mybook-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const totalPages = chapters.length + 1;

  const flipTo = useCallback((page: number, direction?: 'next' | 'prev') => {
    if (isFlipping || page < 0 || page >= totalPages) return;
    const dir = direction || (page > currentPage ? 'next' : 'prev');
    setFlipDirection(dir);
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 400);
  }, [currentPage, isFlipping, totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) flipTo(currentPage + 1, 'next');
  }, [currentPage, totalPages, flipTo]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) flipTo(currentPage - 1, 'prev');
  }, [currentPage, flipTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPage();
      else if (e.key === 'ArrowLeft') prevPage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextPage, prevPage]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? nextPage() : prevPage(); }
  };

  const toggleBookmark = (page: number) => {
    setBookmarks(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  };

  const isBookmarked = bookmarks.includes(currentPage);
  const displayName = profile?.display_name || profile?.username || 'Warrior';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse-glow">
          <Swords className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Book container */}
      <div
        className={cn("rok-book-container relative select-none", isOpen ? "rok-book-open" : "rok-book-closed")}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="rok-book-back" />
        <div className="rok-book-spine" />

        {/* Bookmark tabs */}
        {bookmarks.length > 0 && (
          <div className="absolute right-0 top-8 z-30 flex flex-col gap-1">
            {bookmarks.map(bm => (
              <button
                key={bm}
                onClick={() => flipTo(bm)}
                className={cn(
                  "w-6 h-8 rounded-r-sm text-[8px] font-bold flex items-center justify-center transition-colors",
                  bm === currentPage ? "bg-primary text-primary-foreground" : "bg-primary/40 text-primary-foreground/70 hover:bg-primary/60"
                )}
                title={bm === 0 ? 'Contents' : chapters[bm - 1]?.title}
              >
                {bm}
              </button>
            ))}
          </div>
        )}

        {/* Page */}
        <div className={cn(
          "rok-book-page",
          isFlipping && flipDirection === 'next' && "rok-flip-next",
          isFlipping && flipDirection === 'prev' && "rok-flip-prev",
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/30">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              {displayName}'s Book
            </span>
            <div className="flex items-center gap-1">
              {currentPage > 0 && (
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => toggleBookmark(currentPage)}>
                  {isBookmarked
                    ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                    : <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </Button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="rok-page-content flex-1 overflow-y-auto px-5 sm:px-8 py-4">
            {currentPage === 0 ? (
              <MyBookTableOfContents
                displayName={displayName}
                chapters={chapters}
                onSelectChapter={(idx) => flipTo(idx + 1, 'next')}
              />
            ) : (
              <MyBookChapterPage chapter={chapters[currentPage - 1]} navigate={navigate} />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/30">
            <Button variant="ghost" size="sm" onClick={prevPage} disabled={currentPage === 0 || isFlipping} className="text-muted-foreground text-xs gap-1">
              <ChevronLeft className="w-3 h-3" /> Prev
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {currentPage === 0 ? 'Contents' : `${currentPage} / ${totalPages - 1}`}
            </span>
            <Button variant="ghost" size="sm" onClick={nextPage} disabled={currentPage >= totalPages - 1 || isFlipping} className="text-muted-foreground text-xs gap-1">
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Cover */}
        <div className={cn("rok-book-cover", isOpen && "rok-cover-opened")}>
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground text-center leading-tight">
              {displayName}'s Book
            </h1>
            <p className="text-xs text-primary-foreground/60 uppercase tracking-[0.3em]">
              Realm of Kings
            </p>
            <div className="w-12 h-px bg-primary/40 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Table of Contents ──────────────────────────────────────

function MyBookTableOfContents({ displayName, chapters, onSelectChapter }: {
  displayName: string;
  chapters: MyBookChapter[];
  onSelectChapter: (index: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-foreground">{displayName}'s Book</h2>
        <p className="text-[10px] text-muted-foreground italic">Your living chronicle in the Realm of Kings</p>
        <div className="w-16 h-px bg-primary/40 mx-auto" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] pt-1">Table of Contents</p>
      </div>
      <ol className="space-y-0.5">
        {chapters.map((chapter, idx) => (
          <li key={chapter.id}>
            <button
              onClick={() => onSelectChapter(idx)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors text-left group"
            >
              <span className="text-base">{chapter.icon}</span>
              <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">
                {chapter.title}
              </span>
              <div className="flex items-center gap-2">
                {chapter.count != null && chapter.count > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-5 px-1.5">
                    {chapter.count}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground tabular-nums">{idx + 1}</span>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Chapter Page ───────────────────────────────────────────

function MyBookChapterPage({ chapter, navigate }: { chapter: MyBookChapter; navigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{chapter.icon}</span>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{chapter.title}</h2>
          {chapter.count != null && chapter.count > 0 && (
            <Badge variant="secondary" className="text-[9px]">{chapter.count}</Badge>
          )}
        </div>
        <div className="w-full h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
      </div>

      {chapter.sections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
              {section.title}
            </h3>
            {section.linkTo && (
              <button
                onClick={() => navigate(section.linkTo!)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Open
              </button>
            )}
          </div>

          {section.content && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          )}

          {section.items && section.items.length > 0 && (
            <div className="space-y-1">
              {section.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => item.linkTo && navigate(item.linkTo)}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-md border border-border/40 bg-muted/20 text-left transition-colors",
                    item.linkTo && "hover:bg-muted/50 hover:border-primary/30 cursor-pointer"
                  )}
                >
                  <span className="text-sm text-foreground font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.value}</span>
                </button>
              ))}
            </div>
          )}

          {idx < chapter.sections.length - 1 && (
            <div className="w-8 h-px bg-border/50 mx-auto my-3" />
          )}
        </div>
      ))}
    </div>
  );
}
