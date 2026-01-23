import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFriends } from '@/hooks/use-friends';
import { Eye, Loader2, Orbit, Globe, Sun, Users } from 'lucide-react';

interface SolarSystemPreview {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  planet_count: number;
  character_count: number;
  owner: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FriendSystemsViewerProps {
  onViewSystem: (systemId: string, ownerId: string) => void;
}

export default function FriendSystemsViewer({ onViewSystem }: FriendSystemsViewerProps) {
  const { friends, following, loading: friendsLoading } = useFriends();
  const [systems, setSystems] = useState<SolarSystemPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriendSystems();
  }, [friends, following]);

  const fetchFriendSystems = async () => {
    // Combine friends and following to get all connected users
    const connectedUserIds = [
      ...friends.map(f => f.profile.id),
      ...following.map(f => f.profile.id),
    ];
    
    // Remove duplicates
    const uniqueUserIds = [...new Set(connectedUserIds)];

    if (uniqueUserIds.length === 0) {
      setSystems([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch solar systems for connected users
      const { data: systemsData, error: systemsError } = await supabase
        .from('solar_systems')
        .select('id, name, description, user_id')
        .in('user_id', uniqueUserIds);

      if (systemsError) throw systemsError;

      if (!systemsData || systemsData.length === 0) {
        setSystems([]);
        setLoading(false);
        return;
      }

      // Fetch planet counts
      const systemIds = systemsData.map(s => s.id);
      const { data: planetsData } = await supabase
        .from('planet_customizations')
        .select('solar_system_id')
        .in('solar_system_id', systemIds);

      // Fetch character counts
      const { data: charactersData } = await supabase
        .from('characters')
        .select('solar_system_id')
        .in('solar_system_id', systemIds);

      // Build planet counts map
      const planetCounts: Record<string, number> = {};
      planetsData?.forEach(p => {
        if (p.solar_system_id) {
          planetCounts[p.solar_system_id] = (planetCounts[p.solar_system_id] || 0) + 1;
        }
      });

      // Build character counts map
      const characterCounts: Record<string, number> = {};
      charactersData?.forEach(c => {
        if (c.solar_system_id) {
          characterCounts[c.solar_system_id] = (characterCounts[c.solar_system_id] || 0) + 1;
        }
      });

      // Build owner map from friends/following data
      const ownerMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {};
      [...friends, ...following].forEach(f => {
        ownerMap[f.profile.id] = {
          username: f.profile.username,
          display_name: f.profile.display_name,
          avatar_url: f.profile.avatar_url,
        };
      });

      // Combine all data
      const systemPreviews: SolarSystemPreview[] = systemsData.map(system => ({
        ...system,
        planet_count: planetCounts[system.id] || 0,
        character_count: characterCounts[system.id] || 0,
        owner: ownerMap[system.user_id] || { username: 'Unknown', display_name: null, avatar_url: null },
      }));

      setSystems(systemPreviews);
    } catch (error) {
      console.error('Failed to fetch friend systems:', error);
      toast.error('Failed to load friend solar systems');
    } finally {
      setLoading(false);
    }
  };

  if (friendsLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (friends.length === 0 && following.length === 0) {
    return (
      <Card className="bg-card-gradient border-border">
        <CardContent className="py-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Connections Yet</h3>
          <p className="text-muted-foreground text-sm">
            Add friends or follow other users to view their solar systems!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Orbit className="w-5 h-5 text-primary" />
          Friend Solar Systems
        </CardTitle>
        <CardDescription>
          Explore solar systems from your friends and followed users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {systems.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Your friends haven't created any solar systems yet
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {systems.map((system) => (
                <div
                  key={system.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={system.owner.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {system.owner.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{system.name}</p>
                      <p className="text-sm text-muted-foreground">
                        by @{system.owner.username}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Globe className="w-3 h-3" />
                          {system.planet_count} planets
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="w-3 h-3" />
                          {system.character_count} characters
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onViewSystem(system.id, system.user_id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
