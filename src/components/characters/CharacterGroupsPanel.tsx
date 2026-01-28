import { useState } from 'react';
import { useCharacterGroups, useCharacterGroupMemberships } from '@/hooks/use-character-groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';

const GROUP_COLORS = [
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#14B8A6', label: 'Teal' },
];

interface CharacterGroupsPanelProps {
  characterId: string;
  readOnly?: boolean;
}

export default function CharacterGroupsPanel({ characterId, readOnly = false }: CharacterGroupsPanelProps) {
  const { groups, loading: groupsLoading, createGroup, updateGroup, deleteGroup } = useCharacterGroups();
  const { memberships, loading: membershipsLoading, addToGroup, removeFromGroup } = useCharacterGroupMemberships(characterId);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#8B5CF6');

  const loading = groupsLoading || membershipsLoading;

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    const result = await createGroup(newGroupName.trim(), newGroupDescription.trim(), newGroupColor);
    if (result) {
      setShowCreateDialog(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#8B5CF6');
    }
  };

  const handleUpdateGroup = async (groupId: string) => {
    if (!newGroupName.trim()) return;
    
    const result = await updateGroup(groupId, {
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || null,
      color: newGroupColor,
    });
    
    if (result) {
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#8B5CF6');
    }
  };

  const handleToggleMembership = async (groupId: string, isCurrentlyMember: boolean) => {
    if (isCurrentlyMember) {
      await removeFromGroup(groupId);
    } else {
      await addToGroup(groupId);
    }
  };

  const openEditDialog = (group: typeof groups[0]) => {
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || '');
    setNewGroupColor(group.color);
    setEditingGroup(group.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Loading groups...</div>
      </div>
    );
  }

  if (readOnly) {
    const memberGroups = groups.filter(g => memberships.includes(g.id));
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">Groups</span>
        </div>
        
        {memberGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">This character is not in any groups.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {memberGroups.map(group => (
              <Badge
                key={group.id}
                style={{ backgroundColor: group.color }}
                className="text-white"
              >
                {group.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Groups & Teams</h3>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a group to organize your characters into teams, factions, or any category.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Team Alpha, Villains, Main Cast"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="group-description">Description (optional)</Label>
                <Textarea
                  id="group-description"
                  placeholder="Brief description of this group..."
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: newGroupColor }}
                        />
                        {GROUP_COLORS.find(c => c.value === newGroupColor)?.label || 'Select color'}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">No groups yet</p>
          <p className="text-sm text-muted-foreground">
            Create groups to organize your characters into teams or categories.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isMember = memberships.includes(group.id);
            
            return (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={isMember}
                    onCheckedChange={() => handleToggleMembership(group.id, isMember)}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <div>
                    <label
                      htmlFor={`group-${group.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {group.name}
                    </label>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Edit Dialog */}
                  <Dialog open={editingGroup === group.id} onOpenChange={(open) => !open && setEditingGroup(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(group)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Group</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-group-name">Name</Label>
                          <Input
                            id="edit-group-name"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-group-description">Description</Label>
                          <Textarea
                            id="edit-group-description"
                            value={newGroupDescription}
                            onChange={(e) => setNewGroupDescription(e.target.value)}
                            rows={2}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Color</Label>
                          <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                            <SelectTrigger>
                              <SelectValue>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: newGroupColor }}
                                  />
                                  {GROUP_COLORS.find(c => c.value === newGroupColor)?.label}
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {GROUP_COLORS.map(color => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: color.value }}
                                    />
                                    {color.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingGroup(null)}>
                          Cancel
                        </Button>
                        <Button onClick={() => handleUpdateGroup(group.id)} disabled={!newGroupName.trim()}>
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Delete Confirmation */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{group.name}"? All characters will be removed from this group. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteGroup(group.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Current memberships summary */}
      {memberships.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">This character belongs to:</p>
          <div className="flex flex-wrap gap-2">
            {groups
              .filter(g => memberships.includes(g.id))
              .map(group => (
                <Badge
                  key={group.id}
                  style={{ backgroundColor: group.color }}
                  className="text-white"
                >
                  {group.name}
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
