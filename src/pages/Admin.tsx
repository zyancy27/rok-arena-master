import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';
import { Shield, Users, Swords, Trash2, UserCheck, UserX } from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  role?: string;
}

interface BattleData {
  id: string;
  status: string;
  created_at: string;
  winner_id: string | null;
  loser_id: string | null;
}

export default function Admin() {
  const { isAdmin, isModerator } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [battles, setBattles] = useState<BattleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch users with their profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, created_at')
      .order('created_at', { ascending: false });

    if (profilesData) {
      // Get roles for each user
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = profilesData.map(profile => ({
        ...profile,
        role: rolesData?.find(r => r.user_id === profile.id)?.role || 'user',
      }));

      setUsers(usersWithRoles);
    }

    // Fetch battles
    const { data: battlesData } = await supabase
      .from('battles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (battlesData) {
      setBattles(battlesData);
    }

    setLoading(false);
  };

  const handleDeleteBattle = async (battleId: string) => {
    const { error } = await supabase
      .from('battles')
      .delete()
      .eq('id', battleId);

    if (error) {
      toast.error('Failed to delete battle');
      return;
    }

    setBattles(prev => prev.filter(b => b.id !== battleId));
    toast.success('Battle deleted');
  };

  const handleSetRole = async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    // First delete existing role
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Insert new role
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (error) {
      toast.error('Failed to update role');
      return;
    }

    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role } : u))
    );
    toast.success(`Role updated to ${role}`);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'moderator':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!isModerator) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage users and battles
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="battles" className="flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Battles ({battles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="bg-card-gradient border-border">
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage user accounts and roles</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.display_name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role || 'user')}>
                            {user.role || 'user'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              {user.role !== 'moderator' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetRole(user.id, 'moderator')}
                                >
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                              )}
                              {user.role !== 'user' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetRole(user.id, 'user')}
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="battles" className="mt-4">
          <Card className="bg-card-gradient border-border">
            <CardHeader>
              <CardTitle>Battles</CardTitle>
              <CardDescription>Monitor and manage battles</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : battles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No battles yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {battles.map((battle) => (
                      <TableRow key={battle.id}>
                        <TableCell className="font-mono text-xs">
                          {battle.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(battle.status)}>
                            {battle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(battle.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Battle?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this battle and all its messages.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBattle(battle.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
