import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NpcDialogueInput {
  npcName: string;
  npcRole?: string;
  npcPersonality?: string;
  npcAppearance?: string;
  npcBackstory?: string;
  characterName: string;
  characterLevel?: number;
  characterPersonality?: string;
  playerMessage: string;
  conversationHistory?: { sender: 'player' | 'npc'; content: string }[];
  campaignContext?: string;
  currentZone?: string;
  timeOfDay?: string;
  disposition?: string;
  trustLevel?: number;
}

interface NpcDialogueResult {
  dialogue: string;
  trustDelta: number;
  npcName: string;
}

export function useNpcDialogue() {
  const [loading, setLoading] = useState(false);

  const talkToNpc = useCallback(async (input: NpcDialogueInput): Promise<NpcDialogueResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('npc-dialogue', {
        body: input,
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data as NpcDialogueResult;
    } catch (err) {
      console.error('NPC dialogue error:', err);
      toast.error('Failed to get NPC response');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { talkToNpc, loading };
}
