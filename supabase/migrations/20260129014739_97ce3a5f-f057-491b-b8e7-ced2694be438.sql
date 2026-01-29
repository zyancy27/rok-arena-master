
-- Add column to track who is being challenged (the target user)
ALTER TABLE public.battles 
ADD COLUMN IF NOT EXISTS challenged_user_id uuid;

-- Update RLS policy to allow challenged users to see pending battles
DROP POLICY IF EXISTS "Participants can view their battles" ON public.battles;

CREATE POLICY "Participants can view their battles"
ON public.battles
FOR SELECT
USING (
  is_battle_participant(battles.id) 
  OR is_admin_or_moderator() 
  OR (status = 'pending' AND auth.uid() IS NOT NULL AND (
    challenged_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM battle_participants bp
      JOIN characters c ON bp.character_id = c.id
      WHERE bp.battle_id = battles.id AND c.user_id = auth.uid()
    )
  ))
);

-- Allow challenged users to add themselves as participants
DROP POLICY IF EXISTS "Users can add participants to their battles" ON public.battle_participants;

CREATE POLICY "Users can add participants to their battles"
ON public.battle_participants
FOR INSERT
WITH CHECK (
  can_add_battle_participant(battle_id, character_id)
  OR (
    -- Allow challenged user to add their own character
    EXISTS (
      SELECT 1 FROM battles b
      WHERE b.id = battle_id 
        AND b.status = 'pending'
        AND b.challenged_user_id = auth.uid()
    )
    AND is_character_owner(character_id)
  )
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_battles_challenged_user_id ON public.battles(challenged_user_id);
