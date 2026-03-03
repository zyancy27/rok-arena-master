import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Users, BookOpen, FolderPlus, Loader2, Sparkles, Swords, Link } from 'lucide-react';

export interface DiscoveredCharacter {
  name: string;
  race?: string;
  powers?: string;
  abilities?: string;
  personality?: string;
  mentality?: string;
  lore?: string;
  home_planet?: string;
  level?: number;
  weapons_items?: string;
  selected: boolean;
}

export interface DiscoveredStory {
  title: string;
  content: string;
  summary?: string;
  character_names?: string[];
  selected: boolean;
}

interface SpeciesDiscoveryPanelProps {
  characters: DiscoveredCharacter[];
  stories: DiscoveredStory[];
  speciesName: string;
  onCharactersChange: (chars: DiscoveredCharacter[]) => void;
  onStoriesChange: (stories: DiscoveredStory[]) => void;
  onComplete: () => void;
}

export function SpeciesDiscoveryPanel({
  characters,
  stories,
  speciesName,
  onCharactersChange,
  onStoriesChange,
  onComplete,
}: SpeciesDiscoveryPanelProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [createGroup, setCreateGroup] = useState(characters.length >= 2);

  const toggleCharacter = (index: number) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    onCharactersChange(updated);
  };

  const toggleStory = (index: number) => {
    const updated = [...stories];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    onStoriesChange(updated);
  };

  const selectedCharCount = characters.filter(c => c.selected).length;
  const selectedStoryCount = stories.filter(s => s.selected).length;

  const handleCreateAll = async () => {
    if (!user) return;
    setIsCreating(true);

    try {
      const created = { characters: 0, stories: 0, group: false, links: 0 };
      const characterIds: { name: string; id: string }[] = [];
      const storyIds: { title: string; id: string; character_names: string[] }[] = [];

      // 1. Create selected characters
      const selectedChars = characters.filter(c => c.selected);
      for (const char of selectedChars) {
        const { data, error } = await supabase.from('characters').insert({
          user_id: user.id,
          name: char.name,
          level: char.level || 1,
          race: char.race || speciesName || null,
          powers: char.powers || null,
          abilities: char.abilities || null,
          personality: char.personality || null,
          mentality: char.mentality || null,
          lore: char.lore || null,
          home_planet: char.home_planet || null,
          weapons_items: char.weapons_items || null,
        }).select('id').single();

        if (error) {
          if (error.code === '23505') {
            toast.error(`Character "${char.name}" already exists, skipping.`);
          } else {
            console.error('Error creating character:', error);
          }
        } else if (data) {
          characterIds.push({ name: char.name, id: data.id });
          created.characters++;
        }
      }

      // 2. Create selected stories
      const selectedStories = stories.filter(s => s.selected);
      for (const story of selectedStories) {
        const { data, error } = await supabase.from('stories').insert({
          user_id: user.id,
          title: story.title,
          content: story.content,
          summary: story.summary || null,
          is_published: false,
        }).select('id').single();

        if (error) {
          console.error('Error creating story:', error);
        } else if (data) {
          storyIds.push({
            title: story.title,
            id: data.id,
            character_names: story.character_names || [],
          });
          created.stories++;
        }
      }

      // 3. Link stories to characters via story_characters
      for (const story of storyIds) {
        for (const charName of story.character_names) {
          const matchedChar = characterIds.find(
            c => c.name.toLowerCase() === charName.toLowerCase()
          );
          if (matchedChar) {
            const { error } = await supabase.from('story_characters').insert({
              story_id: story.id,
              character_id: matchedChar.id,
            });
            if (!error) created.links++;
          }
        }
      }

      // 4. Create a character group and add all characters if enabled
      if (createGroup && characterIds.length >= 2) {
        const groupName = `${speciesName} Characters`;
        const { data: groupData, error: groupError } = await supabase
          .from('character_groups')
          .insert({
            user_id: user.id,
            name: groupName,
            description: `Characters of the ${speciesName} species, auto-discovered from species info.`,
            color: '#8B5CF6',
          })
          .select('id')
          .single();

        if (!groupError && groupData) {
          for (const char of characterIds) {
            await supabase.from('character_group_members').insert({
              group_id: groupData.id,
              character_id: char.id,
            });
          }
          created.group = true;
        }
      }

      // Summary toast
      const parts: string[] = [];
      if (created.characters > 0) parts.push(`${created.characters} character${created.characters > 1 ? 's' : ''}`);
      if (created.stories > 0) parts.push(`${created.stories} stor${created.stories > 1 ? 'ies' : 'y'}`);
      if (created.group) parts.push('1 group');
      if (created.links > 0) parts.push(`${created.links} link${created.links > 1 ? 's' : ''}`);

      if (parts.length > 0) {
        toast.success(`Created ${parts.join(', ')}!`);
      } else {
        toast.info('No items were created.');
      }

      onComplete();
    } catch (error) {
      console.error('Discovery creation error:', error);
      toast.error('Failed to create some items');
    } finally {
      setIsCreating(false);
    }
  };

  if (characters.length === 0 && stories.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Discoveries from Species Info
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The AI found characters and stories in your text. Select which to create — they'll be linked automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Characters */}
        {characters.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Characters ({selectedCharCount}/{characters.length})
            </h4>
            <div className="space-y-1.5">
              {characters.map((char, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2.5 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={char.selected}
                    onCheckedChange={() => toggleCharacter(i)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{char.name}</span>
                      {char.race && <Badge variant="secondary" className="text-xs">{char.race}</Badge>}
                      {char.level && <Badge variant="outline" className="text-xs">Lv.{char.level}</Badge>}
                    </div>
                    {char.lore && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{char.lore}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Stories */}
        {stories.length > 0 && (
          <>
            {characters.length > 0 && <Separator />}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Stories ({selectedStoryCount}/{stories.length})
              </h4>
              <div className="space-y-1.5">
                {stories.map((story, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-2.5 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={story.selected}
                      onCheckedChange={() => toggleStory(i)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{story.title}</span>
                      {story.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{story.summary}</p>
                      )}
                      {story.character_names && story.character_names.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Link className="h-3 w-3 text-muted-foreground" />
                          {story.character_names.map((name, j) => (
                            <Badge key={j} variant="outline" className="text-xs py-0">{name}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Group toggle */}
        {characters.length >= 2 && (
          <>
            <Separator />
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={createGroup}
                onCheckedChange={(v) => setCreateGroup(!!v)}
              />
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="text-sm">Auto-create "{speciesName} Characters" group</span>
            </label>
          </>
        )}

        {/* Action */}
        <Button
          onClick={handleCreateAll}
          disabled={isCreating || (selectedCharCount === 0 && selectedStoryCount === 0)}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Swords className="w-4 h-4 mr-2" />
              Create {selectedCharCount > 0 ? `${selectedCharCount} Character${selectedCharCount > 1 ? 's' : ''}` : ''}
              {selectedCharCount > 0 && selectedStoryCount > 0 ? ' & ' : ''}
              {selectedStoryCount > 0 ? `${selectedStoryCount} Stor${selectedStoryCount > 1 ? 'ies' : 'y'}` : ''}
              {createGroup && selectedCharCount >= 2 ? ' + Group' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
