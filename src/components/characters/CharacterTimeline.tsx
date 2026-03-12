import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, GripVertical, Clock, Eye, EyeOff, Lock, Heart, Loader2 } from 'lucide-react';

interface TimelineEvent {
  id: string;
  character_id: string;
  user_id: string;
  age_or_year: string;
  event_title: string;
  event_description: string;
  tags: string[];
  emotional_weight: number;
  visibility: string;
  sort_order: number;
  created_at: string;
}

interface CharacterTimelineProps {
  characterId: string;
  mode: 'create' | 'edit';
  onEventsChange?: (events: TimelineEvent[]) => void;
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Eye, desc: 'Visible to everyone' },
  { value: 'narrator_only', label: 'Narrator Only', icon: EyeOff, desc: 'Only the narrator sees this' },
  { value: 'private', label: 'Private', icon: Lock, desc: 'Only you can see this' },
];

const COMMON_TAGS = ['war', 'loss', 'betrayal', 'redemption', 'training', 'family', 'discovery', 'love', 'trauma', 'awakening', 'exile', 'victory', 'sacrifice', 'friendship'];

export default function CharacterTimeline({ characterId, mode, onEventsChange }: CharacterTimelineProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<TimelineEvent[] | null>(null);

  // Load events for edit mode
  useEffect(() => {
    if (mode === 'edit' && characterId) {
      loadEvents();
    }
  }, [characterId, mode]);

  // Notify parent of event changes
  useEffect(() => {
    onEventsChange?.(events);
  }, [events]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('character_timeline_events')
      .select('*')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true });
    if (!error && data) setEvents(data as unknown as TimelineEvent[]);
  };

  // Auto-save logic for edit mode (debounced)
  const scheduleSave = useCallback((updatedEvents: TimelineEvent[]) => {
    if (mode !== 'edit' || !characterId || !user) return;
    pendingSaveRef.current = updatedEvents;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const toSave = pendingSaveRef.current;
      if (toSave) persistEvents(toSave);
    }, 2000);
  }, [mode, characterId, user]);

  const persistEvents = async (eventsToSave: TimelineEvent[]) => {
    if (!user || !characterId) return;
    setSaving(true);
    try {
      for (const ev of eventsToSave) {
        if (!ev.event_title.trim()) continue;
        const payload = {
          character_id: characterId,
          user_id: user.id,
          age_or_year: ev.age_or_year,
          event_title: ev.event_title,
          event_description: ev.event_description,
          tags: ev.tags,
          emotional_weight: ev.emotional_weight,
          visibility: ev.visibility,
          sort_order: ev.sort_order,
        };
        if (ev.id.startsWith('temp_')) {
          const { data, error } = await supabase.from('character_timeline_events').insert(payload).select('id').single();
          if (!error && data) {
            // Replace temp id with real id
            setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, id: data.id } : e));
          }
        } else {
          await supabase.from('character_timeline_events').update(payload).eq('id', ev.id);
        }
      }
    } catch {
      toast.error('Failed to save timeline event');
    } finally {
      setSaving(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Flush pending save on unmount
      if (pendingSaveRef.current && mode === 'edit' && user && characterId) {
        persistEvents(pendingSaveRef.current);
      }
    };
  }, []);

  const setEventsAndSave = (updater: (prev: TimelineEvent[]) => TimelineEvent[]) => {
    setEvents(prev => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  };

  const addEvent = () => {
    const newEvent: TimelineEvent = {
      id: `temp_${Date.now()}`,
      character_id: characterId,
      user_id: user?.id || '',
      age_or_year: '',
      event_title: '',
      event_description: '',
      tags: [],
      emotional_weight: 3,
      visibility: 'public',
      sort_order: events.length,
      created_at: new Date().toISOString(),
    };
    setEvents(prev => [...prev, newEvent]);
    setExpandedIds(prev => new Set(prev).add(newEvent.id));
  };

  const removeEvent = async (id: string) => {
    if (!id.startsWith('temp_') && mode === 'edit') {
      const { error } = await supabase.from('character_timeline_events').delete().eq('id', id);
      if (error) { toast.error('Failed to delete event'); return; }
    }
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateEvent = (id: string, field: keyof TimelineEvent, value: any) => {
    setEventsAndSave(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const toggleTag = (eventId: string, tag: string) => {
    setEventsAndSave(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const tags = e.tags.includes(tag) ? e.tags.filter(t => t !== tag) : [...e.tags, tag];
      return { ...e, tags };
    }));
  };

  const addCustomTag = (eventId: string) => {
    const tag = (newTagInputs[eventId] || '').trim().toLowerCase();
    if (!tag) return;
    toggleTag(eventId, tag);
    setNewTagInputs(prev => ({ ...prev, [eventId]: '' }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Drag reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setEventsAndSave(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIdx, 1);
      copy.splice(idx, 0, moved);
      return copy.map((ev, i) => ({ ...ev, sort_order: i }));
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const emotionalWeightLabel = (w: number) => {
    const labels = ['Minor', 'Moderate', 'Significant', 'Major', 'Defining'];
    return labels[w - 1] || 'Unknown';
  };

  return (
    <div className="space-y-3">
      {saving && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-end">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
        </div>
      )}

      {events.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No timeline events yet. Add defining moments from your character's life.
        </p>
      )}

      {events.map((ev, idx) => (
        <div
          key={ev.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={handleDragEnd}
          className={`border border-border rounded-lg bg-background/50 transition-all ${dragIdx === idx ? 'opacity-50 scale-[0.98]' : ''}`}
        >
          <Collapsible open={expandedIds.has(ev.id)} onOpenChange={() => toggleExpanded(ev.id)}>
            <div className="flex items-center gap-2 p-3">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {ev.age_or_year && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      <Clock className="w-2.5 h-2.5 mr-1" />{ev.age_or_year}
                    </Badge>
                  )}
                  <span className="text-sm font-medium truncate">
                    {ev.event_title || <span className="text-muted-foreground italic">Untitled event</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {Array.from({ length: ev.emotional_weight }, (_, i) => (
                    <Heart key={i} className="w-2.5 h-2.5 text-red-400 fill-red-400" />
                  ))}
                  {ev.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[9px] h-4">{tag}</Badge>
                  ))}
                  {ev.tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{ev.tags.length - 3}</span>}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeEvent(ev.id); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedIds.has(ev.id) ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Age / Year</Label>
                    <Input placeholder="e.g. Age 12, Year 3042" value={ev.age_or_year} onChange={(e) => updateEvent(ev.id, 'age_or_year', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Event Title</Label>
                    <Input placeholder="What happened?" value={ev.event_title} onChange={(e) => updateEvent(ev.id, 'event_title', e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea placeholder="Describe this event in detail..." value={ev.event_description} onChange={(e) => updateEvent(ev.id, 'event_description', e.target.value)} rows={2} className="text-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(ev.id, tag)}
                        className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                          ev.tags.includes(tag)
                            ? 'bg-primary/15 border-primary text-primary font-medium'
                            : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Custom tag..."
                      value={newTagInputs[ev.id] || ''}
                      onChange={(e) => setNewTagInputs(prev => ({ ...prev, [ev.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(ev.id); } }}
                      className="h-7 text-xs flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addCustomTag(ev.id)}>Add</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Emotional Weight ({emotionalWeightLabel(ev.emotional_weight)})</Label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateEvent(ev.id, 'emotional_weight', w)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Heart className={`w-4 h-4 ${w <= ev.emotional_weight ? 'text-red-400 fill-red-400' : 'text-muted-foreground/30'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Visibility</Label>
                    <Select value={ev.visibility} onValueChange={(v) => updateEvent(ev.id, 'visibility', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={addEvent}>
        <Plus className="w-3.5 h-3.5" /> Add Timeline Event
      </Button>
    </div>
  );
}

// Export the save function so parent can call it for create mode
export async function saveTimelineEvents(characterId: string, userId: string, events: any[]) {
  for (const ev of events) {
    if (!ev.event_title?.trim()) continue;
    const payload = {
      character_id: characterId,
      user_id: userId,
      age_or_year: ev.age_or_year || '',
      event_title: ev.event_title,
      event_description: ev.event_description || '',
      tags: ev.tags || [],
      emotional_weight: ev.emotional_weight || 3,
      visibility: ev.visibility || 'public',
      sort_order: ev.sort_order || 0,
    };
    if (ev.id?.startsWith('temp_')) {
      await supabase.from('character_timeline_events').insert(payload);
    } else {
      await supabase.from('character_timeline_events').update(payload).eq('id', ev.id);
    }
  }
}
