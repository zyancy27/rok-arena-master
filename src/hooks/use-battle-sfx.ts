import { useEffect, useRef, useCallback, useState } from 'react';
import { getBattleSfxEngine, detectSfxEvents, type SfxEventType } from '@/lib/battle-sfx';

interface UseBattleSfxOptions {
  enabled?: boolean;
}

/**
 * Hook that exposes the battle SFX engine for React components.
 * Automatically unlocks AudioContext on first user interaction.
 */
export function useBattleSfx(options: UseBattleSfxOptions = {}) {
  const { enabled = true } = options;
  const engineRef = useRef(getBattleSfxEngine());
  const unlockAttempted = useRef(false);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('battle-sfx-muted') === 'true';
    } catch {
      return false;
    }
  });

  // Unlock AudioContext on any user interaction (click/tap/keydown)
  useEffect(() => {
    if (!enabled || unlockAttempted.current) return;

    const handleInteraction = () => {
      if (!unlockAttempted.current) {
        unlockAttempted.current = true;
        engineRef.current.unlock().then(() => {
          console.log('[SFX Hook] Audio unlocked via user interaction');
        });
      }
      // Remove after first successful unlock
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [enabled]);

  // Preload on mount when enabled
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
    // Also unlock on mute toggle (it's a user gesture)
    engineRef.current.unlock();
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
