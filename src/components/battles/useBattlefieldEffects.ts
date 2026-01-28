import { useState, useCallback, useEffect } from 'react';
import {
  ActiveBattlefieldEffect,
  detectBattlefieldEffects,
  mergeEffects,
  isEffectActive,
} from '@/lib/battlefield-effects';

/**
 * Hook to manage battlefield visual effects based on battle messages
 */
export function useBattlefieldEffects() {
  const [activeEffects, setActiveEffects] = useState<ActiveBattlefieldEffect[]>([]);
  
  /**
   * Process a new message to detect and add battlefield effects
   */
  const processMessage = useCallback((message: string) => {
    const newEffects = detectBattlefieldEffects(message);
    
    if (newEffects.length > 0) {
      setActiveEffects(current => mergeEffects(current, newEffects));
    }
  }, []);
  
  /**
   * Clear all active effects
   */
  const clearEffects = useCallback(() => {
    setActiveEffects([]);
  }, []);
  
  /**
   * Manually add an effect
   */
  const addEffect = useCallback((effect: ActiveBattlefieldEffect) => {
    setActiveEffects(current => mergeEffects(current, [effect]));
  }, []);
  
  // Periodically clean up expired effects
  useEffect(() => {
    if (activeEffects.length === 0) return;
    
    const cleanup = setInterval(() => {
      setActiveEffects(current => {
        const filtered = current.filter(isEffectActive);
        if (filtered.length !== current.length) {
          return filtered;
        }
        return current;
      });
    }, 2000);
    
    return () => clearInterval(cleanup);
  }, [activeEffects.length]);
  
  return {
    activeEffects,
    processMessage,
    clearEffects,
    addEffect,
  };
}
