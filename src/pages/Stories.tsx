import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Plus, FileText, Edit, Trash2, Eye, EyeOff, BookOpen, User } from 'lucide-react';

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
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    character_id: '',
    is_published: false,
  });

  useEffect(() => {
    if (user) {
      fetchStories();
      fetchCharacters();
    }
  }, [user]);

  const fetchStories = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        character:characters(id, name)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch stories:', error);
      toast.error('Failed to load stories');
    } else {
      setStories(data || []);
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
      character_id: '',
      is_published: false,
    });
    setEditingStory(null);
  };

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      content: story.content,
      summary: story.summary || '',
      character_id: story.character_id || '',
      is_published: story.is_published,
    });
    setIsDialogOpen(true);
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
      character_id: formData.character_id || null,
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
        toast.success('Story updated!');
        fetchStories();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('stories')
        .insert(storyData);

      if (error) {
        toast.error('Failed to create story');
      } else {
        toast.success('Story created!');
        fetchStories();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (storyId: string) => {
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
            Write and manage stories about your characters
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
                Write a story about your character's adventures
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
                <Label htmlFor="character">Character (optional)</Label>
                <Select
                  value={formData.character_id}
                  onValueChange={(value) => setFormData({ ...formData, character_id: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a character..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="__none__">No character</SelectItem>
                    {characters.map((char) => (
                      <SelectItem key={char.id} value={char.id}>
                        {char.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="content">Story Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your story here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
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

      {/* Stories List */}
      {stories.length === 0 ? (
        <Card className="bg-card-gradient border-border">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
            <p className="text-muted-foreground mb-4">
              Start writing stories about your characters' adventures!
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Write Your First Story
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
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
                    </CardTitle>
                    {story.character && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <User className="w-3 h-3" />
                        <Link to={`/characters/${story.character.id}`} className="hover:underline text-primary">
                          {story.character.name}
                        </Link>
                      </CardDescription>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
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
                            Are you sure you want to delete "{story.title}"? This action cannot be undone.
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
                      <div className="prose prose-invert max-w-none mt-2 p-4 bg-background/50 rounded-lg">
                        <p className="whitespace-pre-wrap font-serif leading-relaxed">
                          {story.content}
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="text-xs text-muted-foreground mt-2">
                  Last updated: {new Date(story.updated_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
