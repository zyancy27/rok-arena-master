import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';
import { Swords, Sparkles, MapPin, Coins, User } from 'lucide-react';

interface ChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
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
  userCharacters,
}: ChallengeModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [userLocation, setUserLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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
      // Create the battle with location and challenged user
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .insert({ 
          status: 'pending',
          location_1: userLocation.trim(),
          challenged_user_id: targetUserId
        })
        .select('id')
        .single();

      if (battleError || !battle) throw battleError;

      // Add only the challenger as participant - defender will choose their character when accepting
      const { error: participantError } = await supabase
        .from('battle_participants')
        .insert([
          { battle_id: battle.id, character_id: selectedCharacter, turn_order: 1 },
        ]);

      if (participantError) throw participantError;

      // Store the target user ID in the battle somehow - we'll use a simple approach
      toast.success('Challenge sent!');
      onOpenChange(false);
      navigate(`/battles/${battle.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCharacter('');
    setUserLocation('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            Challenge Player
          </DialogTitle>
          <DialogDescription>
            Challenge this opponent to a battle. They will choose which character to fight with when they accept.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Your Battle Location
            </Label>
            <Input
              placeholder="Enter a battle location (e.g., Volcanic Mountains, Frozen Tundra)"
              value={userLocation}
              onChange={(e) => setUserLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="w-3 h-3" />
              A coin flip will decide which location is used when battle begins
            </p>
          </div>

          {selectedCharacter && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                Your opponent will receive the challenge and choose which of their characters to fight with.
              </p>
            </div>
          )}
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
  );
}
