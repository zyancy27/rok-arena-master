import { useEffect, useRef, useCallback, useState } from 'react';
import { getAmbientSoundEngine } from '@/lib/ambient-sound-engine';
import { analyzeLocation, type EnvironmentTag } from '@/lib/theme-engine';

interface UseAmbientSoundOptions {
  enabled?: boolean;
  location?: string | null;
  tags?: EnvironmentTag[];
}

/**
 * Hook for ambient environment sounds.
 * Automatically transitions soundscapes when the environment changes.
 */
export function useAmbientSound(options: UseAmbientSoundOptions = {}) {
  const { enabled = true, location, tags } = options;
  const engineRef = useRef(getAmbientSoundEngine());
  const unlockAttempted = useRef(false);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('ambient-sound-muted') === 'true';
    } catch { return false; }
  });

  // Unlock on first interaction
  useEffect(() => {
    if (!enabled || unlockAttempted.current) return;
    const handler = () => {
      if (!unlockAttempted.current) {
        unlockAttempted.current = true;
        engineRef.current.unlock();
      }
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [enabled]);

  // Sync mute and fully stop active ambient layers when disabled/muted
  useEffect(() => {
    const shouldMute = muted || !enabled;
    engineRef.current.setMuted(shouldMute);
    try { localStorage.setItem('ambient-sound-muted', String(muted)); } catch {}

    if (shouldMute) {
      void engineRef.current.stop();
    }
  }, [muted, enabled]);

  // Update environment when location/tags change
  useEffect(() => {
    if (!enabled || muted) return;
    const envTags = tags?.length ? tags : analyzeLocation(location);
    void engineRef.current.setEnvironment(envTags);
  }, [location, tags, enabled, muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { engineRef.current.stop(); };
  }, []);

  const toggleMute = useCallback(() => {
    engineRef.current.unlock();
    setMuted(prev => !prev);
  }, []);

  return { muted, toggleMute };
}
