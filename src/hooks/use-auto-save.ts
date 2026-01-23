import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  compareData?: (a: T, b: T) => boolean;
}

interface UseAutoSaveReturn<T> {
  isSaving: boolean;
  lastSaved: Date | null;
  canUndo: boolean;
  undo: () => void;
  saveNow: () => Promise<void>;
  previousData: T | null;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
  compareData = (a, b) => JSON.stringify(a) === JSON.stringify(b),
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previousData, setPreviousData] = useState<T | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<T | null>(null);
  const isFirstRender = useRef(true);

  const saveData = useCallback(async (dataToSave: T) => {
    if (!enabled) return;
    
    // Don't save if data hasn't changed from last save
    if (lastSavedDataRef.current && compareData(dataToSave, lastSavedDataRef.current)) {
      return;
    }

    setIsSaving(true);
    try {
      // Store the previous data before saving for undo
      if (lastSavedDataRef.current) {
        setPreviousData(lastSavedDataRef.current);
        setCanUndo(true);
      }
      
      await onSave(dataToSave);
      lastSavedDataRef.current = dataToSave;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Auto-save failed');
    } finally {
      setIsSaving(false);
    }
  }, [enabled, onSave, compareData]);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await saveData(data);
  }, [data, saveData]);

  const undo = useCallback(async () => {
    if (!previousData || !canUndo) return;
    
    setIsSaving(true);
    try {
      await onSave(previousData);
      lastSavedDataRef.current = previousData;
      setPreviousData(null);
      setCanUndo(false);
      setLastSaved(new Date());
      toast.success('Changes undone');
    } catch (error) {
      console.error('Undo failed:', error);
      toast.error('Failed to undo changes');
    } finally {
      setIsSaving(false);
    }
  }, [previousData, canUndo, onSave]);

  // Auto-save effect with debouncing
  useEffect(() => {
    // Skip the first render to avoid saving initial data
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastSavedDataRef.current = data;
      return;
    }

    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      saveData(data);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, enabled, saveData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    canUndo,
    undo,
    saveNow,
    previousData,
  };
}
