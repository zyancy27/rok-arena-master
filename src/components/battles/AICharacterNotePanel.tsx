import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Swords, Target, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useCharacterAINotes, type CharacterAINote } from '@/hooks/use-character-ai-notes';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { toast } from 'sonner';

interface AICharacterNotePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: string;
  characterName: string;
  battleId?: string;
}

// Maps AI note categories to character DB fields for auto-storage
const CATEGORY_TO_FIELD: Record<string, string> = {
  move_clarification: 'powers',
  personality: 'personality',
  tactical_behavior: 'mentality',
};

const CATEGORY_CONFIG = {
  move_clarification: {
    label: 'Moves & Abilities',
    icon: Target,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    fieldLabel: 'powers',
  },
  personality: {
    label: 'Personality',
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    fieldLabel: 'personality',
  },
  tactical_behavior: {
    label: 'Tactical Behavior',
    icon: Swords,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    fieldLabel: 'mentality',
  },
} as const;

const SCOPE_OPTIONS = [
  { value: 'current_battle', label: 'Current Battle Only' },
  { value: 'future_battles', label: 'Future Battles' },
  { value: 'global', label: 'Apply Globally' },
] as const;

/**
 * Appends note text to the character's corresponding field if scope is global/future,
 * checking for duplication first.
 */
async function syncNoteToCharacterField(
  characterId: string,
  category: string,
  noteText: string,
  scope: string
) {
  // Only sync global & future_battles notes to character fields
  if (scope === 'current_battle') return;

  const field = CATEGORY_TO_FIELD[category];
  if (!field) return;

  try {
    const { data: char } = await fromDecrypted('characters')
      .select('powers, personality, mentality, lore, abilities')
      .eq('id', characterId)
      .single();

    if (!char) return;

    const existingValue = ((char as any)[field] as string) || '';

    // Check for duplicate (case-insensitive substring match)
    if (existingValue.toLowerCase().includes(noteText.toLowerCase().trim())) {
      return; // Already exists
    }

    const timestamp = new Date().toLocaleDateString();
    const separator = existingValue.trim() ? '\n\n' : '';
    const updatedValue = `${existingValue}${separator}[Character Note ${timestamp}] ${noteText.trim()}`;

    await supabase
      .from('characters')
      .update({ [field]: updatedValue })
      .eq('id', characterId);
  } catch (err) {
    console.error('Failed to sync note to character field:', err);
  }
}

export default function AICharacterNotePanel({
  open,
  onOpenChange,
  characterId,
  characterName,
  battleId,
}: AICharacterNotePanelProps) {
  const { notes, loading, addNote, deleteNote, updateNote } = useCharacterAINotes(characterId);
  const [activeTab, setActiveTab] = useState<string>('move_clarification');
  const [newNote, setNewNote] = useState('');
  const [scope, setScope] = useState<CharacterAINote['scope']>('global');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    const result = await addNote(
      activeTab as CharacterAINote['category'],
      scope,
      newNote.trim(),
      battleId
    );
    if (result) {
      // Auto-sync to character field
      await syncNoteToCharacterField(characterId, activeTab, newNote.trim(), scope);
    }
    setNewNote('');
    setIsSubmitting(false);
  };

  const handleEdit = (note: CharacterAINote) => {
    setEditingId(note.id);
    setEditText(note.note);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await updateNote(editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const categoryNotes = notes.filter(n => n.category === activeTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Character Notes — {characterName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Define how this character thinks, fights, and behaves. The Narrator will follow these instructions. Global/future notes are automatically saved to the character's profile.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <TabsTrigger key={key} value={key} className="text-xs gap-1">
                <cfg.icon className="w-3 h-3" />
                {cfg.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <TabsContent key={key} value={key} className="space-y-3 mt-3">
              {/* New note input — no preselectable prompts */}
              <div className="space-y-2">
                <Textarea
                  placeholder={`Describe ${cfg.label.toLowerCase()} behavior for ${characterName}...`}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[70px] text-sm"
                />
                <div className="flex items-center gap-2">
                  <Select value={scope} onValueChange={(v) => setScope(v as CharacterAINote['scope'])}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCOPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!newNote.trim() || isSubmitting}
                    className="ml-auto"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Existing notes */}
              <ScrollArea className="max-h-[220px]">
                <div className="space-y-2">
                  {loading && <p className="text-xs text-muted-foreground text-center py-4">Loading notes...</p>}
                  {!loading && categoryNotes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No {cfg.label.toLowerCase()} notes yet
                    </p>
                  )}
                  {categoryNotes.map(note => (
                    <div
                      key={note.id}
                      className={`p-2.5 rounded-lg border ${cfg.bgColor} text-sm`}
                    >
                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="min-h-[50px] text-xs"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleSaveEdit}>
                              <Check className="w-3 h-3 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                              <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs">{note.note}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {SCOPE_OPTIONS.find(s => s.value === note.scope)?.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(note.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit(note)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteNote(note.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
