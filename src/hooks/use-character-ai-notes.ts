import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CharacterAINote {
  id: string;
  character_id: string;
  user_id: string;
  category: 'move_clarification' | 'personality' | 'tactical_behavior';
  scope: 'current_battle' | 'future_battles' | 'global';
  note: string;
  battle_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCharacterAINotes(characterId: string | null) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CharacterAINote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!characterId || !user) return;
    setLoading(true);
    const { data, error } = await fromDecrypted('character_ai_notes')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch AI notes:', error);
    } else {
      setNotes((data as unknown as CharacterAINote[]) || []);
    }
    setLoading(false);
  }, [characterId, user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (
    category: CharacterAINote['category'],
    scope: CharacterAINote['scope'],
    note: string,
    battleId?: string
  ) => {
    if (!characterId || !user) return null;
    const { data, error } = await supabase
      .from('character_ai_notes')
      .insert({
        character_id: characterId,
        user_id: user.id,
        category,
        scope,
        note,
        battle_id: battleId || null,
      })
      .select()
      .single();
    if (error) {
      toast.error('Failed to save character note');
      console.error(error);
      return null;
    }
    setNotes(prev => [data as unknown as CharacterAINote, ...prev]);
    toast.success('Character note saved');
    return data;
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('character_ai_notes')
      .delete()
      .eq('id', noteId);
    if (error) {
      toast.error('Failed to delete note');
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== noteId));
    toast.success('Note deleted');
  };

  const updateNote = async (noteId: string, newNote: string) => {
    const { error } = await supabase
      .from('character_ai_notes')
      .update({ note: newNote, updated_at: new Date().toISOString() })
      .eq('id', noteId);
    if (error) {
      toast.error('Failed to update note');
      return;
    }
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, note: newNote } : n));
    toast.success('Note updated');
  };

  // Build a prompt-ready string of all applicable notes for a given battle context
  const getNotesForBattle = (battleId?: string): string => {
    const applicable = notes.filter(n => {
      if (n.scope === 'current_battle') return n.battle_id === battleId;
      return true; // future_battles and global always apply
    });
    if (applicable.length === 0) return '';

    const grouped = {
      move_clarification: applicable.filter(n => n.category === 'move_clarification'),
      personality: applicable.filter(n => n.category === 'personality'),
      tactical_behavior: applicable.filter(n => n.category === 'tactical_behavior'),
    };

    let prompt = '\n\nCHARACTER AI NOTES (MUST OBEY — creator-defined behavior constraints):';
    if (grouped.move_clarification.length > 0) {
      prompt += '\n\nCAPABILITIES & LIMITATIONS:';
      grouped.move_clarification.forEach((n, i) => { prompt += `\n${i + 1}. ${n.note}`; });
    }
    if (grouped.personality.length > 0) {
      prompt += '\n\nPERSONALITY ADJUSTMENTS:';
      grouped.personality.forEach((n, i) => { prompt += `\n${i + 1}. ${n.note}`; });
    }
    if (grouped.tactical_behavior.length > 0) {
      prompt += '\n\nTACTICAL BEHAVIOR:';
      grouped.tactical_behavior.forEach((n, i) => { prompt += `\n${i + 1}. ${n.note}`; });
    }
    prompt += '\n\nThese notes override default character assumptions. Follow them strictly.';
    return prompt;
  };

  return { notes, loading, addNote, deleteNote, updateNote, getNotesForBattle, refetch: fetchNotes };
}
