import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { LoreDocumentUpload } from '@/components/lore/LoreDocumentUpload';
import { useAutoSave } from '@/hooks/use-auto-save';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { SpeciesDiscoveryPanel, DiscoveredCharacter, DiscoveredStory } from '@/components/races/SpeciesDiscoveryPanel';
import { Dna, Plus, Edit, Trash2, Globe, Sparkles, Heart, Clock, ChevronDown, Wand2, Loader2, GitBranch, X } from 'lucide-react';

interface SubRace {
  id: string;
  race_id: string;
  name: string;
  description: string | null;
  typical_physiology: string | null;
  typical_abilities: string | null;
  cultural_traits: string | null;
}

interface Race {
  id: string;
  name: string;
  description: string | null;
  home_planet: string | null;
  typical_physiology: string | null;
  typical_abilities: string | null;
  cultural_traits: string | null;
  average_lifespan: string | null;
  image_url: string | null;
  created_at: string;
}

interface RaceFormData {
  name: string;
  description: string;
  home_planet: string;
  typical_physiology: string;
  typical_abilities: string;
  cultural_traits: string;
  average_lifespan: string;
}

interface SubRaceFormData {
  name: string;
  description: string;
  typical_physiology: string;
  typical_abilities: string;
  cultural_traits: string;
}

const emptyForm: RaceFormData = {
  name: '',
  description: '',
  home_planet: '',
  typical_physiology: '',
  typical_abilities: '',
  cultural_traits: '',
  average_lifespan: '',
};

const emptySubRaceForm: SubRaceFormData = {
  name: '',
  description: '',
  typical_physiology: '',
  typical_abilities: '',
  cultural_traits: '',
};

export default function Races() {
  const { user } = useAuth();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [formData, setFormData] = useState<RaceFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [discoveredCharacters, setDiscoveredCharacters] = useState<DiscoveredCharacter[]>([]);
  const [discoveredStories, setDiscoveredStories] = useState<DiscoveredStory[]>([]);
  const [discoveredSubRaces, setDiscoveredSubRaces] = useState<Array<SubRaceFormData & { selected: boolean }>>([]);
  const [subRaces, setSubRaces] = useState<Record<string, SubRace[]>>({});
  const [subRaceForm, setSubRaceForm] = useState<SubRaceFormData>(emptySubRaceForm);
  const [editingSubRace, setEditingSubRace] = useState<SubRace | null>(null);
  const [addingSubRaceFor, setAddingSubRaceFor] = useState<string | null>(null);
  const [savingSubRace, setSavingSubRace] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRaces();
    }
  }, [user]);

  const fetchRaces = async () => {
    const { data, error } = await fromDecrypted('races')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');

    if (error) {
      toast.error('Failed to load races');
    } else {
      setRaces(data || []);
      // Fetch sub-races for all races
      if (data && data.length > 0) {
        const raceIds = data.map((r: Race) => r.id);
        const { data: subData } = await fromDecrypted('sub_races')
          .select('*')
          .in('race_id', raceIds)
          .order('name');
        if (subData) {
          const grouped: Record<string, SubRace[]> = {};
          for (const sr of subData) {
            if (!grouped[sr.race_id]) grouped[sr.race_id] = [];
            grouped[sr.race_id].push(sr as SubRace);
          }
          setSubRaces(grouped);
        }
      }
    }
    setLoading(false);
  };

  const handleOpenSubRaceAdd = (raceId: string) => {
    setAddingSubRaceFor(raceId);
    setEditingSubRace(null);
    setSubRaceForm(emptySubRaceForm);
  };

  const handleOpenSubRaceEdit = (sr: SubRace) => {
    setAddingSubRaceFor(sr.race_id);
    setEditingSubRace(sr);
    setSubRaceForm({
      name: sr.name,
      description: sr.description || '',
      typical_physiology: sr.typical_physiology || '',
      typical_abilities: sr.typical_abilities || '',
      cultural_traits: sr.cultural_traits || '',
    });
  };

  const handleSaveSubRace = async () => {
    if (!subRaceForm.name.trim() || !addingSubRaceFor) return;
    setSavingSubRace(true);
    try {
      if (editingSubRace) {
        const { error } = await supabase
          .from('sub_races')
          .update({
            name: subRaceForm.name,
            description: subRaceForm.description || null,
            typical_physiology: subRaceForm.typical_physiology || null,
            typical_abilities: subRaceForm.typical_abilities || null,
            cultural_traits: subRaceForm.cultural_traits || null,
          })
          .eq('id', editingSubRace.id);
        if (error) throw error;
        toast.success('Sub-race updated!');
      } else {
        const { error } = await supabase.from('sub_races').insert({
          race_id: addingSubRaceFor,
          user_id: user?.id,
          name: subRaceForm.name,
          description: subRaceForm.description || null,
          typical_physiology: subRaceForm.typical_physiology || null,
          typical_abilities: subRaceForm.typical_abilities || null,
          cultural_traits: subRaceForm.cultural_traits || null,
        });
        if (error) throw error;
        toast.success('Sub-race added!');
      }
      setAddingSubRaceFor(null);
      setEditingSubRace(null);
      setSubRaceForm(emptySubRaceForm);
      fetchRaces();
    } catch (error) {
      toast.error('Failed to save sub-race');
    } finally {
      setSavingSubRace(false);
    }
  };

  const handleDeleteSubRace = async (id: string) => {
    const { error } = await supabase.from('sub_races').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete sub-race');
    } else {
      toast.success('Sub-race deleted');
      fetchRaces();
    }
  };

  const handleAutoFillFromPaste = async () => {
    if (!pasteText.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-species-info', {
        body: { text: pasteText }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const extracted = data.data;
        setFormData({
          name: extracted.name || formData.name,
          description: extracted.description || formData.description,
          home_planet: extracted.home_planet || formData.home_planet,
          typical_physiology: extracted.typical_physiology || formData.typical_physiology,
          typical_abilities: extracted.typical_abilities || formData.typical_abilities,
          cultural_traits: extracted.cultural_traits || formData.cultural_traits,
          average_lifespan: extracted.average_lifespan || formData.average_lifespan,
        });

        // Check for existing characters and stories to avoid duplicates
        const charNames = (data.characters || []).map((c: any) => c.name);
        const storyTitles = (data.stories || []).map((s: any) => s.title);

        // Fetch existing characters by name for this user
        let existingChars: Record<string, string> = {};
        if (charNames.length > 0 && user) {
          const { data: existingData } = await supabase
            .from('characters')
            .select('id, name')
            .eq('user_id', user.id);
          if (existingData) {
            for (const ec of existingData) {
              existingChars[ec.name.toLowerCase()] = ec.id;
            }
          }
        }

        // Fetch existing stories by title for this user
        let existingStories: Record<string, string> = {};
        if (storyTitles.length > 0 && user) {
          const { data: existingData } = await supabase
            .from('stories')
            .select('id, title')
            .eq('user_id', user.id);
          if (existingData) {
            for (const es of existingData) {
              existingStories[es.title.toLowerCase()] = es.id;
            }
          }
        }

        const chars: DiscoveredCharacter[] = (data.characters || []).map((c: any) => ({
          ...c,
          race: c.race || extracted.name || '',
          selected: true,
          existingId: existingChars[c.name?.toLowerCase()] || undefined,
        }));
        const storiesData: DiscoveredStory[] = (data.stories || []).map((s: any) => ({
          ...s,
          selected: true,
          existingId: existingStories[s.title?.toLowerCase()] || undefined,
        }));
        setDiscoveredCharacters(chars);
        setDiscoveredStories(storiesData);

        // Extract discovered sub-races
        const subRacesData = (data.sub_races || []).map((sr: any) => ({
          name: sr.name || '',
          description: sr.description || '',
          typical_physiology: sr.typical_physiology || '',
          typical_abilities: sr.typical_abilities || '',
          cultural_traits: sr.cultural_traits || '',
          selected: true,
        }));
        setDiscoveredSubRaces(subRacesData);

        const extras: string[] = [];
        if (subRacesData.length > 0) extras.push(`${subRacesData.length} sub-race${subRacesData.length > 1 ? 's' : ''}`);
        if (chars.length > 0) extras.push(`${chars.length} character${chars.length > 1 ? 's' : ''}`);
        if (storiesData.length > 0) extras.push(`${storiesData.length} stor${storiesData.length > 1 ? 'ies' : 'y'}`);
        
        toast.success(
          `Species info extracted!${extras.length > 0 ? ` Also found ${extras.join(', ')}.` : ''}`
        );
        setPasteText('');
        setIsPasteOpen(false);
      } else {
        throw new Error(data?.error || 'Failed to extract information');
      }
    } catch (error) {
      console.error('Parse error:', error);
      const message = error instanceof Error ? error.message : 'Failed to parse text';
      toast.error(message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRace(null);
    setFormData(emptyForm);
    setPasteText('');
    setIsPasteOpen(false);
    setDiscoveredCharacters([]);
    setDiscoveredStories([]);
    setDiscoveredSubRaces([]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (race: Race) => {
    setEditingRace(race);
    setFormData({
      name: race.name,
      description: race.description || '',
      home_planet: race.home_planet || '',
      typical_physiology: race.typical_physiology || '',
      typical_abilities: race.typical_abilities || '',
      cultural_traits: race.cultural_traits || '',
      average_lifespan: race.average_lifespan || '',
    });
    setIsDialogOpen(true);
  };

  // Auto-save callback for when editing
  const handleAutoSave = useCallback(async (data: RaceFormData) => {
    if (!editingRace || !data.name.trim()) return;
    
    const { error } = await supabase
      .from('races')
      .update({
        name: data.name,
        description: data.description || null,
        home_planet: data.home_planet || null,
        typical_physiology: data.typical_physiology || null,
        typical_abilities: data.typical_abilities || null,
        cultural_traits: data.cultural_traits || null,
        average_lifespan: data.average_lifespan || null,
      })
      .eq('id', editingRace.id);

    if (error) throw error;
  }, [editingRace]);

  // Auto-save hook
  const { isSaving: autoSaving, lastSaved, canUndo, undo } = useAutoSave({
    data: formData,
    onSave: handleAutoSave,
    debounceMs: 1500,
    enabled: !!editingRace && !!formData.name.trim(),
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Race name is required');
      return;
    }

    setIsSaving(true);

    try {
      if (editingRace) {
        const { error } = await supabase
          .from('races')
          .update({
            name: formData.name,
            description: formData.description || null,
            home_planet: formData.home_planet || null,
            typical_physiology: formData.typical_physiology || null,
            typical_abilities: formData.typical_abilities || null,
            cultural_traits: formData.cultural_traits || null,
            average_lifespan: formData.average_lifespan || null,
          })
          .eq('id', editingRace.id);

        if (error) throw error;
        toast.success('Race updated!');
      } else {
        const { data: newRace, error } = await supabase.from('races').insert({
          user_id: user?.id,
          name: formData.name,
          description: formData.description || null,
          home_planet: formData.home_planet || null,
          typical_physiology: formData.typical_physiology || null,
          typical_abilities: formData.typical_abilities || null,
          cultural_traits: formData.cultural_traits || null,
          average_lifespan: formData.average_lifespan || null,
        }).select().single();

        if (error) throw error;

        // Save discovered sub-races
        const selectedSubRaces = discoveredSubRaces.filter(sr => sr.selected && sr.name.trim());
        if (selectedSubRaces.length > 0 && newRace) {
          const { error: srError } = await supabase.from('sub_races').insert(
            selectedSubRaces.map(sr => ({
              race_id: newRace.id,
              user_id: user?.id,
              name: sr.name,
              description: sr.description || null,
              typical_physiology: sr.typical_physiology || null,
              typical_abilities: sr.typical_abilities || null,
              cultural_traits: sr.cultural_traits || null,
            }))
          );
          if (srError) console.error('Failed to save sub-races:', srError);
        }

        setDiscoveredSubRaces([]);
        toast.success('Race created!');
      }

      setIsDialogOpen(false);
      fetchRaces();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save race');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (raceId: string) => {
    const { error } = await supabase.from('races').delete().eq('id', raceId);

    if (error) {
      toast.error('Failed to delete race');
    } else {
      toast.success('Race deleted');
      fetchRaces();
    }
  };

  return (
    <div className="min-h-screen bg-nebula-gradient bg-stars">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Dna className="h-8 w-8" />
              Your Races
            </h1>
            <p className="text-muted-foreground mt-1">
              Define species and peoples that populate your universe
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Race
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>{editingRace ? 'Edit Race' : 'Create New Race'}</DialogTitle>
                    <DialogDescription>
                      Define a species or people group. Characters can belong to this race.
                    </DialogDescription>
                  </div>
                  {editingRace && (
                    <AutoSaveIndicator
                      isSaving={autoSaving}
                      lastSaved={lastSaved}
                      canUndo={canUndo}
                      onUndo={undo}
                    />
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* AI Auto-fill from paste section */}
                {!editingRace && (
                  <Collapsible open={isPasteOpen} onOpenChange={setIsPasteOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between" type="button">
                        <span className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4" />
                          Paste character info to auto-fill
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isPasteOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-3">
                      <Textarea
                        placeholder="Paste character description, wiki entry, or any text containing species information..."
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        rows={4}
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        onClick={handleAutoFillFromPaste}
                        disabled={isParsing || !pasteText.trim()}
                        className="w-full"
                      >
                        {isParsing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Extract Species Info
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        AI will extract species name, physiology, abilities, culture, and more from your text.
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Discovery Panel for characters & stories found */}
                {(discoveredCharacters.length > 0 || discoveredStories.length > 0) && (
                  <SpeciesDiscoveryPanel
                    characters={discoveredCharacters}
                    stories={discoveredStories}
                    speciesName={formData.name || 'Unknown Species'}
                    onCharactersChange={setDiscoveredCharacters}
                    onStoriesChange={setDiscoveredStories}
                    onComplete={() => {
                      setDiscoveredCharacters([]);
                      setDiscoveredStories([]);
                      setDiscoveredSubRaces([]);
                    }}
                  />
                )}

                {/* Discovered Sub-Races */}
                {discoveredSubRaces.length > 0 && (
                  <Card className="border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Discovered Sub-Races ({discoveredSubRaces.filter(s => s.selected).length}/{discoveredSubRaces.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        These sub-races will be saved when you create/update this race.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {discoveredSubRaces.map((sr, idx) => (
                        <div key={idx} className="flex items-start gap-2 rounded-md border border-border p-2">
                          <input
                            type="checkbox"
                            checked={sr.selected}
                            onChange={() => {
                              const updated = [...discoveredSubRaces];
                              updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
                              setDiscoveredSubRaces(updated);
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{sr.name}</p>
                            {sr.description && <p className="text-xs text-muted-foreground line-clamp-2">{sr.description}</p>}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sr.typical_abilities && <Badge variant="outline" className="text-[10px]">Abilities</Badge>}
                              {sr.typical_physiology && <Badge variant="outline" className="text-[10px]">Physiology</Badge>}
                              {sr.cultural_traits && <Badge variant="outline" className="text-[10px]">Culture</Badge>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Race Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Elderkin, Void Walkers, Crystalborn"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="General overview of this race..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="home_planet">Home Planet/Region</Label>
                    <Input
                      id="home_planet"
                      value={formData.home_planet}
                      onChange={(e) => setFormData({ ...formData, home_planet: e.target.value })}
                      placeholder="e.g., Crystallis Prime"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="average_lifespan">Average Lifespan</Label>
                    <Input
                      id="average_lifespan"
                      value={formData.average_lifespan}
                      onChange={(e) => setFormData({ ...formData, average_lifespan: e.target.value })}
                      placeholder="e.g., 500 years, Immortal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="typical_physiology">Typical Physiology</Label>
                  <Textarea
                    id="typical_physiology"
                    value={formData.typical_physiology}
                    onChange={(e) => setFormData({ ...formData, typical_physiology: e.target.value })}
                    placeholder="Common physical traits, appearances, biology..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="typical_abilities">Typical Abilities</Label>
                  <Textarea
                    id="typical_abilities"
                    value={formData.typical_abilities}
                    onChange={(e) => setFormData({ ...formData, typical_abilities: e.target.value })}
                    placeholder="Common powers or abilities shared by this race..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cultural_traits">Cultural Traits</Label>
                  <Textarea
                    id="cultural_traits"
                    value={formData.cultural_traits}
                    onChange={(e) => setFormData({ ...formData, cultural_traits: e.target.value })}
                    placeholder="Society, traditions, values, common behaviors..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : editingRace ? 'Update Race' : 'Create Race'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Document Upload Section */}
        <div className="mb-8">
          <LoreDocumentUpload onImportComplete={fetchRaces} />
        </div>

        {/* Races Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading races...</div>
        ) : races.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Dna className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Races Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create race templates that your characters can belong to
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Race
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {races.map((race) => (
              <Card key={race.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{race.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(race)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {race.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the race definition. Characters won't be deleted but will lose their race reference.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(race.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {race.description && (
                    <CardDescription className="line-clamp-2">{race.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {race.home_planet && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {race.home_planet}
                      </Badge>
                    )}
                    {race.average_lifespan && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {race.average_lifespan}
                      </Badge>
                    )}
                  </div>
                  
                  {race.typical_physiology && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Heart className="h-3 w-3" /> Physiology
                      </p>
                      <p className="text-sm line-clamp-2">{race.typical_physiology}</p>
                    </div>
                  )}
                  
                  {race.typical_abilities && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Abilities
                      </p>
                      <p className="text-sm line-clamp-2">{race.typical_abilities}</p>
                    </div>
                  )}

                  {/* Sub-Races Section */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between px-2 h-8 text-xs">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          Sub-Races ({(subRaces[race.id] || []).length})
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      {(subRaces[race.id] || []).map((sr) => (
                        <div key={sr.id} className="rounded-md border border-border bg-muted/30 p-2 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{sr.name}</span>
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenSubRaceEdit(sr)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {sr.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>This sub-race will be permanently removed.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSubRace(sr.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          {sr.description && <p className="text-xs text-muted-foreground line-clamp-2">{sr.description}</p>}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handleOpenSubRaceAdd(race.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Sub-Race
                      </Button>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sub-Race Add/Edit Dialog */}
        <Dialog open={!!addingSubRaceFor} onOpenChange={(open) => { if (!open) { setAddingSubRaceFor(null); setEditingSubRace(null); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSubRace ? 'Edit Sub-Race' : 'Add Sub-Race'}</DialogTitle>
              <DialogDescription>Define a variation within this race.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="sr-name">Name *</Label>
                <Input id="sr-name" value={subRaceForm.name} onChange={(e) => setSubRaceForm({ ...subRaceForm, name: e.target.value })} placeholder="e.g., Mountain Crystalborn" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sr-desc">Description</Label>
                <Textarea id="sr-desc" value={subRaceForm.description} onChange={(e) => setSubRaceForm({ ...subRaceForm, description: e.target.value })} placeholder="What distinguishes this sub-race..." rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sr-phys">Physiology Differences</Label>
                <Textarea id="sr-phys" value={subRaceForm.typical_physiology} onChange={(e) => setSubRaceForm({ ...subRaceForm, typical_physiology: e.target.value })} placeholder="Physical traits unique to this sub-race..." rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sr-abil">Unique Abilities</Label>
                <Textarea id="sr-abil" value={subRaceForm.typical_abilities} onChange={(e) => setSubRaceForm({ ...subRaceForm, typical_abilities: e.target.value })} placeholder="Abilities specific to this sub-race..." rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sr-cult">Cultural Differences</Label>
                <Textarea id="sr-cult" value={subRaceForm.cultural_traits} onChange={(e) => setSubRaceForm({ ...subRaceForm, cultural_traits: e.target.value })} placeholder="Cultural traits unique to this sub-race..." rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setAddingSubRaceFor(null); setEditingSubRace(null); }}>Cancel</Button>
                <Button onClick={handleSaveSubRace} disabled={savingSubRace || !subRaceForm.name.trim()}>
                  {savingSubRace ? 'Saving...' : editingSubRace ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
