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

          // Get the challenger info
          const { data: participants } = await supabase
            .from('battle_participants')
            .select(`
              character_id, 
              turn_order,
              character:characters(name, user_id)
            `)
            .eq('battle_id', newBattle.id)
            .eq('turn_order', 1);

          const challengerParticipant = participants?.[0];
          if (!challengerParticipant) return;

          const challengerChar = Array.isArray(challengerParticipant.character) 
            ? challengerParticipant.character[0] 
            : challengerParticipant.character;

          // Get challenger username
          const { data: challengerProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', challengerChar?.user_id)
            .maybeSingle();

          const challengerName = challengerProfile?.username || 'Someone';
          const characterName = challengerChar?.name || 'their character';

          // Show notification with action button
          toast.info(`⚔️ Battle Challenge!`, {
            description: `${challengerName} has challenged you with ${characterName}!`,
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
