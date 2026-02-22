import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ActiveBattlefieldEffect,
  detectBattlefieldEffects,
  mergeEffects,
  isEffectActive,
} from '@/lib/battlefield-effects';

interface UseBattlefieldEffectsOptions {
  /** The battle ID – when provided, effects are synced to the database for PvP */
  battleId?: string;
  /** Whether dynamic environment is enabled for this battle */
  enabled?: boolean;
}

/**
 * Serializable representation stored in battles.environment_effects (JSON)
 */
interface SerializedEffect {
  type: string;
  intensity: 'low' | 'medium' | 'high';
  duration: number;
  startTime: number;
  description: string;
}

function serializeEffects(effects: ActiveBattlefieldEffect[]): string {
  const active = effects.filter(isEffectActive);
  const serialized: SerializedEffect[] = active.map(e => ({
    type: e.type,
    intensity: e.intensity,
    duration: e.duration,
    startTime: e.startTime,
    description: e.description,
  }));
  return JSON.stringify(serialized);
}

function deserializeEffects(json: string | null): ActiveBattlefieldEffect[] {
  if (!json) return [];
  try {
    const parsed: SerializedEffect[] = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(e => ({
        type: e.type as ActiveBattlefieldEffect['type'],
        intensity: e.intensity,
        duration: e.duration,
        startTime: e.startTime,
        description: e.description,
      }))
      .filter(isEffectActive);
  } catch {
    return [];
  }
}

/**
 * Hook to manage battlefield visual effects based on battle messages.
 * When a battleId is provided, effects are persisted to the database
 * and synced between both PvP players via realtime.
 */
export function useBattlefieldEffects(options: UseBattlefieldEffectsOptions = {}) {
  const { battleId, enabled = true } = options;
  const [activeEffects, setActiveEffects] = useState<ActiveBattlefieldEffect[]>([]);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedRef = useRef<string>('');

  /**
   * Write current effects to the database (debounced)
   */
  const syncToDatabase = useCallback((effects: ActiveBattlefieldEffect[]) => {
    if (!battleId || !enabled) return;

    // Debounce DB writes to avoid rapid updates
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      const serialized = serializeEffects(effects);
      // Skip if nothing changed
      if (serialized === lastSyncedRef.current) return;
      lastSyncedRef.current = serialized;

      await supabase
        .from('battles')
        .update({ environment_effects: serialized })
        .eq('id', battleId);
    }, 300);
  }, [battleId, enabled]);

  /**
   * Process a new message to detect and add battlefield effects
   */
  const processMessage = useCallback((message: string) => {
    if (!enabled) return;
    const newEffects = detectBattlefieldEffects(message);

    if (newEffects.length > 0) {
      setActiveEffects(current => {
        const merged = mergeEffects(current, newEffects);
        // Sync to DB for PvP
        syncToDatabase(merged);
        return merged;
      });
    }
  }, [enabled, syncToDatabase]);

  /**
   * Hydrate effects from a database value (called on realtime update)
   */
  const hydrateFromDatabase = useCallback((environmentEffects: string | null) => {
    if (!enabled) return;
    const deserialized = deserializeEffects(environmentEffects);
    // Merge remote effects with local, keeping the freshest
    setActiveEffects(current => {
      const localActive = current.filter(isEffectActive);
      // Merge: remote effects take priority for same type
      const merged = mergeEffects(localActive, deserialized);
      return merged;
    });
  }, [enabled]);

  /**
   * Clear all active effects
   */
  const clearEffects = useCallback(() => {
    setActiveEffects([]);
    if (battleId) {
      supabase
        .from('battles')
        .update({ environment_effects: null })
        .eq('id', battleId);
    }
  }, [battleId]);

  /**
   * Manually add an effect
   */
  const addEffect = useCallback((effect: ActiveBattlefieldEffect) => {
    setActiveEffects(current => {
      const merged = mergeEffects(current, [effect]);
      syncToDatabase(merged);
      return merged;
    });
  }, [syncToDatabase]);

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

  // Cleanup sync timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  return {
    activeEffects,
    processMessage,
    clearEffects,
    addEffect,
    hydrateFromDatabase,
  };
}
