import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { buildMyBook, type MyBookPart, type MyBookPage, type MyBookChapter, type MyBookSection, type MyBookInput } from '@/lib/my-book-data';
import { BookOpen, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Swords, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export default function MyBook() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<MyBookPart[]>([]);
  const [pages, setPages] = useState<MyBookPage[]>([]);

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

  // ── Fetch data ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [charsRes, racesRes, groupsRes, storiesRes, systemsRes, campaignsRes] = await Promise.all([
        fromDecrypted('characters').select('id, name, level, race, home_planet, image_url').eq('user_id', user.id).order('updated_at', { ascending: false }),
        fromDecrypted('races').select('id, name, description, home_planet').eq('user_id', user.id).order('name'),
        supabase.from('character_groups').select('id, name, description, color').eq('user_id', user.id).order('name'),
        fromDecrypted('stories').select('id, title, summary, character_id, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20),
        supabase.from('solar_systems').select('id, name').eq('user_id', user.id),
        supabase.from('campaign_participants').select('campaign_id, campaigns(id, name, status, description)').eq('user_id', user.id),
      ]);

      const groups = groupsRes.data || [];
      const groupIds = groups.map(g => g.id);
      let memberCounts: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: allMembers } = await supabase.from('character_group_members').select('group_id').in('group_id', groupIds);
        for (const m of (allMembers || [])) {
          memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
        }
      }

      const systems = systemsRes.data || [];
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

      const result = buildMyBook(input);
      setParts(result.parts);
      setPages(result.pages);
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

  const totalPages = pages.length;

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

  // ── Helpers for page label ──────────────────────────────
  const getPageLabel = () => {
    const pg = pages[currentPage];
    if (!pg) return '';
    if (pg.type === 'toc') return 'Contents';
    if (pg.type === 'part-divider') return `Part ${ROMAN[pg.part.number - 1]}`;
    if (pg.type === 'chapter') return `Ch. ${pg.chapter.number}`;
    return '';
  };

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
                title={bm === 0 ? 'Contents' : getPageLabel()}
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
            <PageRenderer page={pages[currentPage]} parts={parts} pages={pages} flipTo={flipTo} navigate={navigate} displayName={displayName} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/30">
            <Button variant="ghost" size="sm" onClick={prevPage} disabled={currentPage === 0 || isFlipping} className="text-muted-foreground text-xs gap-1">
              <ChevronLeft className="w-3 h-3" /> Prev
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {getPageLabel()} · {currentPage + 1}/{totalPages}
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

// ── Page Renderer ─────────────────────────────────────────

function PageRenderer({ page, parts, pages, flipTo, navigate, displayName }: {
  page: MyBookPage;
  parts: MyBookPart[];
  pages: MyBookPage[];
  flipTo: (page: number, dir?: 'next' | 'prev') => void;
  navigate: (path: string) => void;
  displayName: string;
}) {
  if (!page) return null;

  switch (page.type) {
    case 'toc':
      return <HierarchicalTOC parts={parts} pages={pages} flipTo={flipTo} displayName={displayName} />;
    case 'part-divider':
      return <PartDividerPage part={page.part} />;
    case 'chapter':
      return <ChapterPage part={page.part} chapter={page.chapter} navigate={navigate} />;
    default:
      return null;
  }
}

// ── Table of Contents (hierarchical) ──────────────────────

function HierarchicalTOC({ parts, pages, flipTo, displayName }: {
  parts: MyBookPart[];
  pages: MyBookPage[];
  flipTo: (page: number, dir?: 'next' | 'prev') => void;
  displayName: string;
}) {
  // Build page index lookup
  const findPage = (type: string, partId: string, chapterId?: string) => {
    return pages.findIndex(p => {
      if (type === 'part-divider' && p.type === 'part-divider') return p.part.id === partId;
      if (type === 'chapter' && p.type === 'chapter') return p.chapter.id === chapterId;
      return false;
    });
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-foreground">{displayName}'s Book</h2>
        <p className="text-[10px] text-muted-foreground italic">Your living chronicle in the Realm of Kings</p>
        <div className="w-16 h-px bg-primary/40 mx-auto" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] pt-1">Table of Contents</p>
      </div>

      <div className="space-y-3">
        {parts.map(part => {
          const partPageIdx = findPage('part-divider', part.id);

          return (
            <div key={part.id} className="space-y-0.5">
              {/* Part heading */}
              <button
                onClick={() => partPageIdx >= 0 && flipTo(partPageIdx)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
              >
                <span className="text-base">{part.icon}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Part {ROMAN[part.number - 1]}
                </span>
                <span className="flex-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {part.title}
                </span>
                {part.count != null && part.count > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-5 px-1.5">{part.count}</Badge>
                )}
              </button>

              {/* Chapters indented */}
              <div className="ml-7 border-l border-border/40 pl-3 space-y-0.5">
                {part.chapters.map(chapter => {
                  const chapterPageIdx = findPage('chapter', part.id, chapter.id);
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => chapterPageIdx >= 0 && flipTo(chapterPageIdx)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors text-left group"
                    >
                      <span className="text-[10px] text-muted-foreground tabular-nums w-5 shrink-0">
                        {chapter.number}.
                      </span>
                      <span className="flex-1 text-sm text-foreground/80 group-hover:text-primary transition-colors">
                        {chapter.title}
                      </span>
                      {/* Section count */}
                      {chapter.sections.length > 1 && (
                        <span className="text-[9px] text-muted-foreground/60">
                          §{chapter.sections.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Part Divider Page ─────────────────────────────────────

function PartDividerPage({ part }: { part: MyBookPart }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5">
      <span className="text-4xl">{part.icon}</span>
      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.35em] font-medium">
        Part {ROMAN[part.number - 1]}
      </p>
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center">{part.title}</h2>
      <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      {part.count != null && part.count > 0 && (
        <p className="text-xs text-muted-foreground">
          {part.count} {part.count === 1 ? 'entry' : 'entries'}
        </p>
      )}
    </div>
  );
}

// ── Chapter Page ──────────────────────────────────────────

function ChapterPage({ part, chapter, navigate }: {
  part: MyBookPart;
  chapter: MyBookChapter;
  navigate: (path: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Chapter header */}
      <div className="space-y-1">
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
          Part {ROMAN[part.number - 1]} · {part.title}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Chapter {chapter.number}. {chapter.title}
        </h2>
        <div className="w-full h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
      </div>

      {/* Sections */}
      {chapter.sections.map((section, sIdx) => (
        <div key={section.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">
              {chapter.number}.{sIdx + 1} {section.title}
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
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-1">
              {section.content}
            </p>
          )}

          {/* Subsections */}
          {section.subsections && section.subsections.length > 0 && (
            <div className="ml-3 border-l-2 border-border/30 pl-3 space-y-2">
              {section.subsections.map((sub, subIdx) => (
                <div key={subIdx}>
                  <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                    {chapter.number}.{sIdx + 1}.{subIdx + 1} {sub.title}
                  </h4>
                  {sub.content && (
                    <p className="text-sm text-muted-foreground mt-0.5">{sub.content}</p>
                  )}
                  {sub.linkTo && (
                    <button
                      onClick={() => navigate(sub.linkTo!)}
                      className="text-[10px] text-primary/70 hover:text-primary mt-0.5 flex items-center gap-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> View
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {sIdx < chapter.sections.length - 1 && (
            <div className="w-10 h-px bg-border/40 mx-auto my-2" />
          )}
        </div>
      ))}
    </div>
  );
}
