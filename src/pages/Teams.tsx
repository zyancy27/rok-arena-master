import { useState } from 'react';
import { useCharacterGroups, CharacterGroup } from '@/hooks/use-character-groups';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit2, Trash2, Users, FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface GroupMember {
  character_id: string;
  characters: {
    id: string;
    name: string;
    level: number;
    image_url: string | null;
  };
}

export default function Teams() {
  const { user } = useAuth();
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useCharacterGroups();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<CharacterGroup | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#8B5CF6');

  // Fetch members for all groups
  const { data: allMembers } = useQuery({
    queryKey: ['all-group-members', groups.map(g => g.id)],
    queryFn: async () => {
      if (!groups.length) return {};
      
      const { data, error } = await supabase
        .from('character_group_members')
        .select(`
          group_id,
          character_id,
          characters (id, name, level, image_url)
        `)
        .in('group_id', groups.map(g => g.id));

      if (error) throw error;

      // Group by group_id
      const membersByGroup: Record<string, GroupMember[]> = {};
      data?.forEach((member: any) => {
        if (!membersByGroup[member.group_id]) {
          membersByGroup[member.group_id] = [];
        }
        membersByGroup[member.group_id].push(member);
      });
      return membersByGroup;
    },
    enabled: groups.length > 0,
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createGroup(newName.trim(), newDescription.trim() || undefined, newColor);
    setNewName('');
    setNewDescription('');
    setNewColor('#8B5CF6');
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingTeam || !newName.trim()) return;
    await updateGroup(editingTeam.id, {
      name: newName.trim(),
      description: newDescription.trim() || null,
      color: newColor,
    });
    setEditingTeam(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      await deleteGroup(id);
    }
  };

  const openEditDialog = (team: CharacterGroup) => {
    setEditingTeam(team);
    setNewName(team.name);
    setNewDescription(team.description || '');
    setNewColor(team.color);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-primary" />
            Character Teams
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your characters into teams
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-popover">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team to organize your characters.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Team name..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <span className="text-sm text-muted-foreground">{newColor}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first team to start organizing your characters.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((team) => {
            const members = allMembers?.[team.id] || [];
            return (
              <Card key={team.id} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: team.color }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(team)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {team.description && (
                    <CardDescription className="line-clamp-2">
                      {team.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Users className="h-4 w-4" />
                    <span>{members.length} character{members.length !== 1 ? 's' : ''}</span>
                  </div>
                  {members.length > 0 ? (
                    <ScrollArea className="h-24">
                      <div className="space-y-1">
                        {members.map((member) => (
                          <Link
                            key={member.character_id}
                            to={`/characters/${member.character_id}`}
                            className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors"
                          >
                            <span className="truncate">{member.characters.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              Lv.{member.characters.level}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No characters in this team yet
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent className="bg-popover">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                  placeholder="Team name..."
                />
              </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <span className="text-sm text-muted-foreground">{newColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTeam(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!newName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
