import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CharacterSection } from '@/lib/character-3d-types';

interface UseCharacterSectionsReturn {
  sections: CharacterSection[];
  isLoading: boolean;
  isSaving: boolean;
  addSection: (title: string, body: string) => Promise<CharacterSection | null>;
  updateSection: (sectionId: string, updates: Partial<CharacterSection>) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCharacterSections(characterId: string | undefined): UseCharacterSectionsReturn {
  const { user } = useAuth();
  const [sections, setSections] = useState<CharacterSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSections = useCallback(async () => {
    if (!characterId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('character_sections')
        .select('*')
        .eq('character_id', characterId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSections((data || []) as CharacterSection[]);
    } catch (error: any) {
      console.error('Error fetching sections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const addSection = useCallback(async (title: string, body: string): Promise<CharacterSection | null> => {
    if (!user || !characterId) return null;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('character_sections')
        .insert({
          character_id: characterId,
          user_id: user.id,
          title: title.trim(),
          body: body.trim(),
          sort_order: sections.length,
        })
        .select()
        .single();

      if (error) throw error;

      const newSection = data as CharacterSection;
      setSections(prev => [...prev, newSection]);
      toast.success('Section added');
      return newSection;
    } catch (error: any) {
      console.error('Error adding section:', error);
      toast.error('Failed to add section');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, characterId, sections.length]);

  const updateSection = useCallback(async (sectionId: string, updates: Partial<CharacterSection>): Promise<void> => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('character_sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...updates } : s));
      toast.success('Section updated');
    } catch (error: any) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteSection = useCallback(async (sectionId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('character_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      setSections(prev => prev.filter(s => s.id !== sectionId));
      toast.success('Section deleted');
    } catch (error: any) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  }, []);

  const reorderSections = useCallback(async (sectionIds: string[]): Promise<void> => {
    try {
      const updates = sectionIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('character_sections')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      setSections(prev => {
        const sectionMap = new Map(prev.map(s => [s.id, s]));
        return sectionIds.map((id, index) => ({
          ...sectionMap.get(id)!,
          sort_order: index,
        }));
      });
    } catch (error: any) {
      console.error('Error reordering sections:', error);
      toast.error('Failed to reorder sections');
      fetchSections();
    }
  }, [fetchSections]);

  return {
    sections,
    isLoading,
    isSaving,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    refresh: fetchSections,
  };
}
