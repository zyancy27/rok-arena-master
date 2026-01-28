import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CharacterGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  character_id: string;
}

export function useCharacterGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CharacterGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGroups();
    } else {
      setGroups([]);
      setLoading(false);
    }
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('character_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } else {
      setGroups(data || []);
    }
    setLoading(false);
  };

  const createGroup = async (name: string, description?: string, color?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('character_groups')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        color: color || '#8B5CF6',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
      return null;
    }

    setGroups(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success('Group created');
    return data;
  };

  const updateGroup = async (id: string, updates: Partial<Pick<CharacterGroup, 'name' | 'description' | 'color'>>) => {
    const { error } = await supabase
      .from('character_groups')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
      return false;
    }

    setGroups(prev => 
      prev.map(g => g.id === id ? { ...g, ...updates } : g)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    toast.success('Group updated');
    return true;
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase
      .from('character_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
      return false;
    }

    setGroups(prev => prev.filter(g => g.id !== id));
    toast.success('Group deleted');
    return true;
  };

  return {
    groups,
    loading,
    createGroup,
    updateGroup,
    deleteGroup,
    refreshGroups: fetchGroups,
  };
}

export function useCharacterGroupMemberships(characterId: string) {
  const [memberships, setMemberships] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (characterId) {
      fetchMemberships();
    }
  }, [characterId]);

  const fetchMemberships = async () => {
    const { data, error } = await supabase
      .from('character_group_members')
      .select('group_id')
      .eq('character_id', characterId);

    if (error) {
      console.error('Error fetching memberships:', error);
    } else {
      setMemberships(data?.map(m => m.group_id) || []);
    }
    setLoading(false);
  };

  const addToGroup = async (groupId: string) => {
    const { error } = await supabase
      .from('character_group_members')
      .insert({
        group_id: groupId,
        character_id: characterId,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Character is already in this group');
      } else {
        console.error('Error adding to group:', error);
        toast.error('Failed to add to group');
      }
      return false;
    }

    setMemberships(prev => [...prev, groupId]);
    toast.success('Added to group');
    return true;
  };

  const removeFromGroup = async (groupId: string) => {
    const { error } = await supabase
      .from('character_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('character_id', characterId);

    if (error) {
      console.error('Error removing from group:', error);
      toast.error('Failed to remove from group');
      return false;
    }

    setMemberships(prev => prev.filter(id => id !== groupId));
    toast.success('Removed from group');
    return true;
  };

  return {
    memberships,
    loading,
    addToGroup,
    removeFromGroup,
    refreshMemberships: fetchMemberships,
  };
}
