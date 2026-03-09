/**
 * Shared book engine hook — manages page state, navigation, bookmarks,
 * sound effects, and last-page persistence for all book UIs.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBookEngineOptions {
  storageKey: string;
  totalPages: number;
  /** Enable page-flip SFX (default true) */
  sfxEnabled?: boolean;
}

const PAGE_FLIP_DURATION = 800;

// Lightweight page-flip sound via Web Audio API
let audioCtx: AudioContext | null = null;
function playPageFlipSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
  } catch {
    // Silently fail if audio not available
  }
}

export function useBookEngine({ storageKey, totalPages, sfxEnabled = true }: UseBookEngineOptions) {
  const [currentSpread, setCurrentSpread] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}-lastpage`);
      return saved ? Math.max(0, parseInt(saved, 10)) : 0;
    } catch { return 0; }
  });
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}-bookmarks`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const touchStartX = useRef(0);

  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem(`${storageKey}-bookmarks`, JSON.stringify(bookmarks));
  }, [bookmarks, storageKey]);

  // Persist last page
  useEffect(() => {
    localStorage.setItem(`${storageKey}-lastpage`, String(currentSpread));
  }, [currentSpread, storageKey]);

  const flipTo = useCallback((page: number, direction?: 'next' | 'prev') => {
    if (isFlipping || page < 0 || page >= totalPages) return;
    const dir = direction || (page > currentSpread ? 'next' : 'prev');
    setFlipDirection(dir);
    setIsFlipping(true);
    if (sfxEnabled) playPageFlipSound();
    setTimeout(() => {
      setCurrentSpread(page);
      setIsFlipping(false);
      setFlipDirection(null);
    }, PAGE_FLIP_DURATION);
  }, [currentSpread, isFlipping, totalPages, sfxEnabled]);

  const nextPage = useCallback(() => {
    if (currentSpread < totalPages - 1) flipTo(currentSpread + 1, 'next');
  }, [currentSpread, totalPages, flipTo]);

  const prevPage = useCallback(() => {
    if (currentSpread > 0) flipTo(currentSpread - 1, 'prev');
  }, [currentSpread, flipTo]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPage();
      else if (e.key === 'ArrowLeft') prevPage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextPage, prevPage]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? nextPage() : prevPage(); }
  };

  const toggleBookmark = (page: number) => {
    setBookmarks(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  };

  const isBookmarked = bookmarks.includes(currentSpread);

  return {
    currentSpread,
    flipDirection,
    isFlipping,
    bookmarks,
    isBookmarked,
    flipTo,
    nextPage,
    prevPage,
    onTouchStart,
    onTouchEnd,
    toggleBookmark,
  };
}
