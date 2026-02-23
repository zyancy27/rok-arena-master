import { useEffect, useRef, useCallback, useState } from 'react';
import { getBattleSfxEngine, detectSfxEvents, type SfxEventType } from '@/lib/battle-sfx';

interface UseBattleSfxOptions {
  enabled?: boolean;
}

/**
 * Hook that exposes the battle SFX engine for React components.
 * Preloads sounds on mount, processes text, and provides mute control.
 */
export function useBattleSfx(options: UseBattleSfxOptions = {}) {
  const { enabled = true } = options;
  const engineRef = useRef(getBattleSfxEngine());
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('battle-sfx-muted') === 'true';
    } catch {
      return false;
    }
  });

  // Preload on mount
  useEffect(() => {
    if (enabled) {
      engineRef.current.preload();
    }
  }, [enabled]);

  // Sync mute state
  useEffect(() => {
    engineRef.current.setMuted(muted || !enabled);
    try {
      localStorage.setItem('battle-sfx-muted', String(muted));
    } catch { /* noop */ }
  }, [muted, enabled]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const playEvent = useCallback((event: SfxEventType) => {
    if (!enabled) return;
    engineRef.current.playEvent(event);
  }, [enabled]);

  const processText = useCallback((text: string) => {
    if (!enabled) return;
    engineRef.current.processText(text);
  }, [enabled]);

  return {
    muted,
    toggleMute,
    playEvent,
    processText,
  };
}
