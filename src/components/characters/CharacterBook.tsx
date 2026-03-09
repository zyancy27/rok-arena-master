import React, { useState, useEffect, useMemo } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useBookEngine } from '@/hooks/use-book-engine';

export default function CharacterBook() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<CharacterBookChapter[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const totalPages = chapters.length + 1;
  const book = useBookEngine({ storageKey: `rok-charbook-${id}`, totalPages });

  // Load character + extras
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: charData, error } = await fromDecrypted('characters')
        .select('*').eq('id', id).maybeSingle();

      if (error || !charData) {
        toast.error('Character not found');
        navigate('/characters');
        return;
      }
      setCharacter(charData);

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
    if (!loading) { const t = setTimeout(() => setIsOpen(true), 300); return () => clearTimeout(t); }
  }, [loading]);

  const isOwner = user?.id === character?.user_id;

  // Dynamic thickness
  const spineWidth = Math.min(24, Math.max(12, totalPages * 0.8));
  const edgeThickness = Math.min(10, Math.max(4, totalPages * 0.5));

  // Side tabs for chapter categories
  const sideTabData = useMemo(() => {
    const icons = ['📋', '⚔️', '📜', '🗺️', '🎭'];
    return chapters.slice(0, 5).map((ch, i) => ({
      icon: ch.icon || icons[i] || '📄',
      label: ch.title,
      pageIdx: i + 1,
    }));
  }, [chapters]);

  // Two-page: left shows previous page, right shows current
  const rightPage = book.currentSpread;
  const leftPageIdx = (!isMobile && book.currentSpread > 0) ? book.currentSpread - 1 : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse"><Swords className="w-16 h-16 text-primary" /></div>
      </div>
    );
  }

  if (!character) return null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Top bar */}
      <div className="w-full max-w-[960px] flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/characters/${id}/edit`)}>
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>

      <div
        className={cn("rok-book-container relative select-none", isOpen ? "rok-book-open" : "rok-book-closed")}
        style={{ '--spine-width': `${spineWidth}px`, '--edge-thickness': `${edgeThickness}px` } as React.CSSProperties}
        onTouchStart={book.onTouchStart}
        onTouchEnd={book.onTouchEnd}
      >
        <div className="rok-book-back" />
        <div className="rok-book-spine" />

        {/* Page edge stacks */}
        {!isMobile && <div className="rok-page-edges rok-page-edges-left" />}
        <div className="rok-page-edges rok-page-edges-right" />

        {/* Side section tabs */}
        <div className="rok-side-tabs">
          {sideTabData.map((tab, i) => (
            <button
              key={i}
              className={cn("rok-side-tab", book.currentSpread === tab.pageIdx && "active")}
              onClick={() => book.flipTo(tab.pageIdx)}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        {/* Bookmark ribbon */}
        {book.isBookmarked && (
          <div className="rok-bookmark-ribbon" style={{ right: isMobile ? 30 : '25%' }} />
        )}

        {/* Bookmark tabs */}
        {book.bookmarks.length > 0 && (
          <div className="absolute flex flex-col gap-1 z-30" style={{ right: isMobile ? -2 : 'auto', left: isMobile ? 'auto' : 'calc(100% + 30px)', top: 40 }}>
            {book.bookmarks.slice(0, 8).map(bm => (
              <button
                key={bm}
                onClick={() => book.flipTo(bm)}
                className={cn(
                  "w-6 h-8 rounded-r-sm text-[8px] font-bold flex items-center justify-center transition-colors",
                  bm === book.currentSpread ? "bg-primary text-primary-foreground" : "bg-primary/40 text-primary-foreground/70 hover:bg-primary/60"
                )}
              >
                {bm + 1}
              </button>
            ))}
          </div>
        )}

        {/* == LEFT PAGE (desktop only) == */}
        {!isMobile && (
          <div className="rok-book-page rok-page-left rok-parchment">
            {leftPageIdx !== null ? (
              <>
                <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/20">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'Cinzel, serif' }}>
                    {character.name}
                  </span>
                </div>
                <div className="rok-page-content flex-1 overflow-y-auto px-5 py-4">
                  {leftPageIdx === 0 ? (
                    <CharacterTableOfContents character={character} chapters={chapters} onSelectChapter={(idx) => book.flipTo(idx + 1)} />
                  ) : (
                    <CharacterChapterPage chapter={chapters[leftPageIdx - 1]} />
                  )}
                </div>
                <div className="flex justify-start px-4 py-2 border-t border-border/20">
                  <span className="rok-page-number">{leftPageIdx}</span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3 opacity-40">
                  <div className="rok-chapter-divider"><span className="rok-ornament">❧</span></div>
                  <p className="text-xs italic text-muted-foreground rok-body-text">
                    The chronicle of {character.name}
                  </p>
                  <div className="rok-chapter-divider"><span className="rok-ornament">❧</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* == RIGHT PAGE == */}
        <div className={cn(
          "rok-book-page rok-parchment rok-page-right",
          book.isFlipping && book.flipDirection === 'next' && "rok-flip-next",
          book.isFlipping && book.flipDirection === 'prev' && "rok-flip-prev",
        )}>
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/20">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate max-w-[60%]" style={{ fontFamily: 'Cinzel, serif' }}>
              {rightPage === 0 ? 'Contents' : chapters[rightPage - 1]?.title}
            </span>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => book.toggleBookmark(book.currentSpread)}>
              {book.isBookmarked
                ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                : <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </Button>
          </div>

          <div className="rok-page-content flex-1 overflow-y-auto px-5 sm:px-6 py-4">
            {rightPage === 0 ? (
              <CharacterTableOfContents character={character} chapters={chapters} onSelectChapter={(idx) => book.flipTo(idx + 1, 'next')} />
            ) : (
              <CharacterChapterPage chapter={chapters[rightPage - 1]} character={character} />
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-border/20">
            <Button variant="ghost" size="sm" onClick={book.prevPage} disabled={book.currentSpread === 0 || book.isFlipping} className="text-muted-foreground text-xs gap-1">
              <ChevronLeft className="w-3 h-3" /> Prev
            </Button>
            <span className="rok-page-number">{book.currentSpread + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" onClick={book.nextPage} disabled={book.currentSpread >= totalPages - 1 || book.isFlipping} className="text-muted-foreground text-xs gap-1">
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Cover */}
        <div className={cn("rok-book-cover", isOpen && "rok-cover-opened")}>
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <Avatar className="h-20 w-20 border-4 border-primary/30">
              <AvatarImage src={character.image_url || undefined} alt={character.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {character.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="rok-chapter-title text-xl sm:text-2xl font-bold text-primary-foreground text-center leading-tight">
              {character.name}
            </h1>
            <p className="text-xs text-primary-foreground/60 uppercase tracking-[0.3em]" style={{ fontFamily: 'Cinzel, serif' }}>
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
            <h2 className="rok-chapter-title text-lg font-bold text-foreground">{character.name}</h2>
            <p className="text-[10px] text-muted-foreground italic rok-body-text">{getTierName(character.level)} · Tier {character.level}</p>
          </div>
        </div>
        <div className="rok-chapter-divider"><span className="rok-ornament">✦</span></div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]" style={{ fontFamily: 'Cinzel, serif' }}>
          Table of Contents
        </p>
      </div>
      <ol className="space-y-0.5">
        {chapters.map((chapter, idx) => (
          <li key={chapter.id}>
            <button
              onClick={() => onSelectChapter(idx)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/30 transition-colors text-left group"
            >
              <span className="text-base">{chapter.icon}</span>
              <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors rok-body-text">
                {chapter.title}
              </span>
              <span className="rok-page-number tabular-nums">{idx + 1}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Chapter Page ───────────────────────────────────────────

function CharacterChapterPage({ chapter, character }: { chapter: CharacterBookChapter; character?: any }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{chapter.icon}</span>
          <h2 className="rok-chapter-title text-lg sm:text-xl font-bold text-foreground">{chapter.title}</h2>
        </div>
        <div className="rok-chapter-divider"><span className="rok-ornament">§</span></div>
      </div>

      {/* Character portrait illustration for first chapter */}
      {character?.image_url && chapter.id === 'overview' && (
        <div className="rok-illustration">
          <img src={character.image_url} alt={character.name} />
        </div>
      )}

      {chapter.sections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="rok-section-title text-sm uppercase tracking-wide">
            {section.title}
          </h3>

          {section.content && (
            <p className={cn("rok-body-text whitespace-pre-wrap", idx === 0 && "rok-drop-cap")}>
              {section.content}
            </p>
          )}

          {section.items && section.items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {section.items.map((item, i) => (
                <div key={i} className="p-2 rounded-md bg-muted/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>{item.label}</p>
                  <p className="rok-body-text text-sm text-foreground font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {section.listItems && section.listItems.length > 0 && (
            <ul className="space-y-1 pl-1">
              {section.listItems.map((li, i) => (
                <li key={i} className="flex items-start gap-2 rok-body-text text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          )}

          {section.component === 'relationships' && (
            <div className="rok-margin-note">
              Relationships are built through battles, campaigns, and stories.
            </div>
          )}

          {idx < chapter.sections.length - 1 && (
            <div className="rok-chapter-divider w-12 mx-auto"><span className="rok-ornament">·</span></div>
          )}
        </div>
      ))}
    </div>
  );
}
