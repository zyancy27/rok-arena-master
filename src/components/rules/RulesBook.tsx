import React, { useState, useMemo, useCallback } from 'react';
import { buildBookChapters, searchChapters } from '@/lib/rules-book-data';
import { getUnreadCount, markRead } from '@/lib/living-rulebook-registry';
import { BookOpen, ChevronLeft, ChevronRight, Search, X, Sparkles, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import BookPage from './BookPage';

/**
 * Rules display.
 *
 * NOTE: Previously this rendered an elaborate 3D "physical book" with cover
 * animations, page-flip transforms, and parchment textures. That visual
 * was breaking on multiple browsers — the right-hand page was rendering
 * blank, leaving the entire /rules page empty for users.
 *
 * This version renders the same chapter data in a clean, readable, themed
 * layout that always shows content. The standard rules are guaranteed to
 * appear on first load.
 */
export default function RulesBook() {
  const chapters = useMemo(() => buildBookChapters(), []);
  const unreadCount = useMemo(() => getUnreadCount(), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  // Mark living-chapter entries as read when viewed
  React.useEffect(() => {
    const chapter = chapters[activeIndex];
    if (chapter?.isLiving && chapter.livingEntries) {
      chapter.livingEntries.forEach(e => markRead(e.mechanicKey));
    }
  }, [activeIndex, chapters]);

  const activeChapter = chapters[activeIndex];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const result = searchChapters(searchQuery);
    if (result) {
      setActiveIndex(result.chapterIndex);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleCrossRef = useCallback((mechanicKey: string) => {
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (ch.livingEntries?.some(e => e.mechanicKey === mechanicKey)) {
        setActiveIndex(i);
        return;
      }
    }
  }, [chapters]);

  const goPrev = () => setActiveIndex(i => Math.max(0, i - 1));
  const goNext = () => setActiveIndex(i => Math.min(chapters.length - 1, i + 1));

  const tocList = (
    <ol className="space-y-0.5">
      {chapters.map((chapter, idx) => (
        <li key={chapter.id}>
          <button
            onClick={() => { setActiveIndex(idx); setTocOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors group",
              idx === activeIndex
                ? "bg-primary/15 text-primary border border-primary/30"
                : "hover:bg-muted/40 text-foreground border border-transparent"
            )}
          >
            <span className="text-base shrink-0">{chapter.icon}</span>
            <span className="flex-1 truncate">{chapter.title}</span>
            {chapter.isLiving && (
              <span className="text-[8px] text-muted-foreground/70 uppercase tracking-wider shrink-0">
                living
              </span>
            )}
            {chapter.hasUnread && (
              <Sparkles className="w-3 h-3 text-primary animate-pulse shrink-0" />
            )}
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
      {/* Header */}
      <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">R.O.K. Living Rulebook</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.25em] truncate">
              Original Character Role Play
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-primary px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-3 h-3" />
              {unreadCount} new
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(o => !o)}
            className="gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>
      </header>

      {/* Search bar */}
      {searchOpen && (
        <form onSubmit={handleSearch} className="relative mb-4">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search rules… (e.g. charge attack, perception)"
            autoFocus
            className="pr-10"
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
      )}

      {/* Mobile TOC trigger */}
      <div className="lg:hidden mb-3">
        <Sheet open={tocOpen} onOpenChange={setTocOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <Menu className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {activeChapter ? `${activeChapter.icon} ${activeChapter.title}` : 'Contents'}
                </span>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {activeIndex + 1}/{chapters.length}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-4 overflow-y-auto">
            <SheetHeader className="mb-3">
              <SheetTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Contents
              </SheetTitle>
            </SheetHeader>
            {tocList}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-6">
        {/* Sidebar — Table of Contents (desktop) */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-3 max-h-[70vh] overflow-y-auto">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Contents
            </h2>
            {tocList}
          </div>
        </aside>

        {/* Chapter content */}
        <main className="min-w-0">
          <article className="rounded-lg border border-border bg-card/30 backdrop-blur-sm p-4 sm:p-7">
            {activeChapter ? (
              <BookPage chapter={activeChapter} onCrossRefClick={handleCrossRef} />
            ) : (
              <p className="text-sm text-muted-foreground italic">No chapter selected.</p>
            )}
          </article>

          {/* Pager */}
          <nav className="mt-4 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={activeIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Previous</span>
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {activeIndex + 1} / {chapters.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goNext}
              disabled={activeIndex >= chapters.length - 1}
              className="gap-1"
            >
              <span className="hidden xs:inline sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </nav>
        </main>
      </div>
    </div>
  );
}
