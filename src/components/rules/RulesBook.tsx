import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BOOK_CHAPTERS, searchChapters } from '@/lib/rules-book-data';
import { BookOpen, ChevronLeft, ChevronRight, Search, X, Bookmark, BookmarkCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import BookPage from './BookPage';

export default function RulesBook() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 0 = TOC
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

  // Open book on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Save bookmarks
  useEffect(() => {
    localStorage.setItem('rok-rule-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const totalPages = BOOK_CHAPTERS.length + 1; // +1 for TOC

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

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPage();
      else if (e.key === 'ArrowLeft') prevPage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextPage, prevPage]);

  // Touch swipe
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
      flipTo(result.chapterIndex + 1); // +1 because 0 is TOC
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const toggleBookmark = (page: number) => {
    setBookmarks(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

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
        {/* Book cover (back) */}
        <div className="rok-book-back" />

        {/* Book spine shadow */}
        <div className="rok-book-spine" />

        {/* Bookmark tabs on right edge */}
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
                title={bm === 0 ? 'Contents' : BOOK_CHAPTERS[bm - 1]?.title}
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
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Realm of Kings
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              {currentPage > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7"
                  onClick={() => toggleBookmark(currentPage)}
                >
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
              <TableOfContents onSelectChapter={(idx) => flipTo(idx + 1, 'next')} />
            ) : (
              <BookPage chapter={BOOK_CHAPTERS[currentPage - 1]} />
            )}
          </div>

          {/* Page footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
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
              variant="ghost"
              size="sm"
              onClick={nextPage}
              disabled={currentPage >= totalPages - 1 || isFlipping}
              className="text-muted-foreground text-xs gap-1"
            >
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Book cover (front) — animates open */}
        <div className={cn("rok-book-cover", isOpen && "rok-cover-opened")}>
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground text-center leading-tight">
              R.O.K.
            </h1>
            <p className="text-xs text-primary-foreground/60 uppercase tracking-[0.3em]">
              Rules of Combat
            </p>
            <div className="w-12 h-px bg-primary/40 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TableOfContents({ onSelectChapter }: { onSelectChapter: (index: number) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Table of Contents</h2>
        <div className="w-16 h-px bg-primary/40 mx-auto" />
      </div>
      <ol className="space-y-1">
        {BOOK_CHAPTERS.map((chapter, idx) => (
          <li key={chapter.id}>
            <button
              onClick={() => onSelectChapter(idx)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors text-left group"
            >
              <span className="text-base">{chapter.icon}</span>
              <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">
                {chapter.title}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {idx + 1}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
