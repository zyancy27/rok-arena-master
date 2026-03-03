import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacterGroups } from '@/hooks/use-character-groups';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, User, Edit, Globe, Sparkles, Users, X, Wand2, Loader2, ChevronDown, FileText, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  image_url: string | null;
  updated_at: string;
}

interface CharacterMembership {
  character_id: string;
  group_id: string;
}

interface DiscoveredCharacter {
  name: string;
  race?: string;
  sub_race?: string;
  age?: string;
  home_planet?: string;
  home_moon?: string;
  powers?: string;
  abilities?: string;
  weapons_items?: string;
  personality?: string;
  mentality?: string;
  lore?: string;
  level?: number;
  selected: boolean;
  existingId?: string;
}

export default function CharacterList() {
  const { user } = useAuth();
  const { groups, loading: groupsLoading } = useCharacterGroups();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [memberships, setMemberships] = useState<CharacterMembership[]>([]);
  
  // Batch selection state
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchTeamId, setBatchTeamId] = useState<string>('');
  const [batchLoading, setBatchLoading] = useState(false);

  // Batch import state
  const [importText, setImportText] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [discoveredChars, setDiscoveredChars] = useState<DiscoveredCharacter[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchCharacters();
      fetchMemberships();
    }
  }, [user]);

  const fetchCharacters = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, level, race, home_planet, image_url, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch characters:', error);
    } else {
      setCharacters(data || []);
    }
    setLoading(false);
  };

  const fetchMemberships = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('character_group_members')
      .select(`
        character_id,
        group_id,
        character_groups!inner(user_id)
      `)
      .eq('character_groups.user_id', user.id);

    if (error) {
      console.error('Failed to fetch memberships:', error);
    } else {
      setMemberships(data?.map(m => ({ character_id: m.character_id, group_id: m.group_id })) || []);
    }
  };

  const getCharacterTeams = (characterId: string) => {
    const teamIds = memberships.filter(m => m.character_id === characterId).map(m => m.group_id);
    return groups.filter(g => teamIds.includes(g.id));
  };

  const filteredCharacters = characters.filter(char => {
    const matchesSearch = 
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (char.race?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (char.home_planet?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (teamFilter === 'all') return matchesSearch;
    if (teamFilter === 'none') {
      const hasTeam = memberships.some(m => m.character_id === char.id);
      return matchesSearch && !hasTeam;
    }
    
    const inTeam = memberships.some(m => m.character_id === char.id && m.group_id === teamFilter);
    return matchesSearch && inTeam;
  });

  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacters(prev => {
      const next = new Set(prev);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCharacters(new Set(filteredCharacters.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedCharacters(new Set());
  };

  const handleBatchAddToTeam = async () => {
    if (!batchTeamId || selectedCharacters.size === 0) return;
    
    setBatchLoading(true);
    
    // Filter out characters already in the team
    const charactersToAdd = Array.from(selectedCharacters).filter(
      charId => !memberships.some(m => m.character_id === charId && m.group_id === batchTeamId)
    );

    if (charactersToAdd.length === 0) {
      toast.info('All selected characters are already in this team');
      setBatchLoading(false);
      return;
    }

    const { error } = await supabase
      .from('character_group_members')
      .insert(
        charactersToAdd.map(charId => ({
          character_id: charId,
          group_id: batchTeamId,
        }))
      );

    if (error) {
      console.error('Failed to add characters to team:', error);
      toast.error('Failed to add characters to team');
    } else {
      toast.success(`Added ${charactersToAdd.length} character${charactersToAdd.length !== 1 ? 's' : ''} to team`);
      await fetchMemberships();
      setSelectedCharacters(new Set());
      setShowBatchDialog(false);
      setBatchTeamId('');
    }
    
    setBatchLoading(false);
  };

  const processExtractedCharacters = async (result: any) => {
    if (result.success && result.characters?.length > 0) {
      const { data: existing } = await supabase
        .from('characters')
        .select('id, name')
        .eq('user_id', user!.id);
      const existingMap: Record<string, string> = {};
      if (existing) for (const e of existing) existingMap[e.name.toLowerCase()] = e.id;

      const chars: DiscoveredCharacter[] = result.characters.map((c: any) => ({
        ...c,
        selected: !existingMap[c.name?.toLowerCase()],
        existingId: existingMap[c.name?.toLowerCase()] || undefined,
      }));
      setDiscoveredChars(chars);
      toast.success(`Found ${chars.length} character${chars.length !== 1 ? 's' : ''}!`);
      setImportText('');
      setIsImportOpen(false);
    } else {
      toast.info('No characters found in the text');
    }
  };

  // Batch import: extract multiple characters from text
  const handleExtractCharacters = async () => {
    if (!importText.trim()) { toast.error('Paste some text first'); return; }
    setIsParsing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-character-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ notes: importText, multi: true }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to extract');
      }
      const result = await response.json();
      await processExtractedCharacters(result);
    } catch (error: any) {
      toast.error(error.message || 'Failed to extract characters');
    } finally {
      setIsParsing(false);
    }
  };

  // Batch import: extract characters from uploaded document
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'docx', 'doc', 'txt', 'md'];
    if (!ext || !validExts.includes(ext)) {
      toast.error('Supported formats: PDF, DOCX, TXT, MD');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setIsUploadingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...bytes));

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-character-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fileData: base64, fileType: ext }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process document');
      }

      const result = await response.json();
      await processExtractedCharacters(result);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process document');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBatchCreate = async () => {
    const toCreate = discoveredChars.filter(c => c.selected && !c.existingId && c.name.trim());
    const toUpdate = discoveredChars.filter(c => c.selected && c.existingId && c.name.trim());
    if (toCreate.length === 0 && toUpdate.length === 0) { toast.info('No characters selected'); return; }

    setIsCreating(true);
    let created = 0, updated = 0, errors = 0;

    if (toCreate.length > 0) {
      const { error } = await supabase.from('characters').insert(
        toCreate.map(c => ({
          user_id: user!.id,
          name: c.name.trim(),
          level: c.level || 1,
          race: c.race || null, sub_race: c.sub_race || null,
          age: c.age ? parseInt(c.age) : null,
          home_planet: c.home_planet || null, home_moon: c.home_moon || null,
          powers: c.powers || null, abilities: c.abilities || null,
          weapons_items: c.weapons_items || null,
          personality: c.personality || null, mentality: c.mentality || null,
          lore: c.lore || null,
        }))
      );
      if (error) {
        for (const c of toCreate) {
          const { error: singleError } = await supabase.from('characters').insert({
            user_id: user!.id, name: c.name.trim(), level: c.level || 1,
            race: c.race || null, sub_race: c.sub_race || null,
            age: c.age ? parseInt(c.age) : null,
            home_planet: c.home_planet || null, home_moon: c.home_moon || null,
            powers: c.powers || null, abilities: c.abilities || null,
            weapons_items: c.weapons_items || null,
            personality: c.personality || null, mentality: c.mentality || null,
            lore: c.lore || null,
          });
          if (singleError) errors++; else created++;
        }
      } else {
        created = toCreate.length;
      }
    }

    for (const c of toUpdate) {
      const updateData: Record<string, any> = {};
      if (c.race) updateData.race = c.race;
      if (c.sub_race) updateData.sub_race = c.sub_race;
      if (c.powers) updateData.powers = c.powers;
      if (c.abilities) updateData.abilities = c.abilities;
      if (c.personality) updateData.personality = c.personality;
      if (c.mentality) updateData.mentality = c.mentality;
      if (c.lore) updateData.lore = c.lore;
      if (c.home_planet) updateData.home_planet = c.home_planet;
      if (c.weapons_items) updateData.weapons_items = c.weapons_items;
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('characters').update(updateData).eq('id', c.existingId!);
        if (error) errors++; else updated++;
      }
    }

    const parts: string[] = [];
    if (created > 0) parts.push(`${created} created`);
    if (updated > 0) parts.push(`${updated} updated`);
    if (errors > 0) parts.push(`${errors} failed`);
    toast.success(`Characters: ${parts.join(', ')}`);

    setDiscoveredChars([]);
    setIsCreating(false);
    fetchCharacters();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const selectionMode = selectedCharacters.size > 0;

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Characters</h1>
          <p className="text-muted-foreground text-sm">
            {characters.length} character{characters.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/characters/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Character
            </Link>
          </Button>
        </div>
      </div>

      {/* Batch Import Section */}
      <div className="mb-6">
        <Collapsible open={isImportOpen} onOpenChange={setIsImportOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2 border-dashed">
              <Wand2 className="w-4 h-4" />
              Batch Import Characters (AI)
              <ChevronDown className={`w-3 h-3 transition-transform ${isImportOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3 max-w-2xl">
            <Textarea
              placeholder="Paste text containing multiple characters — descriptions, wiki entries, lore documents, etc. AI will extract all named characters..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={5}
              className="text-sm"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={handleExtractCharacters}
                disabled={isParsing || isUploadingFile || !importText.trim()}
                className="w-full sm:w-auto"
                size="sm"
              >
                {isParsing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting Characters...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Extract from Text</>
                )}
              </Button>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing || isUploadingFile}
                  className="w-full sm:w-auto"
                >
                  {isUploadingFile ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing Document...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Upload Document</>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste text or upload a document (PDF, DOCX, TXT, MD) — AI will extract all characters.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Discovered Characters Panel */}
      {discoveredChars.length > 0 && (
        <Card className="mb-6 border-dashed border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Discovered Characters ({discoveredChars.filter(c => c.selected).length}/{discoveredChars.length})
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Select characters to create or update. Existing characters will be merged with new info.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDiscoveredChars([])}>
                  <X className="w-4 h-4 mr-1" /> Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={handleBatchCreate}
                  disabled={isCreating || discoveredChars.filter(c => c.selected).length === 0}
                >
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-1" /> Create Selected</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {discoveredChars.map((char, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 rounded-md border p-3 transition-colors ${
                    char.selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 opacity-60'
                  }`}
                >
                  <Checkbox
                    checked={char.selected}
                    onCheckedChange={() => {
                      const updated = [...discoveredChars];
                      updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
                      setDiscoveredChars(updated);
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{char.name}</span>
                      {char.existingId && (
                        <Badge variant="outline" className="text-[10px] shrink-0">exists</Badge>
                      )}
                      {char.level && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Tier {char.level}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {char.race && <Badge variant="outline" className="text-[10px]">{char.race}</Badge>}
                      {char.home_planet && (
                        <Badge variant="outline" className="text-[10px]">
                          <Globe className="w-2.5 h-2.5 mr-0.5" />{char.home_planet}
                        </Badge>
                      )}
                      {char.powers && <Badge variant="outline" className="text-[10px]">Powers</Badge>}
                      {char.lore && <Badge variant="outline" className="text-[10px]">Lore</Badge>}
                    </div>
                    {char.lore && <p className="text-xs text-muted-foreground line-clamp-1">{char.lore}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, race, or planet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Users className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Characters</SelectItem>
            <SelectItem value="none">No Team</SelectItem>
            {groups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection Bar */}
      {selectionMode && (
        <div className="flex items-center justify-between gap-4 p-3 mb-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedCharacters.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowBatchDialog(true)}
              disabled={groups.length === 0}
            >
              <Users className="w-4 h-4 mr-2" />
              Add to Team
            </Button>
          </div>
        </div>
      )}

      {/* Select All / Deselect All */}
      {filteredCharacters.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectionMode ? clearSelection : selectAll}
          >
            {selectionMode ? 'Deselect All' : 'Select All'}
          </Button>
          {!selectionMode && groups.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Select characters to batch add to teams
            </span>
          )}
        </div>
      )}

      {/* Character Grid */}
      {filteredCharacters.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {characters.length === 0 ? (
              <>
                <User className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Characters Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first character to start building your universe.
                </p>
                <Button asChild>
                  <Link to="/characters/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Character
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search query or filter.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCharacters.map((character) => {
            const isSelected = selectedCharacters.has(character.id);
            const characterTeams = getCharacterTeams(character.id);
            
            return (
              <Card
                key={character.id}
                className={`group bg-card/50 hover:bg-card/80 transition-all border-border overflow-hidden ${
                  isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                }`}
              >
                <CardContent className="p-0">
                  {/* Image or placeholder */}
                  <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
                    {/* Selection checkbox */}
                    <div 
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCharacterSelection(character.id)}
                        className="bg-background/80 backdrop-blur-sm border-2"
                      />
                    </div>
                    
                    {character.image_url ? (
                      <img
                        src={character.image_url}
                        alt={character.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-16 h-16 text-muted-foreground/50" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Lv. {character.level}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg truncate mb-1">
                      {character.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      {character.race && (
                        <span className="truncate">{character.race}</span>
                      )}
                      {character.race && character.home_planet && (
                        <span>•</span>
                      )}
                      {character.home_planet && (
                        <span className="flex items-center gap-1 truncate">
                          <Globe className="w-3 h-3" />
                          {character.home_planet}
                        </span>
                      )}
                    </div>
                    
                    {/* Team badges */}
                    {characterTeams.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {characterTeams.slice(0, 2).map(team => (
                          <Badge
                            key={team.id}
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: `${team.color}20`, borderColor: team.color }}
                          >
                            <div
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: team.color }}
                            />
                            {team.name}
                          </Badge>
                        ))}
                        {characterTeams.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{characterTeams.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/characters/${character.id}`}>
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="default" size="sm" className="flex-1">
                        <Link to={`/characters/${character.id}/edit`}>
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Batch Add to Team Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="bg-popover">
          <DialogHeader>
            <DialogTitle>Add to Team</DialogTitle>
            <DialogDescription>
              Add {selectedCharacters.size} selected character{selectedCharacters.size !== 1 ? 's' : ''} to a team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={batchTeamId} onValueChange={setBatchTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No teams available.{' '}
                <Link to="/teams" className="text-primary hover:underline">
                  Create a team first
                </Link>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBatchAddToTeam} 
              disabled={!batchTeamId || batchLoading}
            >
              {batchLoading ? 'Adding...' : 'Add to Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
