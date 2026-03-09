import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { buildCharacterBookChapters, type CharacterBookChapter, type CharacterBookSection } from '@/lib/character-book-data';
import { fetchCharacterStoryPoints } from '@/lib/narrative-sync';
import { BookOpen, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, ArrowLeft, Edit, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getTierName } from '@/lib/game-constants';

export default function CharacterBook() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<CharacterBookChapter[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`rok-char-bookmarks-${id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const touchStartX = useRef(0);

  // Load character + extras
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: charData, error } = await fromDecrypted('characters')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !charData) {
        toast.error('Character not found');
        navigate('/characters');
        return;
      }
      setCharacter(charData);

      // Fetch extras in parallel
      const [storyPointsRes, groupsRes, campaignsRes, timelineRes] = await Promise.all([
        fetchCharacterStoryPoints(id),
        supabase.from('character_group_members').select('group_id, character_groups(name, description)').eq('character_id', id),
        supabase.from('campaign_participants').select('campaign_id, campaigns(name, description, status)').eq('character_id', id),
        supabase.from('character_timeline_events').select('*').eq('character_id', id).order('sort_order', { ascending: true }),
      ]);

      const groups = (groupsRes.data || []).map((g: any) => g.character_groups).filter(Boolean);
      const campaignHistory = (campaignsRes.data || []).map((c: any) => c.campaigns).filter(Boolean);

      const built = buildCharacterBookChapters(charData, {
        timelineEvents: timelineRes.data || [],
        storyPoints: storyPointsRes.timelineEvents,
        loreSections: storyPointsRes.loreSections,
        campaignHistory,
        groups,
      });

      setChapters(built);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (id) localStorage.setItem(`rok-char-bookmarks-${id}`, JSON.stringify(bookmarks));
  }, [bookmarks, id]);

  const totalPages = chapters.length + 1; // +1 for ToC

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

  const isOwner = user?.id === character?.user_id;
  const isBookmarked = bookmarks.includes(currentPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse-glow">
          <Swords className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!character) return null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Top bar */}
      <div className="w-full max-w-[520px] flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/characters/${id}/edit`)}>
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>

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

        {/* Page content */}
        <div className={cn(
          "rok-book-page",
          isFlipping && flipDirection === 'next' && "rok-flip-next",
          isFlipping && flipDirection === 'prev' && "rok-flip-prev",
        )}>
          {/* Page header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/30">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium truncate max-w-[60%]">
              {character.name}
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

          {/* Page body */}
          <div className="rok-page-content flex-1 overflow-y-auto px-5 sm:px-8 py-4">
            {currentPage === 0 ? (
              <CharacterTableOfContents
                character={character}
                chapters={chapters}
                onSelectChapter={(idx) => flipTo(idx + 1, 'next')}
              />
            ) : (
              <CharacterChapterPage chapter={chapters[currentPage - 1]} />
            )}
          </div>

          {/* Page footer */}
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

        {/* Book cover */}
        <div className={cn("rok-book-cover", isOpen && "rok-cover-opened")}>
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <Avatar className="h-20 w-20 border-4 border-primary/30">
              <AvatarImage src={character.image_url || undefined} alt={character.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {character.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground text-center leading-tight">
              {character.name}
            </h1>
            <p className="text-xs text-primary-foreground/60 uppercase tracking-[0.3em]">
              {getTierName(character.level)}
            </p>
            <div className="w-12 h-px bg-primary/40 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Table of Contents ──────────────────────────────────────

function CharacterTableOfContents({ character, chapters, onSelectChapter }: {
  character: any;
  chapters: CharacterBookChapter[];
  onSelectChapter: (index: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/30">
            <AvatarImage src={character.image_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
              {character.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-bold text-foreground">{character.name}</h2>
            <p className="text-[10px] text-muted-foreground italic">{getTierName(character.level)} · Tier {character.level}</p>
          </div>
        </div>
        <div className="w-16 h-px bg-primary/40 mx-auto mt-2" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">Table of Contents</p>
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
              <span className="text-[10px] text-muted-foreground tabular-nums">{idx + 1}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Chapter Page ───────────────────────────────────────────

function CharacterChapterPage({ chapter }: { chapter: CharacterBookChapter }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{chapter.icon}</span>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{chapter.title}</h2>
        </div>
        <div className="w-full h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
      </div>

      {chapter.sections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
            {section.title}
          </h3>

          {section.content && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          )}

          {section.items && section.items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {section.items.map((item, i) => (
                <div key={i} className="p-2 rounded-md bg-muted/30 border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm text-foreground font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {section.listItems && section.listItems.length > 0 && (
            <ul className="space-y-1 pl-1">
              {section.listItems.map((li, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          )}

          {section.component === 'relationships' && (
            <p className="text-sm text-muted-foreground italic">
              Relationships are built through battles, campaigns, and stories.
            </p>
          )}

          {idx < chapter.sections.length - 1 && (
            <div className="w-8 h-px bg-border/50 mx-auto my-3" />
          )}
        </div>
      ))}
    </div>
  );
}
