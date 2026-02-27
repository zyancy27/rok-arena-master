import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildSceneTags } from '@/lib/build-scene-tags';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Swords, Sparkles, MapPin, Globe, User } from 'lucide-react';
import EmergencyLocationGenerator from './EmergencyLocationGenerator';
import SaveLocationPrompt from './SaveLocationPrompt';

interface EmergencyLocation {
  name: string;
  description: string;
  hazards: string;
  urgency: string;
  countdownTurns: number;
  tags: string[];
  rarityTier?: 'grounded' | 'advanced' | 'extreme' | 'mythic';
}

interface PlanetData {
  planet_name: string;
  display_name: string | null;
  gravity: number | null;
  description: string | null;
}

interface ChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
  userCharacters: {
    id: string;
    name: string;
    level: number;
  }[];
}

export default function ChallengeModal({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
  userCharacters,
}: ChallengeModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [userLocation, setUserLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Planet selection
  const [availablePlanets, setAvailablePlanets] = useState<PlanetData[]>([]);
  const [selectedPlanetData, setSelectedPlanetData] = useState<PlanetData | null>(null);
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  // Emergency location
  const [emergencyEnabled, setEmergencyEnabled] = useState(false);
  const [emergencyLocation, setEmergencyLocation] = useState<EmergencyLocation | null>(null);
  const [showSaveLocationPrompt, setShowSaveLocationPrompt] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchUserPlanets();
    }
  }, [open, user]);

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

  const handleChallenge = async () => {
    if (!selectedCharacter || !user) {
      toast.error('Please select a character');
      return;
    }

    if (!userLocation.trim()) {
      toast.error('Please enter a battle location');
      return;
    }

    setIsLoading(true);

    try {
      // Use security-definer RPC to atomically create battle + participant
      const { data: battleId, error: rpcError } = await supabase.rpc(
        'create_battle_challenge',
        {
          _challenged_user_id: targetUserId,
          _location_1: userLocation.trim(),
          _challenger_character_id: selectedCharacter,
        }
      );

      if (rpcError || !battleId) throw rpcError ?? new Error('Failed to create challenge');

      // Update battle with emergency and planet data if set
      const updatePayload: Record<string, any> = {
        location_base: userLocation.trim(),
        location_confirmed_by_host: true,
      };

      if (selectedPlanetData) {
        updatePayload.planet_name = selectedPlanetData.display_name || selectedPlanetData.planet_name;
      }

      if (emergencyEnabled && emergencyLocation) {
        updatePayload.emergency_enabled = true;
        updatePayload.emergency_payload = {
          name: emergencyLocation.name,
          description: emergencyLocation.description,
          hazards: emergencyLocation.hazards,
          urgency: emergencyLocation.urgency,
          countdownTurns: emergencyLocation.countdownTurns,
          tags: emergencyLocation.tags,
          rarityTier: emergencyLocation.rarityTier,
        };
      }

      await supabase.from('battles').update(updatePayload).eq('id', battleId);

      // Set scene_tags on the challenger's participant record
      const sceneTags = buildSceneTags(
        userLocation.trim(),
        emergencyEnabled && emergencyLocation ? emergencyLocation.tags : null,
      );
      await supabase
        .from('battle_participants')
        .update({ scene_location: userLocation.trim(), scene_tags: sceneTags })
        .eq('battle_id', battleId);

      toast.success(`Challenge sent to ${targetUsername}!`);
      onOpenChange(false);
      navigate(`/battles/${battleId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCharacter('');
    setUserLocation('');
    setEmergencyLocation(null);
    setEmergencyEnabled(false);
    setSelectedPlanetData(null);
    setUseCustomLocation(false);
    onOpenChange(false);
  };

  const selectedChar = userCharacters.find(c => c.id === selectedCharacter);

  return (
    <>
      <SaveLocationPrompt
        open={showSaveLocationPrompt}
        onOpenChange={setShowSaveLocationPrompt}
        locationName={emergencyLocation?.name || userLocation}
        locationDescription={emergencyLocation?.description}
        isEmergency={!!emergencyLocation}
        hazardDescription={emergencyLocation?.hazards}
        countdownSeconds={emergencyLocation?.countdownTurns ? emergencyLocation.countdownTurns * 60 : undefined}
        initialTags={emergencyLocation?.tags || []}
      />

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Challenge Player
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Challenge <span className="text-primary font-semibold">{targetUsername}</span> to a battle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Character Selection */}
            <div className="space-y-2">
              <Label>Select Your Character</Label>
              <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a character..." />
                </SelectTrigger>
                <SelectContent>
                  {userCharacters.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No characters available
                    </SelectItem>
                  ) : (
                    userCharacters.map((char) => (
                      <SelectItem key={char.id} value={char.id}>
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          {char.name} (Tier {char.level})
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Battle Location
              </Label>

              {availablePlanets.length > 0 && !useCustomLocation ? (
                <Select
                  value={selectedPlanetData?.planet_name || ''}
                  onValueChange={(value) => {
                    if (value === '__custom__') {
                      setUseCustomLocation(true);
                      setSelectedPlanetData(null);
                      setUserLocation('');
                    } else {
                      const planet = availablePlanets.find(p => p.planet_name === value);
                      if (planet) {
                        setSelectedPlanetData(planet);
                        setUserLocation(planet.display_name || planet.planet_name);
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
                    <SelectItem value="__custom__" className="text-muted-foreground">
                      + Custom location...
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Volcanic Mountains, Frozen Tundra"
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    className="flex-1"
                  />
                  {availablePlanets.length > 0 && (
                    <Button variant="outline" size="icon" onClick={() => setUseCustomLocation(false)}>
                      <Globe className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Your opponent will also choose a location. A coin flip decides which is used.
              </p>
            </div>

            {/* Emergency Location */}
            <EmergencyLocationGenerator
              character1Name={selectedChar?.name}
              character1Level={selectedChar?.level}
              battleType="PvP"
              planetName={selectedPlanetData?.display_name || selectedPlanetData?.planet_name}
              planetDescription={selectedPlanetData?.description || undefined}
              planetGravity={selectedPlanetData?.gravity}
              onLocationGenerated={(loc) => {
                setEmergencyLocation(loc);
                setEmergencyEnabled(true);
                setUserLocation(loc.name);
              }}
              onSaveLocation={(loc) => {
                setEmergencyLocation(loc);
                setShowSaveLocationPrompt(true);
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleChallenge}
              disabled={!selectedCharacter || !userLocation.trim() || isLoading}
              className="glow-primary"
            >
              {isLoading ? 'Sending...' : 'Send Challenge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
