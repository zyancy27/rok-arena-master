import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { buildBookChapters, searchChapters } from '@/lib/rules-book-data';
import { getUnreadCount, markRead, getReadMechanics, getDiscoveredMechanics } from '@/lib/living-rulebook-registry';
import { BookOpen, ChevronLeft, ChevronRight, Search, X, Bookmark, BookmarkCheck, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import BookPage from './BookPage';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBookEngine } from '@/hooks/use-book-engine';

export default function RulesBook() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  const chapters = useMemo(() => buildBookChapters(), []);
  const unreadCount = useMemo(() => getUnreadCount(), []);
  const totalPages = chapters.length + 1;

  const book = useBookEngine({ storageKey: 'rok-rulebook', totalPages });

  // Mark living chapter entries as read when viewed
  useEffect(() => {
    if (book.currentSpread > 0) {
      const chapter = chapters[book.currentSpread - 1];
      if (chapter?.isLiving && chapter.livingEntries) {
        chapter.livingEntries.forEach(e => markRead(e.mechanicKey));
      }
    }
  }, [book.currentSpread, chapters]);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const result = searchChapters(searchQuery);
    if (result) {
      book.flipTo(result.chapterIndex + 1);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleCrossRef = useCallback((mechanicKey: string) => {
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (ch.livingEntries?.some(e => e.mechanicKey === mechanicKey)) {
        book.flipTo(i + 1);
        return;
      }
    }
  }, [chapters, book.flipTo]);

  const spineWidth = Math.min(24, Math.max(12, totalPages * 0.5));
  const edgeThickness = Math.min(10, Math.max(4, totalPages * 0.3));

  const leftPageIdx = (!isMobile && book.currentSpread > 0) ? book.currentSpread - 1 : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Search bar */}
      <div className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
        searchOpen ? "w-[90vw] max-w-md opacity-100" : "w-0 opacity-0 pointer-events-none"
      )}>
        <form onSubmit={handleSearch} className="relative">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search rules... (e.g. charge attack, perception)"
            className="pr-10 bg-card border-border text-foreground"
            autoFocus={searchOpen}
          />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
            <X className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <div
        className={cn("rok-book-container relative select-none", isOpen ? "rok-book-open" : "rok-book-closed")}
        style={{ '--spine-width': `${spineWidth}px`, '--edge-thickness': `${edgeThickness}px` } as React.CSSProperties}
        onTouchStart={book.onTouchStart}
        onTouchEnd={book.onTouchEnd}
      >
        <div className="rok-book-back" />
        <div className="rok-book-spine" />
        {!isMobile && <div className="rok-page-edges rok-page-edges-left" />}
        <div className="rok-page-edges rok-page-edges-right" />

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
                title={bm === 0 ? 'Contents' : chapters[bm - 1]?.title}
              >
                {bm + 1}
              </button>
            ))}
          </div>
        )}

        {/* LEFT PAGE (desktop) */}
        {!isMobile && (
          <div className="rok-book-page rok-page-left rok-parchment">
            {leftPageIdx !== null ? (
              <>
                <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/20">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'Cinzel, serif' }}>
                    O.C.R.P.
                  </span>
                </div>
                <div className="rok-page-content flex-1 overflow-y-auto px-5 py-4">
                  {leftPageIdx === 0 ? (
                    <TableOfContents chapters={chapters} onSelectChapter={(idx) => book.flipTo(idx + 1)} />
                  ) : (
                    <BookPage chapter={chapters[leftPageIdx - 1]} onCrossRefClick={handleCrossRef} />
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
                  <p className="text-xs italic text-muted-foreground rok-body-text">A living record of the arena</p>
                  <div className="rok-chapter-divider"><span className="rok-ornament">❧</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT PAGE */}
        <div className={cn(
          "rok-book-page rok-parchment rok-page-right",
          book.isFlipping && book.flipDirection === 'next' && "rok-flip-next",
          book.isFlipping && book.flipDirection === 'prev' && "rok-flip-prev",
        )}>
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border/20">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'Cinzel, serif' }}>
                {book.currentSpread === 0 ? 'Contents' : chapters[book.currentSpread - 1]?.title}
              </span>
              {unreadCount > 0 && book.currentSpread === 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-primary animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" /> {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setSearchOpen(true)}>
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => book.toggleBookmark(book.currentSpread)}>
                {book.isBookmarked
                  ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                  : <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </Button>
            </div>
          </div>

          <div className="rok-page-content flex-1 overflow-y-auto px-5 sm:px-6 py-4">
            {book.currentSpread === 0 ? (
              <TableOfContents chapters={chapters} onSelectChapter={(idx) => book.flipTo(idx + 1, 'next')} />
            ) : (
              <BookPage chapter={chapters[book.currentSpread - 1]} onCrossRefClick={handleCrossRef} />
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
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="rok-chapter-title text-xl sm:text-2xl font-bold text-primary-foreground text-center leading-tight">
              R.O.K.
            </h1>
            <p className="text-xs text-primary-foreground/60 uppercase tracking-[0.3em]" style={{ fontFamily: 'Cinzel, serif' }}>
              Living Rulebook
            </p>
            {unreadCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-primary animate-pulse">
                <Sparkles className="w-3 h-3" />
                {unreadCount} new {unreadCount === 1 ? 'discovery' : 'discoveries'}
              </div>
            )}
            <div className="w-12 h-px bg-primary/40 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TableOfContents({ chapters, onSelectChapter }: {
  chapters: ReturnType<typeof buildBookChapters>;
  onSelectChapter: (index: number) => void;
}) {
  const readSet = useMemo(() => getReadMechanics(), []);
  const discoveredSet = useMemo(() => getDiscoveredMechanics(), []);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="rok-chapter-title text-xl font-bold text-foreground">Table of Contents</h2>
        <p className="text-[10px] text-muted-foreground italic rok-body-text">A living record of the arena's mechanics</p>
        <div className="rok-chapter-divider"><span className="rok-ornament">✦</span></div>
      </div>
      <ol className="space-y-1">
        {chapters.map((chapter, idx) => {
          const hasUnread = chapter.isLiving && chapter.livingEntries?.some(
            e => discoveredSet.has(e.mechanicKey) && !readSet.has(e.mechanicKey)
          );

          return (
            <li key={chapter.id}>
              <button
                onClick={() => onSelectChapter(idx)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/30 transition-colors text-left group",
                  hasUnread && "rok-unread-glow"
                )}
              >
                <span className="text-base">{chapter.icon}</span>
                <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors rok-body-text">
                  {chapter.title}
                </span>
                <div className="flex items-center gap-1">
                  {hasUnread && <Sparkles className="w-3 h-3 text-primary animate-pulse" />}
                  {chapter.isLiving && (
                    <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>
                      living
                    </span>
                  )}
                  <span className="rok-page-number tabular-nums">{idx + 1}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
