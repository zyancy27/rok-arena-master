/**
 * Hook — Character Discovery Sync
 *
 * Watches for narrative discoveries and persists them
 * to the character's database record in the appropriate fields.
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { toast } from 'sonner';
import {
  createDiscoverySyncState,
  discoverFromPressureResponse,
  discoverFromSignaturePattern,
  discoverFromMoment,
  discoverFromDialogue,
  getPendingDiscoveries,
  buildFieldUpdates,
  markSynced,
  type DiscoverySyncState,
  type DiscoverableField,
  type CharacterDiscovery,
} from '@/engine/narrativeWorld/characterDiscoverySync';
import type {
  NarrativePressureType,
  CharacterSignatureProfile,
  DiscoveryMoment,
} from '@/engine/narrativeWorld/types';

export function useCharacterDiscoverySync() {
  const stateRef = useRef<DiscoverySyncState>(createDiscoverySyncState());

  /** Sync all pending discoveries for a character to the database */
  const syncToDatabase = useCallback(async (characterId: string) => {
    const pending = getPendingDiscoveries(stateRef.current, characterId);
    const hasAny = Object.values(pending).some(arr => arr.length > 0);
    if (!hasAny) return;

    // Fetch current character fields from the decrypted view so we
    // append to plaintext, not to ENC: ciphertext (which would corrupt
    // existing content when the encrypt trigger re-encrypts on update).
    const { data: character, error: fetchError } = await fromDecrypted('characters')
      .select('personality, mentality, lore, abilities, powers, weapons_items')
      .eq('id', characterId)
      .maybeSingle();

    if (fetchError || !character) return;

    const currentFields: Partial<Record<DiscoverableField, string | null>> = {
      personality: character.personality,
      mentality: character.mentality,
      lore: character.lore,
      abilities: character.abilities,
      powers: character.powers,
      weapons_items: character.weapons_items,
    };

    const updates = buildFieldUpdates(pending, currentFields);
    if (Object.keys(updates).length === 0) return;

    const { error: updateError } = await supabase
      .from('characters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', characterId);

    if (updateError) {
      console.error('Failed to sync character discoveries:', updateError);
      return;
    }

    // Mark all synced
    const syncedIds = Object.values(pending).flat().map(d => d.id);
    stateRef.current = markSynced(stateRef.current, syncedIds);

    const fieldNames = Object.keys(updates).join(', ');
    toast.success('Character sheet updated', {
      description: `New discoveries added to: ${fieldNames}`,
    });
  }, []);

  /** Record a pressure response discovery */
  const recordPressureDiscovery = useCallback((
    characterId: string,
    pressureType: NarrativePressureType,
    playerResponse: string,
    context: string,
  ) => {
    const result = discoverFromPressureResponse(
      stateRef.current, characterId, pressureType, playerResponse, context,
    );
    stateRef.current = result.state;
    return result.discovery;
  }, []);

  /** Record a behavioral pattern discovery */
  const recordPatternDiscovery = useCallback((
    profile: CharacterSignatureProfile,
  ) => {
    const result = discoverFromSignaturePattern(stateRef.current, profile);
    if (!result) return null;
    stateRef.current = result.state;
    return result.discovery;
  }, []);

  /** Record a discovery moment */
  const recordMomentDiscovery = useCallback((
    characterId: string,
    moment: DiscoveryMoment,
  ) => {
    const result = discoverFromMoment(stateRef.current, characterId, moment);
    stateRef.current = result.state;
    return result.discovery;
  }, []);

  /** Record a dialogue discovery */
  const recordDialogueDiscovery = useCallback((
    characterId: string,
    playerText: string,
    zoneContext: string,
  ) => {
    const result = discoverFromDialogue(
      stateRef.current, characterId, playerText, zoneContext,
    );
    if (!result) return null;
    stateRef.current = result.state;
    return result.discovery;
  }, []);

  return {
    syncToDatabase,
    recordPressureDiscovery,
    recordPatternDiscovery,
    recordMomentDiscovery,
    recordDialogueDiscovery,
    getPending: (characterId: string) =>
      getPendingDiscoveries(stateRef.current, characterId),
  };
}
