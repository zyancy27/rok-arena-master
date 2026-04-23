import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StorageTierKey, getTierLimits } from '@/lib/subscription-tiers';

interface SubscriptionState {
  storageTier: StorageTierKey;
  aiSubscriptionActive: boolean;
  aiSubscriptionExpires: string | null;
  founderStatus: boolean;
  founderReserved: boolean;
  founderConfirmedAt: string | null;
  activeDaysCount: number;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    storageTier: 'free',
    aiSubscriptionActive: false,
    aiSubscriptionExpires: null,
    founderStatus: false,
    founderReserved: false,
    founderConfirmedAt: null,
    activeDaysCount: 0,
    loading: true,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setState({
        storageTier: (data.storage_tier as StorageTierKey) || 'free',
        aiSubscriptionActive: data.ai_subscription_active || false,
        aiSubscriptionExpires: data.ai_subscription_expires || null,
        founderStatus: data.founder_status || false,
        founderReserved: (data as any).founder_reserved || false,
        founderConfirmedAt: (data as any).founder_confirmed_at || null,
        activeDaysCount: (data as any).active_days_count || 0,
        loading: false,
      });
    } else {
      setState(s => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasAIAccess = state.founderStatus || state.aiSubscriptionActive;
  const limits = getTierLimits(state.storageTier);

  const canCreateCharacter = async (): Promise<boolean> => {
    if (state.founderStatus || state.storageTier === 'worldbuilder') return true;
    
    const { count } = await supabase
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id);

    return (count || 0) < limits.maxCharacters;
  };

  const canCreateWorld = async (): Promise<boolean> => {
    if (state.founderStatus || state.storageTier === 'worldbuilder') return true;

    const { count } = await supabase
      .from('solar_systems')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id);

    return (count || 0) < limits.maxWorlds;
  };

  return {
    ...state,
    hasAIAccess,
    limits,
    canCreateCharacter,
    canCreateWorld,
    refresh: fetchSubscription,
  };
}
