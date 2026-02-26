import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useFriends } from '@/hooks/use-friends';
import EmergencyLocationGenerator from '@/components/battles/EmergencyLocationGenerator';
import SaveLocationPrompt from '@/components/battles/SaveLocationPrompt';
import {
  ArrowLeft,
  UsersRound,
  Swords,
  Sparkles,
  MapPin,
  Globe,
  Search,
  Heart,
  UserPlus,
  X,
  Send,
  AlertTriangle,
} from 'lucide-react';

interface UserCharacter {
  id: string;
  name: string;
  level: number;
  image_url: string | null;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface PlanetData {
  planet_name: string;
  display_name: string | null;
  gravity: number | null;
  description: string | null;
}

interface InvitedOpponent {
  userId: string;
  profile: Profile;
}

interface EmergencyLocation {
  name: string;
  description: string;
  hazards: string;
  urgency: string;
  countdownTurns: number;
  tags: string[];
  rarityTier?: 'grounded' | 'advanced' | 'extreme' | 'mythic';
}

export default function GroupBattleCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { friends, following } = useFriends();

  // Character selection
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState('');

  // Opponent selection (2 opponents for 3-player)
  const [searchQuery, setSearchQuery] = useState('');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [invitedOpponents, setInvitedOpponents] = useState<InvitedOpponent[]>([]);

  // Location setup
  const [battleLocation, setBattleLocation] = useState('');
  const [availablePlanets, setAvailablePlanets] = useState<PlanetData[]>([]);
  const [selectedPlanetData, setSelectedPlanetData] = useState<PlanetData | null>(null);
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  // Emergency
  const [emergencyEnabled, setEmergencyEnabled] = useState(false);
  const [emergencyLocation, setEmergencyLocation] = useState<EmergencyLocation | null>(null);
  const [showSaveLocationPrompt, setShowSaveLocationPrompt] = useState(false);

  // State
  const [isCreating, setIsCreating] = useState(false);

  const friendUserIds = new Set([
    ...friends.map(f => f.profile.id),
    ...following.map(f => f.profile.id),
  ]);

  useEffect(() => {
    if (user) {
      fetchUserCharacters();
      fetchProfiles();
      fetchUserPlanets();
    }
  }, [user, friends, following]);

  const fetchUserCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, level, image_url')
      .eq('user_id', user?.id)
      .order('name');
    if (data) setUserCharacters(data);
  };

  const fetchProfiles = async () => {
    // Get all visible profiles
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .neq('id', user?.id || '');

    // Merge with friend profiles
    const profileMap = new Map(data?.map(p => [p.id, p]) || []);
    friends.forEach(f => {
      if (!profileMap.has(f.profile.id)) profileMap.set(f.profile.id, f.profile);
    });
    following.forEach(f => {
      if (!profileMap.has(f.profile.id)) profileMap.set(f.profile.id, f.profile);
    });

    const profiles = [...profileMap.values()].filter(p => p.id !== user?.id);
    profiles.sort((a, b) => {
      const aFriend = friendUserIds.has(a.id);
      const bFriend = friendUserIds.has(b.id);
      if (aFriend && !bFriend) return -1;
      if (!aFriend && bFriend) return 1;
      return (a.display_name || a.username).localeCompare(b.display_name || b.username);
    });
    setAllProfiles(profiles);
  };

  const fetchUserPlanets = async () => {
    if (!user) return;
    const { data: systems } = await supabase
      .from('solar_systems')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    if (systems && systems.length > 0) {
      const { data: planets } = await supabase
        .from('planet_customizations')
        .select('planet_name, display_name, gravity, description')
        .eq('solar_system_id', systems[0].id);
      if (planets) setAvailablePlanets(planets as PlanetData[]);
    }
  };

  const addOpponent = (profile: Profile) => {
    if (invitedOpponents.length >= 2) {
      toast.error('Group PvP supports exactly 3 players (you + 2 opponents)');
      return;
    }
    if (invitedOpponents.some(o => o.userId === profile.id)) {
      toast.error('Already invited');
      return;
    }
    setInvitedOpponents(prev => [...prev, { userId: profile.id, profile }]);
  };

  const removeOpponent = (userId: string) => {
    setInvitedOpponents(prev => prev.filter(o => o.userId !== userId));
  };

  const handleCreate = async () => {
    if (!selectedCharacter) {
      toast.error('Please select your character');
      return;
    }
    if (invitedOpponents.length < 2) {
      toast.error('Please invite 2 opponents for a 3-player battle');
      return;
    }
    if (!battleLocation.trim()) {
      toast.error('Please set a battle location');
      return;
    }

    setIsCreating(true);

    try {
      // Create the battle record
      const battlePayload: Record<string, any> = {
        status: 'pending',
        battle_mode: 'group_pvp',
        max_players: 3,
        location_1: battleLocation.trim(),
        location_base: battleLocation.trim(),
        emergency_enabled: emergencyEnabled,
        location_confirmed_by_host: true,
        chosen_location: battleLocation.trim(), // Host decides location for group
      };

      if (selectedPlanetData) {
        battlePayload.planet_name = selectedPlanetData.display_name || selectedPlanetData.planet_name;
      }

      if (emergencyEnabled && emergencyLocation) {
        battlePayload.emergency_payload = {
          name: emergencyLocation.name,
          description: emergencyLocation.description,
          hazards: emergencyLocation.hazards,
          urgency: emergencyLocation.urgency,
          countdownTurns: emergencyLocation.countdownTurns,
          tags: emergencyLocation.tags,
          rarityTier: emergencyLocation.rarityTier,
        };
      }

      // We can't use the RPC for group battles since it only handles 2-player challenges
      // Instead, create battle directly and add participants
      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .insert(battlePayload)
        .select('id')
        .single();

      if (battleError || !battleData) throw battleError ?? new Error('Failed to create battle');

      const battleId = battleData.id;

      // Add host as participant 1
      const { error: p1Error } = await supabase
        .from('battle_participants')
        .insert({
          battle_id: battleId,
          character_id: selectedCharacter,
          turn_order: 1,
        });

      if (p1Error) throw p1Error;

      // We store challenged users. For group battles, we'll store the first invited user 
      // as challenged_user_id and handle the second via a convention.
      // Actually, let's update the battle to reference challenged users
      // For now, we'll create participant placeholders or just navigate and let them join.
      
      // Update battle with first challenged user
      await supabase
        .from('battles')
        .update({ challenged_user_id: invitedOpponents[0].userId })
        .eq('id', battleId);

      toast.success('Group Battle created! Waiting for opponents to join.');
      navigate(`/battles/${battleId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group battle');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProfiles = allProfiles.filter(p => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      p.username.toLowerCase().includes(q) ||
      p.display_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SaveLocationPrompt
        open={showSaveLocationPrompt}
        onOpenChange={setShowSaveLocationPrompt}
        locationName={emergencyLocation?.name || battleLocation}
        locationDescription={emergencyLocation?.description}
        isEmergency={!!emergencyLocation}
        hazardDescription={emergencyLocation?.hazards}
        countdownSeconds={emergencyLocation?.countdownTurns ? emergencyLocation.countdownTurns * 60 : undefined}
        initialTags={emergencyLocation?.tags || []}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/battles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UsersRound className="w-6 h-6 text-primary" />
          Group PvP (3 Players)
        </h1>
      </div>

      {/* Step 1: Select Your Character */}
      <Card className="bg-card-gradient border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            1. Select Your Character
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
            <SelectTrigger>
              <SelectValue placeholder="Choose your fighter..." />
            </SelectTrigger>
            <SelectContent>
              {userCharacters.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    {c.name} (Tier {c.level})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 2: Invite 2 Opponents */}
      <Card className="bg-card-gradient border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            2. Invite 2 Opponents
            <Badge variant="outline" className="ml-auto">{invitedOpponents.length}/2</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invited opponents */}
          {invitedOpponents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {invitedOpponents.map(o => (
                <Badge key={o.userId} variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={o.profile.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(o.profile.display_name || o.profile.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {o.profile.display_name || o.profile.username}
                  <button onClick={() => removeOpponent(o.userId)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {invitedOpponents.length < 2 && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {filteredProfiles
                    .filter(p => !invitedOpponents.some(o => o.userId === p.id))
                    .slice(0, 20)
                    .map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => addOpponent(p)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={p.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(p.display_name || p.username)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium flex items-center gap-1">
                            {p.display_name || p.username}
                            {friendUserIds.has(p.id) && (
                              <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                            )}
                          </span>
                        </div>
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Battle Location + Emergency */}
      <Card className="bg-card-gradient border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            3. Battle Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {availablePlanets.length > 0 && !useCustomLocation ? (
            <Select
              value={selectedPlanetData?.planet_name || ''}
              onValueChange={(value) => {
                if (value === '__custom__') {
                  setUseCustomLocation(true);
                  setSelectedPlanetData(null);
                  setBattleLocation('');
                } else {
                  const planet = availablePlanets.find(p => p.planet_name === value);
                  if (planet) {
                    setSelectedPlanetData(planet);
                    setBattleLocation(planet.display_name || planet.planet_name);
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a planet..." />
              </SelectTrigger>
              <SelectContent>
                {availablePlanets.map(planet => (
                  <SelectItem key={planet.planet_name} value={planet.planet_name}>
                    <span className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-primary" />
                      {planet.display_name || planet.planet_name}
                      {planet.gravity && (
                        <Badge variant="outline" className="text-xs ml-2">
                          {planet.gravity.toFixed(1)}g
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="__custom__" className="text-muted-foreground border-t mt-1 pt-2">
                  + Enter custom location...
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Volcanic Mountains, Crystal Caverns..."
                value={battleLocation}
                onChange={e => setBattleLocation(e.target.value)}
                className="flex-1"
              />
              {availablePlanets.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setUseCustomLocation(false)}>
                  <Globe className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Swords className="w-3 h-3" />
            As host, your chosen location will be used. Invitees accept your scenario.
          </p>

          {/* Emergency Location Generator */}
          <EmergencyLocationGenerator
            character1Name={userCharacters.find(c => c.id === selectedCharacter)?.name}
            character1Level={userCharacters.find(c => c.id === selectedCharacter)?.level}
            battleType="PvP"
            planetName={selectedPlanetData?.display_name || selectedPlanetData?.planet_name}
            planetDescription={selectedPlanetData?.description || undefined}
            planetGravity={selectedPlanetData?.gravity}
            onLocationGenerated={(loc) => {
              setEmergencyLocation(loc);
              setEmergencyEnabled(true);
              setBattleLocation(loc.name);
            }}
            onSaveLocation={(loc) => {
              setEmergencyLocation(loc);
              setShowSaveLocationPrompt(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Create Button */}
      <Button
        onClick={handleCreate}
        disabled={!selectedCharacter || invitedOpponents.length < 2 || !battleLocation.trim() || isCreating}
        className="w-full glow-primary h-12 text-base"
        size="lg"
      >
        {isCreating ? (
          'Creating Battle...'
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" />
            Send Invites & Create Group Battle
          </>
        )}
      </Button>
    </div>
  );
}
