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
  const [currentPage, setCurrentPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('rok-rule-bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const touchStartX = useRef(0);
  const bookRef = useRef<HTMLDivElement>(null);

  const chapters = useMemo(() => buildBookChapters(), []);
  const unreadCount = useMemo(() => getUnreadCount(), []);

  // Mark living chapter entries as read when viewed
  useEffect(() => {
    if (currentPage > 0) {
      const chapter = chapters[currentPage - 1];
      if (chapter?.isLiving && chapter.livingEntries) {
        chapter.livingEntries.forEach(e => markRead(e.mechanicKey));
      }
    }
  }, [currentPage, chapters]);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('rok-rule-bookmarks', JSON.stringify(bookmarks));
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
      if (searchOpen) return;
      if (e.key === 'ArrowRight') nextPage();
      else if (e.key === 'ArrowLeft') prevPage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextPage, prevPage, searchOpen]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextPage();
      else prevPage();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const result = searchChapters(searchQuery);
    if (result) {
      flipTo(result.chapterIndex + 1);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const toggleBookmark = (page: number) => {
    setBookmarks(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  const handleCrossRef = useCallback((mechanicKey: string) => {
    // Find the chapter containing this mechanic
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (ch.livingEntries?.some(e => e.mechanicKey === mechanicKey)) {
        flipTo(i + 1);
        return;
      }
    }
  }, [chapters, flipTo]);

  const isBookmarked = bookmarks.includes(currentPage);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Book container */}
      <div
        ref={bookRef}
        className={cn(
          "rok-book-container relative select-none",
          isOpen ? "rok-book-open" : "rok-book-closed"
        )}
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
                  bm === currentPage
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/40 text-primary-foreground/70 hover:bg-primary/60"
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
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Realm of Kings
              </span>
              {unreadCount > 0 && currentPage === 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-primary animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" />
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setSearchOpen(true)}>
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
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
              <TableOfContents
                chapters={chapters}
                onSelectChapter={(idx) => flipTo(idx + 1, 'next')}
              />
            ) : (
              <BookPage
                chapter={chapters[currentPage - 1]}
                onCrossRefClick={handleCrossRef}
              />
            )}
          </div>

          {/* Page footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/30">
            <Button
              variant="ghost" size="sm"
              onClick={prevPage}
              disabled={currentPage === 0 || isFlipping}
              className="text-muted-foreground text-xs gap-1"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {currentPage === 0 ? 'Contents' : `${currentPage} / ${totalPages - 1}`}
            </span>
            <Button
              variant="ghost" size="sm"
              onClick={nextPage}
              disabled={currentPage >= totalPages - 1 || isFlipping}
              className="text-muted-foreground text-xs gap-1"
            >
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Book cover */}
        <div className={cn("rok-book-cover", isOpen && "rok-cover-opened")}>
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground text-center leading-tight">
              R.O.K.
            </h1>
            <p className="text-xs text-primary-foreground/60 uppercase tracking-[0.3em]">
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
        <h2 className="text-xl font-bold text-foreground">Table of Contents</h2>
        <p className="text-[10px] text-muted-foreground italic">A living record of the arena's mechanics</p>
        <div className="w-16 h-px bg-primary/40 mx-auto" />
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
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors text-left group",
                  hasUnread && "rok-unread-glow"
                )}
              >
                <span className="text-base">{chapter.icon}</span>
                <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">
                  {chapter.title}
                </span>
                <div className="flex items-center gap-1">
                  {hasUnread && <Sparkles className="w-3 h-3 text-primary animate-pulse" />}
                  {chapter.isLiving && (
                    <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">
                      living
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground tabular-nums">{idx + 1}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
