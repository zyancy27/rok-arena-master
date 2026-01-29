/**
 * Hook for managing character status effects in battles
 * Tracks status effects that affect the user's character and provides them for visual display
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  detectCharacterStatusEffects,
  mergeStatusEffects,
  isStatusEffectActive,
  type CharacterStatusEffect,
} from '@/lib/character-status-effects';

interface UseCharacterStatusEffectsOptions {
  characterName?: string;
  enabled?: boolean;
}

export function useCharacterStatusEffects(options: UseCharacterStatusEffectsOptions = {}) {
  const { characterName, enabled = true } = options;
  const [activeEffects, setActiveEffects] = useState<CharacterStatusEffect[]>([]);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup expired effects periodically
  useEffect(() => {
    if (!enabled) return;

    cleanupIntervalRef.current = setInterval(() => {
      setActiveEffects(current => {
        const stillActive = current.filter(isStatusEffectActive);
        // Only update if something changed
        if (stillActive.length !== current.length) {
          return stillActive;
        }
        return current;
      });
    }, 1000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [enabled]);

  // Process a message to detect status effects affecting the user's character
  const processMessage = useCallback((
    message: string,
    isFromOpponent: boolean = true // Status effects usually come from opponent's actions
  ) => {
    if (!enabled) return;

    // Only process messages from opponents that might affect the user
    // (The opponent's message describes what happens TO the user)
    if (!isFromOpponent) return;

    const newEffects = detectCharacterStatusEffects(message, characterName);
    
    if (newEffects.length > 0) {
      setActiveEffects(current => mergeStatusEffects(current, newEffects));
    }
  }, [characterName, enabled]);

  // Clear all effects (e.g., when battle ends)
  const clearEffects = useCallback(() => {
    setActiveEffects([]);
  }, []);

  // Manually add an effect
  const addEffect = useCallback((effect: CharacterStatusEffect) => {
    setActiveEffects(current => mergeStatusEffects(current, [effect]));
  }, []);

  return {
    activeEffects,
    processMessage,
    clearEffects,
    addEffect,
  };
}
