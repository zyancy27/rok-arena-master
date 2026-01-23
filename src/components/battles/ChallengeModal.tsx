import { useState, useMemo } from 'react';
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
import { toast } from 'sonner';
import { Swords, Sparkles } from 'lucide-react';
import TierWarning from './TierWarning';

interface ChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCharacter: {
    id: string;
    name: string;
    level: number;
  };
  userCharacters: {
    id: string;
    name: string;
    level: number;
  }[];
}

export default function ChallengeModal({
  open,
  onOpenChange,
  targetCharacter,
  userCharacters,
}: ChallengeModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChallenge = async () => {
    if (!selectedCharacter || !user) {
      toast.error('Please select a character');
      return;
    }

    setIsLoading(true);

    try {
      // Create the battle
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .insert({ status: 'pending' })
        .select()
        .single();

      if (battleError || !battle) throw battleError;

      // Add participants
      const { error: participantError } = await supabase
        .from('battle_participants')
        .insert([
          { battle_id: battle.id, character_id: selectedCharacter, turn_order: 1 },
          { battle_id: battle.id, character_id: targetCharacter.id, turn_order: 2 },
        ]);

      if (participantError) throw participantError;

      toast.success(`Challenge sent to ${targetCharacter.name}!`);
      onOpenChange(false);
      navigate(`/battles/${battle.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create challenge');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            Challenge to Battle
          </DialogTitle>
          <DialogDescription>
            Challenge <span className="text-primary font-semibold">{targetCharacter.name}</span>{' '}
            (Tier {targetCharacter.level}) to a battle in the arena.
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

          {selectedCharacter && (
            <>
              <TierWarning
                attackerTier={userCharacters.find(c => c.id === selectedCharacter)?.level || 1}
                defenderTier={targetCharacter.level}
                attackerName={userCharacters.find(c => c.id === selectedCharacter)?.name || 'Your character'}
                defenderName={targetCharacter.name}
              />
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-primary" />
                  Your character will face off against {targetCharacter.name} in the arena.
                  The challenged player will need to accept before the battle begins.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleChallenge}
            disabled={!selectedCharacter || isLoading}
            className="glow-primary"
          >
            {isLoading ? 'Sending...' : 'Send Challenge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
