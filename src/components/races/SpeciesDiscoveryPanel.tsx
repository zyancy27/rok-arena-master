import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Users, BookOpen, FolderPlus, Loader2, Sparkles, Swords, Link, RefreshCw } from 'lucide-react';

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
  existingId?: string; // set if character already exists
}

export interface DiscoveredStory {
  title: string;
  content: string;
  summary?: string;
  character_names?: string[];
  selected: boolean;
  existingId?: string; // set if story already exists
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
      const result = { created: 0, updated: 0, stories: 0, storiesUpdated: 0, group: false, links: 0 };
      const characterIds: { name: string; id: string }[] = [];
      const storyIds: { title: string; id: string; character_names: string[] }[] = [];

      // 1. Create or update selected characters
      const selectedChars = characters.filter(c => c.selected);
      for (const char of selectedChars) {
        const charData = {
          race: char.race || speciesName || null,
          powers: char.powers || null,
          abilities: char.abilities || null,
          personality: char.personality || null,
          mentality: char.mentality || null,
          lore: char.lore || null,
          home_planet: char.home_planet || null,
          weapons_items: char.weapons_items || null,
        };

        if (char.existingId) {
          // Merge: only update fields that have new non-empty values
          const updates: Record<string, any> = {};
          for (const [key, value] of Object.entries(charData)) {
            if (value) updates[key] = value;
          }
          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from('characters')
              .update(updates)
              .eq('id', char.existingId);
            if (!error) result.updated++;
          }
          characterIds.push({ name: char.name, id: char.existingId });
        } else {
          // Create new
          const { data, error } = await supabase.from('characters').insert({
            user_id: user.id,
            name: char.name,
            level: char.level || 1,
            ...charData,
          }).select('id').single();

          if (error) {
            if (error.code === '23505') {
              // Already exists but we missed it — fetch and add to list
              const { data: existing } = await supabase
                .from('characters')
                .select('id')
                .eq('user_id', user.id)
                .ilike('name', char.name)
                .maybeSingle();
              if (existing) {
                characterIds.push({ name: char.name, id: existing.id });
                result.updated++;
              }
            } else {
              console.error('Error creating character:', error);
            }
          } else if (data) {
            characterIds.push({ name: char.name, id: data.id });
            result.created++;
          }
        }
      }

      // 2. Create or update selected stories
      const selectedStories = stories.filter(s => s.selected);
      for (const story of selectedStories) {
        if (story.existingId) {
          // Append new content to existing story
          const { data: existing } = await supabase
            .from('stories')
            .select('content')
            .eq('id', story.existingId)
            .single();
          if (existing) {
            const newContent = existing.content.includes(story.content.substring(0, 50))
              ? existing.content // already contains this content
              : `${existing.content}\n\n---\n\n${story.content}`;
            await supabase.from('stories').update({
              content: newContent,
              summary: story.summary || null,
            }).eq('id', story.existingId);
            result.storiesUpdated++;
          }
          storyIds.push({
            title: story.title,
            id: story.existingId,
            character_names: story.character_names || [],
          });
        } else {
          const { data, error } = await supabase.from('stories').insert({
            user_id: user.id,
            title: story.title,
            content: story.content,
            summary: story.summary || null,
            is_published: false,
          }).select('id').single();

          if (!error && data) {
            storyIds.push({
              title: story.title,
              id: data.id,
              character_names: story.character_names || [],
            });
            result.stories++;
          }
        }
      }

      // 3. Link stories to characters via story_characters (skip existing links)
      for (const story of storyIds) {
        for (const charName of story.character_names) {
          const matchedChar = characterIds.find(
            c => c.name.toLowerCase() === charName.toLowerCase()
          );
          if (matchedChar) {
            // Check if link already exists
            const { data: existingLink } = await supabase
              .from('story_characters')
              .select('id')
              .eq('story_id', story.id)
              .eq('character_id', matchedChar.id)
              .maybeSingle();
            if (!existingLink) {
              const { error } = await supabase.from('story_characters').insert({
                story_id: story.id,
                character_id: matchedChar.id,
              });
              if (!error) result.links++;
            }
          }
        }
      }

      // 4. Create a character group (check for existing first)
      if (createGroup && characterIds.length >= 2) {
        const groupName = `${speciesName} Characters`;
        // Check if group already exists
        const { data: existingGroup } = await supabase
          .from('character_groups')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', groupName)
          .maybeSingle();

        const groupId = existingGroup?.id;
        let finalGroupId = groupId;

        if (!groupId) {
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
            finalGroupId = groupData.id;
            result.group = true;
          }
        }

        if (finalGroupId) {
          for (const char of characterIds) {
            // Check existing membership
            const { data: existingMember } = await supabase
              .from('character_group_members')
              .select('id')
              .eq('group_id', finalGroupId)
              .eq('character_id', char.id)
              .maybeSingle();
            if (!existingMember) {
              await supabase.from('character_group_members').insert({
                group_id: finalGroupId,
                character_id: char.id,
              });
            }
          }
        }
      }

      // Summary toast
      const parts: string[] = [];
      if (result.created > 0) parts.push(`${result.created} new character${result.created > 1 ? 's' : ''}`);
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.stories > 0) parts.push(`${result.stories} new stor${result.stories > 1 ? 'ies' : 'y'}`);
      if (result.storiesUpdated > 0) parts.push(`${result.storiesUpdated} stor${result.storiesUpdated > 1 ? 'ies' : 'y'} updated`);
      if (result.group) parts.push('1 group');
      if (result.links > 0) parts.push(`${result.links} link${result.links > 1 ? 's' : ''}`);

      if (parts.length > 0) {
        toast.success(`${parts.join(', ')}!`);
      } else {
        toast.info('Everything is already up to date.');
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
          Select items to create or update. Existing items (marked <Badge variant="outline" className="text-xs py-0 inline-flex">exists</Badge>) will be updated with new info, not duplicated.
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
                      {char.existingId && (
                        <Badge variant="outline" className="text-xs py-0 border-amber-500/50 text-amber-500">
                          <RefreshCw className="h-2.5 w-2.5 mr-1" />exists
                        </Badge>
                      )}
                      {char.race && <Badge variant="secondary" className="text-xs">{char.race}</Badge>}
                      {char.level && !char.existingId && <Badge variant="outline" className="text-xs">Lv.{char.level}</Badge>}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{story.title}</span>
                        {story.existingId && (
                          <Badge variant="outline" className="text-xs py-0 border-amber-500/50 text-amber-600 dark:text-amber-400">
                            <RefreshCw className="h-2.5 w-2.5 mr-1" />exists
                          </Badge>
                        )}
                      </div>
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
              Processing...
            </>
          ) : (
            <>
              <Swords className="w-4 h-4 mr-2" />
              Save {selectedCharCount > 0 ? `${selectedCharCount} Character${selectedCharCount > 1 ? 's' : ''}` : ''}
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
