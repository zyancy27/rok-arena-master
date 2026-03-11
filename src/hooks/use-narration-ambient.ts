/**
 * Hook for narration-aware ambient sounds.
 * Connects the NarrationSoundManager to user settings
 * and provides a simple `processNarration(text)` method.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getNarrationSoundManager } from '@/lib/audio/narration-sound-manager';
import type { AmbientIntensityLevel } from '@/lib/audio/narration-sound-rules';
import type { AudioSettings } from '@/lib/settings-defaults';

interface UseNarrationAmbientOptions {
  enabled: boolean;
  audioSettings: AudioSettings;
}

export function useNarrationAmbient(options: UseNarrationAmbientOptions) {
  const managerRef = useRef(getNarrationSoundManager());

  // Sync settings
  useEffect(() => {
    const mgr = managerRef.current;
    const { audioSettings, enabled } = options;
    
    mgr.setEnabled(enabled && audioSettings.narrationAmbientEnabled);
    
    if (audioSettings.narrationAmbientIntensity === 'off' || !audioSettings.narrationAmbientEnabled) {
      mgr.setIntensityLevel('off');
    } else {
      mgr.setIntensityLevel(audioSettings.narrationAmbientIntensity as AmbientIntensityLevel);
    }

    mgr.setMasterVolume(audioSettings.narrationAmbientVolume * audioSettings.masterVolume);
    mgr.setReduceVocalSounds(audioSettings.narrationReduceVocalSounds);
  }, [
    options.enabled,
    options.audioSettings.narrationAmbientEnabled,
    options.audioSettings.narrationAmbientIntensity,
    options.audioSettings.narrationAmbientVolume,
    options.audioSettings.masterVolume,
    options.audioSettings.narrationReduceVocalSounds,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      managerRef.current.stopAll();
    };
  }, []);

  const processNarration = useCallback((text: string) => {
    managerRef.current.processNarration(text);
  }, []);

  const onSceneChange = useCallback(() => {
    managerRef.current.onSceneChange();
  }, []);

  const setNarratorSpeaking = useCallback((speaking: boolean) => {
    managerRef.current.setNarratorSpeaking(speaking);
  }, []);

  return { processNarration, onSceneChange, setNarratorSpeaking };
}
