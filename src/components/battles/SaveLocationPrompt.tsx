import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, Tag, Plus, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationName: string;
  locationDescription?: string;
  isEmergency?: boolean;
  hazardDescription?: string;
  countdownSeconds?: number;
  initialTags?: string[];
}

export default function SaveLocationPrompt({
  open,
  onOpenChange,
  locationName,
  locationDescription,
  isEmergency,
  hazardDescription,
  countdownSeconds,
  initialTags = [],
}: Props) {
  const { user } = useAuth();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('custom_battle_locations').insert({
        user_id: user.id,
        name: locationName,
        description: locationDescription || null,
        tags,
        is_emergency: isEmergency || false,
        hazard_description: hazardDescription || null,
        countdown_seconds: countdownSeconds || null,
      });

      if (error) throw error;
      toast.success('Location saved to your library!');
      onOpenChange(false);
    } catch (err) {
      console.error('Save location error:', err);
      toast.error('Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Save Battle Location
          </DialogTitle>
          <DialogDescription>
            Save "{locationName}" to your Custom Battle Locations Library for future matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., High Risk, Space, Apocalyptic"
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
