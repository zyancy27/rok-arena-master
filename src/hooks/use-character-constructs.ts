import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { useAuth } from '@/contexts/AuthContext';
import type { ConstructRules, ConstructCategory } from '@/lib/battle-dice';

export interface SavedConstruct {
  id: string;
  character_id: string;
  name: string;
  construct_type: ConstructCategory;
  persistence: string;
  durability_level: string;
  durability_numeric: number | null;
  behavior_summary: string | null;
  limitations: string | null;
}

export function useCharacterConstructs(characterId?: string) {
  const { user } = useAuth();

  const fetchSavedConstructs = useCallback(async (): Promise<SavedConstruct[]> => {
    if (!user || !characterId) return [];
    const { data, error } = await fromDecrypted('character_constructs')
      .select('*')
      .eq('character_id', characterId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error fetching constructs:', error);
      return [];
    }
    return (data ?? []) as unknown as SavedConstruct[];
  }, [user, characterId]);

  const saveConstruct = useCallback(async (
    name: string,
    type: ConstructCategory,
    rules: ConstructRules
  ): Promise<string | null> => {
    if (!user || !characterId) return null;
    const { data, error } = await supabase
      .from('character_constructs')
      .insert({
        character_id: characterId,
        user_id: user.id,
        name,
        construct_type: type,
        persistence: rules.persistence,
        durability_level: rules.durabilityLevel,
        behavior_summary: rules.behaviorSummary,
        limitations: rules.limitations ?? null,
      })
      .select('id')
      .single();
    if (error) {
      console.error('Error saving construct:', error);
      return null;
    }
    return data?.id ?? null;
  }, [user, characterId]);

  const findSavedConstruct = useCallback(async (name: string): Promise<SavedConstruct | null> => {
    if (!user || !characterId) return null;
    const { data } = await fromDecrypted('character_constructs')
      .select('*')
      .eq('character_id', characterId)
      .eq('user_id', user.id)
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    return (data as unknown as SavedConstruct) ?? null;
  }, [user, characterId]);

  return { fetchSavedConstructs, saveConstruct, findSavedConstruct };
}
