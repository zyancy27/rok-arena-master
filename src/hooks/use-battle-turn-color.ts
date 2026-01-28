import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEFAULT_COLOR = '#8B5CF6';

export function useBattleTurnColor() {
  const { user } = useAuth();
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's battle turn color preference
  useEffect(() => {
    const fetchColor = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('battle_turn_color')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching battle turn color:', error);
        } else if (data?.battle_turn_color) {
          setColor(data.battle_turn_color);
        }
      } catch (err) {
        console.error('Error fetching battle turn color:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColor();
  }, [user]);

  // Update user's battle turn color preference
  const updateColor = async (newColor: string) => {
    if (!user) return;

    // Optimistically update
    const previousColor = color;
    setColor(newColor);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ battle_turn_color: newColor })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating battle turn color:', error);
        setColor(previousColor);
        toast.error('Failed to save color preference');
      } else {
        toast.success('Battle turn color updated');
      }
    } catch (err) {
      console.error('Error updating battle turn color:', err);
      setColor(previousColor);
      toast.error('Failed to save color preference');
    }
  };

  return {
    color,
    updateColor,
    isLoading,
  };
}
