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

    const channel = supabase
      .channel('global-notifications')
      // Battle challenges
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

          if (newBattle.challenged_user_id !== user.id) return;

          const { data: participants } = await supabase
            .from('battle_participants')
            .select(`character_id, turn_order, character:characters(name, user_id)`)
            .eq('battle_id', newBattle.id)
            .eq('turn_order', 1);

          const challengerParticipant = participants?.[0];
          if (!challengerParticipant) return;

          const challengerChar = Array.isArray(challengerParticipant.character)
            ? challengerParticipant.character[0]
            : challengerParticipant.character;

          const { data: challengerProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', challengerChar?.user_id)
            .maybeSingle();

          const challengerName = challengerProfile?.username || 'Someone';
          const characterName = challengerChar?.name || 'their character';

          toast.info(`⚔️ Battle Challenge!`, {
            description: `${challengerName} has challenged you with ${characterName}!`,
            duration: 10000,
            action: {
              label: 'Respond',
              onClick: () => navigate(`/battles/${newBattle.id}`),
            },
          });

          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      // Battle invitations
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_invitations',
        },
        async (payload) => {
          const invitation = payload.new as {
            id: string;
            battle_id: string;
            user_id: string;
            status: string;
          };

          if (invitation.user_id !== user.id) return;

          const { data: battleData } = await supabase
            .from('battles')
            .select('id, battle_mode, chosen_location')
            .eq('id', invitation.battle_id)
            .maybeSingle();

          if (!battleData) return;

          const { data: hostParticipant } = await supabase
            .from('battle_participants')
            .select('character:characters(name, user_id)')
            .eq('battle_id', invitation.battle_id)
            .eq('turn_order', 1)
            .maybeSingle();

          const hostChar = hostParticipant?.character;
          const hostCharData = Array.isArray(hostChar) ? hostChar[0] : hostChar;

          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', hostCharData?.user_id)
            .maybeSingle();

          const hostName = hostProfile?.username || 'Someone';
          const location = battleData.chosen_location || 'an unknown location';

          toast.info(`⚔️ Group Battle Invite!`, {
            description: `${hostName} invited you to a group battle at ${location}!`,
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => navigate(`/battles/${invitation.battle_id}`),
            },
          });

          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      // Campaign join requests (notify the campaign creator)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_join_requests',
        },
        async (payload) => {
          const request = payload.new as {
            id: string;
            campaign_id: string;
            user_id: string;
            character_id: string;
            status: string;
          };

          // Don't notify yourself
          if (request.user_id === user.id) return;

          // Check if current user is the campaign creator
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('id, name, creator_id')
            .eq('id', request.campaign_id)
            .maybeSingle();

          if (!campaign || campaign.creator_id !== user.id) return;

          // Get requester info
          const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('id', request.user_id)
            .maybeSingle();

          const { data: character } = await supabase
            .from('characters')
            .select('name')
            .eq('id', request.character_id)
            .maybeSingle();

          const requesterName = requesterProfile?.display_name || requesterProfile?.username || 'Someone';
          const charName = character?.name || 'a character';

          toast.info(`📜 Campaign Join Request!`, {
            description: `${requesterName} wants to join "${campaign.name}" with ${charName}`,
            duration: 10000,
            action: {
              label: 'Review',
              onClick: () => navigate(`/campaigns/${campaign.id}`),
            },
          });

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
