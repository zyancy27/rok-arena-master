import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, GripVertical, Save, Loader2, FileText } from 'lucide-react';
import type { CharacterSection } from '@/lib/character-3d-types';

interface SectionsEditorProps {
  characterId: string;
  readOnly?: boolean;
}

export default function SectionsEditor({ characterId, readOnly = false }: SectionsEditorProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<CharacterSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState({ title: '', body: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchSections = useCallback(async () => {
    if (!characterId) return;

    try {
      const { data, error } = await fromDecrypted('character_sections')
        .select('*')
        .eq('character_id', characterId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSections((data || []) as CharacterSection[]);
    } catch (error: any) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleAddSection = async () => {
    if (!user || !newSection.title.trim()) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('character_sections')
        .insert({
          character_id: characterId,
          user_id: user.id,
          title: newSection.title.trim(),
          body: newSection.body.trim(),
          sort_order: sections.length,
        })
        .select()
        .single();

      if (error) throw error;

      setSections(prev => [...prev, data as CharacterSection]);
      setNewSection({ title: '', body: '' });
      setShowAddForm(false);
      toast.success('Section added');
    } catch (error: any) {
      console.error('Error adding section:', error);
      toast.error('Failed to add section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSection = async (sectionId: string, updates: Partial<CharacterSection>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('character_sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...updates } : s));
      setEditingId(null);
      toast.success('Section updated');
    } catch (error: any) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
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
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    [newSections[currentIndex], newSections[newIndex]] = [newSections[newIndex], newSections[currentIndex]];

    // Update sort orders
    const updates = newSections.map((s, i) => ({ id: s.id, sort_order: i }));

    setSections(newSections.map((s, i) => ({ ...s, sort_order: i })));

    try {
      for (const update of updates) {
        await supabase
          .from('character_sections')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error reordering sections:', error);
      fetchSections(); // Refresh on error
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Custom Sections</h3>
        </div>
        {!readOnly && !showAddForm && (
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        )}
      </div>

      {/* Add New Section Form */}
      {showAddForm && !readOnly && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={newSection.title}
                onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Section title..."
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-body">Content</Label>
              <Textarea
                id="new-body"
                value={newSection.body}
                onChange={(e) => setNewSection(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Section content..."
                className="min-h-[120px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSection({ title: '', body: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSection}
                disabled={!newSection.title.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Section
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections List */}
      {sections.length === 0 && !showAddForm ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No custom sections yet.</p>
            {!readOnly && (
              <p className="text-sm mt-1">Add sections to organize additional character information.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              totalSections={sections.length}
              isEditing={editingId === section.id}
              isSaving={isSaving}
              readOnly={readOnly}
              onEdit={() => setEditingId(section.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(updates) => handleUpdateSection(section.id, updates)}
              onDelete={() => handleDeleteSection(section.id)}
              onMove={(direction) => handleMoveSection(section.id, direction)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionCardProps {
  section: CharacterSection;
  index: number;
  totalSections: number;
  isEditing: boolean;
  isSaving: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<CharacterSection>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function SectionCard({
  section,
  index,
  totalSections,
  isEditing,
  isSaving,
  readOnly,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMove,
}: SectionCardProps) {
  const [editTitle, setEditTitle] = useState(section.title);
  const [editBody, setEditBody] = useState(section.body);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(section.title);
      setEditBody(section.body);
    }
  }, [isEditing, section]);

  if (isEditing) {
    return (
      <Card className="border-primary">
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-title-${section.id}`}>Title</Label>
            <Input
              id={`edit-title-${section.id}`}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-body-${section.id}`}>Content</Label>
            <Textarea
              id={`edit-body-${section.id}`}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              onClick={() => onSave({ title: editTitle.trim(), body: editBody.trim() })}
              disabled={!editTitle.trim() || isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onMove('up')}
                  disabled={index === 0}
                >
                  <GripVertical className="w-3 h-3 rotate-90" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onMove('down')}
                  disabled={index === totalSections - 1}
                >
                  <GripVertical className="w-3 h-3 rotate-90" />
                </Button>
              </div>
            )}
            <CardTitle className="text-base">{section.title}</CardTitle>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Section</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{section.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-wrap">{section.body}</p>
      </CardContent>
    </Card>
  );
}
