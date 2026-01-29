import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBattleNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Subscribe to new battles where user is challenged
    const channel = supabase
      .channel('battle-challenges')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battles',
        },
        async (payload) => {
          const newBattle = payload.new as { 
            id: string; 
            challenged_user_id: string | null;
            status: string;
          };

          // Check if this battle is a challenge to the current user
          if (newBattle.challenged_user_id !== user.id) {
            return;
          }

          // Show notification with action button
          toast.info(`⚔️ Battle Challenge!`, {
            description: `An opponent has challenged you!`,
            duration: 10000,
            action: {
              label: 'Respond',
              onClick: () => navigate(`/battles/${newBattle.id}`),
            },
          });

          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);
}
