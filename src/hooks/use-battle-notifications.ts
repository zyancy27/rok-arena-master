import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBattleNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userCharacterIds = useRef<string[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch user's character IDs to check if incoming challenges are for them
    const fetchUserCharacters = async () => {
      const { data } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id);
      
      if (data) {
        userCharacterIds.current = data.map(c => c.id);
      }
    };

    fetchUserCharacters();

    // Subscribe to new battle participants
    const channel = supabase
      .channel('battle-challenges')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_participants',
        },
        async (payload) => {
          const newParticipant = payload.new as { 
            battle_id: string; 
            character_id: string; 
            turn_order: number;
          };

          // Check if this participant is one of the user's characters
          if (!userCharacterIds.current.includes(newParticipant.character_id)) {
            return;
          }

          // Only notify for turn_order 2 (the challenged player)
          if (newParticipant.turn_order !== 2) {
            return;
          }

          // Fetch battle and challenger info
          const { data: battleParticipants } = await supabase
            .from('battle_participants')
            .select('character_id, turn_order')
            .eq('battle_id', newParticipant.battle_id);

          const challengerParticipant = battleParticipants?.find(p => p.turn_order === 1);
          
          if (!challengerParticipant) return;

          // Get challenger character name
          const { data: challengerChar } = await supabase
            .from('characters')
            .select('name')
            .eq('id', challengerParticipant.character_id)
            .maybeSingle();

          // Get the challenged character name
          const { data: myChar } = await supabase
            .from('characters')
            .select('name')
            .eq('id', newParticipant.character_id)
            .maybeSingle();

          const challengerName = challengerChar?.name || 'Someone';
          const myCharName = myChar?.name || 'your character';

          // Show notification with action button
          toast.info(`⚔️ Battle Challenge!`, {
            description: `${challengerName} has challenged ${myCharName} to battle!`,
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => navigate(`/battles/${newParticipant.battle_id}`),
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
