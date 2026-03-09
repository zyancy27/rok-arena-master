import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fromDecrypted } from '@/lib/encrypted-query';
import { syncStoryToTimeline, removeStoryTimelineEvents, fetchCharacterStoryPoints } from '@/lib/narrative-sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, FileText, Edit, Trash2, Eye, EyeOff, BookOpen, User, ChevronLeft, ChevronRight, Book, ListOrdered, Users, Clock, Heart, ChevronDown, ScrollText } from 'lucide-react';

interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface StoryCharacter {
  character_id: string;
  character: {
    id: string;
    name: string;
  };
}

interface Story {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  is_published: boolean;
  character_id: string | null;
  created_at: string;
  updated_at: string;
  character?: {
    id: string;
    name: string;
  } | null;
  story_characters?: StoryCharacter[];
  chapters?: Chapter[];
}

interface Character {
  id: string;
  name: string;
}

export default function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [selectedStoryForChapter, setSelectedStoryForChapter] = useState<Story | null>(null);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [storyPoints, setStoryPoints] = useState<Record<string, { timelineEvents: any[]; loreSections: any[] }>>({});
  const [expandedCharStory, setExpandedCharStory] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<Record<string, number>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    is_published: false,
  });

  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);

  const [chapterFormData, setChapterFormData] = useState({
    title: '',
    content: '',
    chapter_number: 1,
  });

  useEffect(() => {
    if (user) {
      fetchStories();
      fetchCharacters();
    }
  }, [user]);

  // Load story points when characters change
  useEffect(() => {
    const loadStoryPoints = async () => {
      const points: Record<string, { timelineEvents: any[]; loreSections: any[] }> = {};
      for (const char of characters) {
        points[char.id] = await fetchCharacterStoryPoints(char.id);
      }
      setStoryPoints(points);
    };
    if (characters.length > 0) loadStoryPoints();
  }, [characters]);

  const fetchStories = async () => {
    if (!user) return;
    
    const { data, error } = await fromDecrypted('stories')
      .select(`
        *,
        character:characters(id, name),
        story_characters(character_id, character:characters(id, name))
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch stories:', error);
      toast.error('Failed to load stories');
    } else {
      // Fetch chapters for each story
      const storiesWithChapters = await Promise.all((data || []).map(async (story) => {
        const { data: chapters } = await supabase
          .from('story_chapters')
          .select('*')
          .eq('story_id', story.id)
          .order('chapter_number', { ascending: true });
        
        return { ...story, chapters: chapters || [] };
      }));
      
      setStories(storiesWithChapters as Story[]);
    }
    setLoading(false);
  };

  const fetchCharacters = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('characters')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');

    if (data) {
      setCharacters(data);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      summary: '',
      is_published: false,
    });
    setSelectedCharacterIds([]);
    setEditingStory(null);
  };

  const resetChapterForm = () => {
    setChapterFormData({
      title: '',
      content: '',
      chapter_number: 1,
    });
    setEditingChapter(null);
    setSelectedStoryForChapter(null);
  };

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      content: story.content,
      summary: story.summary || '',
      is_published: story.is_published,
    });
    // Load linked characters
    const linkedIds = story.story_characters?.map(sc => sc.character_id) || [];
    // Also include legacy single character if present
    if (story.character_id && !linkedIds.includes(story.character_id)) {
      linkedIds.push(story.character_id);
    }
    setSelectedCharacterIds(linkedIds);
    setIsDialogOpen(true);
  };

  const handleAddChapter = (story: Story) => {
    setSelectedStoryForChapter(story);
    const nextChapterNum = (story.chapters?.length || 0) + 1;
    setChapterFormData({
      title: `Chapter ${nextChapterNum}`,
      content: '',
      chapter_number: nextChapterNum,
    });
    setIsChapterDialogOpen(true);
  };

  const handleEditChapter = (story: Story, chapter: Chapter) => {
    setSelectedStoryForChapter(story);
    setEditingChapter(chapter);
    setChapterFormData({
      title: chapter.title,
      content: chapter.content,
      chapter_number: chapter.chapter_number,
    });
    setIsChapterDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    const storyData = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      summary: formData.summary.trim() || null,
      character_id: selectedCharacterIds.length > 0 ? selectedCharacterIds[0] : null, // Keep legacy field for compatibility
      is_published: formData.is_published,
      user_id: user.id,
    };

    if (editingStory) {
      const { error } = await supabase
        .from('stories')
        .update(storyData)
        .eq('id', editingStory.id);

      if (error) {
        toast.error('Failed to update story');
      } else {
        // Update story_characters junction table
        await supabase.from('story_characters').delete().eq('story_id', editingStory.id);
        if (selectedCharacterIds.length > 0) {
          await supabase.from('story_characters').insert(
            selectedCharacterIds.map(charId => ({
              story_id: editingStory.id,
              character_id: charId
            }))
          );
        }
        toast.success('Story updated!');
        // Sync timeline events for linked characters
        if (selectedCharacterIds.length > 0) {
          await syncStoryToTimeline(editingStory.id, formData.title, formData.content, selectedCharacterIds, user.id);
        }
        fetchStories();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { data: newStory, error } = await supabase
        .from('stories')
        .insert(storyData)
        .select('id')
        .single();

      if (error) {
        toast.error('Failed to create story');
      } else if (newStory) {
        // Add story_characters links
        if (selectedCharacterIds.length > 0) {
          await supabase.from('story_characters').insert(
            selectedCharacterIds.map(charId => ({
              story_id: newStory.id,
              character_id: charId
            }))
          );
        }
        toast.success('Story created!');
        // Sync timeline events for linked characters
        if (selectedCharacterIds.length > 0) {
          await syncStoryToTimeline(newStory.id, formData.title, formData.content, selectedCharacterIds, user.id);
        }
        fetchStories();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStoryForChapter) return;

    if (!chapterFormData.title.trim() || !chapterFormData.content.trim()) {
      toast.error('Chapter title and content are required');
      return;
    }

    const chapterData = {
      story_id: selectedStoryForChapter.id,
      title: chapterFormData.title.trim(),
      content: chapterFormData.content.trim(),
      chapter_number: chapterFormData.chapter_number,
    };

    if (editingChapter) {
      const { error } = await supabase
        .from('story_chapters')
        .update({
          title: chapterData.title,
          content: chapterData.content,
        })
        .eq('id', editingChapter.id);

      if (error) {
        toast.error('Failed to update chapter');
      } else {
        toast.success('Chapter updated!');
        fetchStories();
        setIsChapterDialogOpen(false);
        resetChapterForm();
      }
    } else {
      const { error } = await supabase
        .from('story_chapters')
        .insert(chapterData);

      if (error) {
        toast.error('Failed to create chapter');
        console.error(error);
      } else {
        toast.success('Chapter added!');
        fetchStories();
        setIsChapterDialogOpen(false);
        resetChapterForm();
      }
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const { error } = await supabase
      .from('story_chapters')
      .delete()
      .eq('id', chapterId);

    if (error) {
      toast.error('Failed to delete chapter');
    } else {
      toast.success('Chapter deleted');
      fetchStories();
    }
  };

  const handleDelete = async (storyId: string) => {
    // Remove synced timeline events first
    await removeStoryTimelineEvents(storyId);
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      toast.error('Failed to delete story');
    } else {
      toast.success('Story deleted');
      fetchStories();
    }
  };

  const togglePublish = async (story: Story) => {
    const { error } = await supabase
      .from('stories')
      .update({ is_published: !story.is_published })
      .eq('id', story.id);

    if (error) {
      toast.error('Failed to update story');
    } else {
      toast.success(story.is_published ? 'Story unpublished' : 'Story published!');
      fetchStories();
    }
  };

  const navigateChapter = (storyId: string, direction: 'prev' | 'next', totalChapters: number) => {
    setCurrentChapterIndex(prev => {
      const current = prev[storyId] || 0;
      if (direction === 'prev' && current > 0) {
        return { ...prev, [storyId]: current - 1 };
      } else if (direction === 'next' && current < totalChapters - 1) {
        return { ...prev, [storyId]: current + 1 };
      }
      return prev;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            My Stories
          </h1>
          <p className="text-muted-foreground mt-1">
            Write stories with chapters - your character lore is used in AI battles!
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Story
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {editingStory ? 'Edit Story' : 'Create New Story'}
              </DialogTitle>
              <DialogDescription>
                Write a story about your character's adventures. Add chapters for longer narratives.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="The Battle of..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Link Characters (optional)
                </Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {characters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No characters yet. Create one first!</p>
                  ) : (
                    characters.map((char) => (
                      <div key={char.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`char-${char.id}`}
                          checked={selectedCharacterIds.includes(char.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCharacterIds([...selectedCharacterIds, char.id]);
                            } else {
                              setSelectedCharacterIds(selectedCharacterIds.filter(id => id !== char.id));
                            }
                          }}
                        />
                        <label htmlFor={`char-${char.id}`} className="text-sm cursor-pointer">
                          {char.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected characters' story lore will be used in AI battles
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Summary (optional)</Label>
                <Textarea
                  id="summary"
                  placeholder="A brief summary of your story..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Prologue / Main Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your story's prologue or main content here. You can add chapters after creating the story."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="font-serif"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                  <Label htmlFor="published" className="text-sm">
                    Publish story (visible to others)
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStory ? 'Update Story' : 'Create Story'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chapter Dialog */}
      <Dialog open={isChapterDialogOpen} onOpenChange={(open) => {
        setIsChapterDialogOpen(open);
        if (!open) resetChapterForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
            </DialogTitle>
            <DialogDescription>
              {selectedStoryForChapter && `Adding chapter to: ${selectedStoryForChapter.title}`}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleChapterSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chapter-title">Chapter Title *</Label>
              <Input
                id="chapter-title"
                placeholder="Chapter 1: The Beginning"
                value={chapterFormData.title}
                onChange={(e) => setChapterFormData({ ...chapterFormData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chapter-content">Chapter Content *</Label>
              <Textarea
                id="chapter-content"
                placeholder="Write your chapter here..."
                value={chapterFormData.content}
                onChange={(e) => setChapterFormData({ ...chapterFormData, content: e.target.value })}
                rows={14}
                className="font-serif"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setIsChapterDialogOpen(false);
                resetChapterForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingChapter ? 'Update Chapter' : 'Add Chapter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stories List */}
      {stories.length === 0 ? (
        <Card className="bg-card-gradient border-border">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
            <p className="text-muted-foreground mb-4">
              Start writing stories about your characters! Their lore will be used in AI battles.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Write Your First Story
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => {
            const hasChapters = story.chapters && story.chapters.length > 0;
            const currentIdx = currentChapterIndex[story.id] || 0;
            const currentChapter = hasChapters ? story.chapters![currentIdx] : null;

            return (
              <Card key={story.id} className="bg-card-gradient border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {story.title}
                        {story.is_published ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        {hasChapters && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ListOrdered className="w-3 h-3" />
                            {story.chapters!.length} chapters
                          </span>
                        )}
                      </CardTitle>
                      {/* Show linked characters */}
                      {(story.story_characters && story.story_characters.length > 0) ? (
                        <CardDescription className="flex items-center gap-1 mt-1 flex-wrap">
                          <Users className="w-3 h-3" />
                          {story.story_characters.map((sc, idx) => (
                            <span key={sc.character_id}>
                              <Link to={`/characters/${sc.character.id}`} className="hover:underline text-primary">
                                {sc.character.name}
                              </Link>
                              {idx < story.story_characters!.length - 1 && ', '}
                            </span>
                          ))}
                          <span className="text-xs text-muted-foreground ml-2">• Lore used in AI battles</span>
                        </CardDescription>
                      ) : story.character && (
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          <Link to={`/characters/${story.character.id}`} className="hover:underline text-primary">
                            {story.character.name}
                          </Link>
                          <span className="text-xs text-muted-foreground ml-2">• Lore available in AI battles</span>
                        </CardDescription>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddChapter(story)}
                        title="Add Chapter"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish(story)}
                        title={story.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {story.is_published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(story)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Story</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{story.title}"? This will also delete all chapters. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(story.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {story.summary && (
                    <p className="text-muted-foreground text-sm mb-3 italic">
                      {story.summary}
                    </p>
                  )}
                  
                  <Accordion type="single" collapsible value={expandedStory === story.id ? story.id : undefined}>
                    <AccordionItem value={story.id} className="border-none">
                      <AccordionTrigger 
                        onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                        className="py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        {expandedStory === story.id ? 'Hide story' : 'Read story'}
                      </AccordionTrigger>
                      <AccordionContent>
                        {/* Prologue / Main content */}
                        <div className="prose prose-invert max-w-none mt-2 p-4 bg-background/50 rounded-lg">
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Prologue</h4>
                          <p className="whitespace-pre-wrap font-serif leading-relaxed">
                            {story.content}
                          </p>
                        </div>

                        {/* Chapter Navigation */}
                        {hasChapters && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Book className="w-4 h-4 text-primary" />
                                {currentChapter?.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigateChapter(story.id, 'prev', story.chapters!.length)}
                                  disabled={currentIdx === 0}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                  {currentIdx + 1} / {story.chapters!.length}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigateChapter(story.id, 'next', story.chapters!.length)}
                                  disabled={currentIdx === story.chapters!.length - 1}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditChapter(story, currentChapter!)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{currentChapter?.title}"?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteChapter(currentChapter!.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="prose prose-invert max-w-none p-4 bg-background/50 rounded-lg border border-border">
                              <p className="whitespace-pre-wrap font-serif leading-relaxed">
                                {currentChapter?.content}
                              </p>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Last updated: {new Date(story.updated_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
