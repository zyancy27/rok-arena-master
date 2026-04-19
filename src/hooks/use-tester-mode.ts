/**
 * useTesterMode
 * ─────────────────────────────────────────────────────────────────────
 * Detects if the current user is a flagged tester profile and exposes a
 * session-scoped conversation mode (campaign | analysis).
 *
 * Mode is in-memory only — switching campaign/analysis should never
 * persist beyond the current tab session.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConversationMode = 'campaign' | 'analysis';

interface UseTesterModeResult {
  isTester: boolean;
  loading: boolean;
  conversationMode: ConversationMode;
  setConversationMode: (mode: ConversationMode) => void;
  toggleMode: () => void;
}

export function useTesterMode(userId: string | null | undefined): UseTesterModeResult {
  const [isTester, setIsTester] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationMode, setConversationMode] = useState<ConversationMode>('campaign');

  useEffect(() => {
    let active = true;
    if (!userId) {
      setIsTester(false);
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('tester_profiles')
        .select('is_tester')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.warn('[TesterMode] lookup failed:', error.message);
      }
      setIsTester(Boolean(data?.is_tester));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const toggleMode = useCallback(() => {
    setConversationMode((prev) => (prev === 'campaign' ? 'analysis' : 'campaign'));
  }, []);

  return { isTester, loading, conversationMode, setConversationMode, toggleMode };
}
