import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Palette, Tag, Plus, X } from 'lucide-react';
import type { ThemeComposition, EnvironmentTag } from '@/lib/theme-engine';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  composition: ThemeComposition;
  locationName?: string;
}

/**
 * Dialog for saving a composed battle theme to the user's library.
 * Users can name, describe, and tag their custom theme combos.
 */
export default function SaveThemePrompt({
  open,
  onOpenChange,
  composition,
  locationName,
}: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(locationName ? `${locationName} Theme` : '');
  const [description, setDescription] = useState('');
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const allTags = [...composition.tags, ...extraTags];

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !allTags.includes(t)) {
      setExtraTags([...extraTags, t]);
      setTagInput('');
    }
  };

  const removeExtraTag = (tag: string) => {
    setExtraTags(extraTags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('saved_battle_themes' as any).insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        tags: allTags,
        composition: composition as any,
      });

      if (error) throw error;
      toast.success('Theme saved to your library!');
      onOpenChange(false);
    } catch (err) {
      console.error('Save theme error:', err);
      toast.error('Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Save Battle Theme
          </DialogTitle>
          <DialogDescription>
            Save this composed theme for reuse in future matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Theme Name</label>
            <Input
              placeholder="e.g., Nuclear Inferno Storm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description (optional)</label>
            <Textarea
              placeholder="Describe this theme combo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {composition.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {extraTags.map((tag) => (
                <Badge key={tag} variant="outline" className="flex items-center gap-1 text-xs">
                  {tag}
                  <button onClick={() => removeExtraTag(tag)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save Theme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
