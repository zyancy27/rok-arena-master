import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, ChevronDown, Sparkles, Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SolarSystemData {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
}

interface SolarSystemSelectorProps {
  systems: SolarSystemData[];
  currentSystem: SolarSystemData | null;
  onSystemChange: (system: SolarSystemData) => void;
  onSystemCreated: () => void;
  onSystemDeleted: () => void;
}

export default function SolarSystemSelector({
  systems,
  currentSystem,
  onSystemChange,
  onSystemCreated,
  onSystemDeleted,
}: SolarSystemSelectorProps) {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const userSystems = systems.filter(s => s.user_id === user?.id);
  const otherSystems = systems.filter(s => s.user_id !== user?.id);

  const handleCreateSystem = async () => {
    if (!newName.trim() || !user) {
      toast.error('Please enter a name for your solar system');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('solar_systems')
        .insert({
          user_id: user.id,
          name: newName.trim(),
          description: newDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`${newName} created successfully!`);
      setNewName('');
      setNewDescription('');
      setCreateDialogOpen(false);
      onSystemCreated();
      
      // Switch to the new system
      if (data) {
        onSystemChange(data);
      }
    } catch (error) {
      console.error('Failed to create solar system:', error);
      toast.error('Failed to create solar system');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSystem = async () => {
    if (!currentSystem || !newName.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('solar_systems')
        .update({
          name: newName.trim(),
          description: newDescription.trim() || null,
        })
        .eq('id', currentSystem.id);

      if (error) throw error;

      toast.success('Solar system updated!');
      setEditDialogOpen(false);
      onSystemCreated(); // Refresh the list
    } catch (error) {
      console.error('Failed to update solar system:', error);
      toast.error('Failed to update solar system');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSystem = async () => {
    if (!currentSystem) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('solar_systems')
        .delete()
        .eq('id', currentSystem.id);

      if (error) throw error;

      toast.success(`${currentSystem.name} has been deleted`);
      setDeleteDialogOpen(false);
      onSystemDeleted();
    } catch (error) {
      console.error('Failed to delete solar system:', error);
      toast.error('Failed to delete solar system');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = () => {
    if (currentSystem) {
      setNewName(currentSystem.name);
      setNewDescription(currentSystem.description || '');
      setEditDialogOpen(true);
    }
  };

  const isCurrentUserOwner = currentSystem?.user_id === user?.id;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {currentSystem?.name || 'Select Solar System'}
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {userSystems.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Your Solar Systems
              </div>
              {userSystems.map((system) => (
                <DropdownMenuItem
                  key={system.id}
                  onClick={() => onSystemChange(system)}
                  className={currentSystem?.id === system.id ? 'bg-accent' : ''}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {system.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          
          {otherSystems.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Other Solar Systems
              </div>
              {otherSystems.map((system) => (
                <DropdownMenuItem
                  key={system.id}
                  onClick={() => onSystemChange(system)}
                  className={currentSystem?.id === system.id ? 'bg-accent' : ''}
                >
                  <Sparkles className="w-4 h-4 mr-2 opacity-50" />
                  {system.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Solar System
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Create New Solar System
                </DialogTitle>
                <DialogDescription>
                  Create a new solar system to organize your planets and characters.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="system-name">Solar System Name</Label>
                  <Input
                    id="system-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Sol, Alpha Centauri, Trappist..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system-description">Description (optional)</Label>
                  <Textarea
                    id="system-description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe the lore of this galaxy..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSystem} disabled={saving || !newName.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Solar System
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit/Delete buttons for owned systems */}
      {currentSystem && isCurrentUserOwner && (
        <>
          <Button variant="ghost" size="icon" onClick={openEditDialog} title="Edit galaxy">
            <Pencil className="w-4 h-4" />
          </Button>
          
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete galaxy">
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Solar System</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{currentSystem.name}"? This will also delete all planets and sun customizations. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteSystem} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete Solar System
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Solar System
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-system-name">Solar System Name</Label>
              <Input
                id="edit-system-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Galaxy name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-system-description">Description</Label>
              <Textarea
                id="edit-system-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Galaxy description..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSystem} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
