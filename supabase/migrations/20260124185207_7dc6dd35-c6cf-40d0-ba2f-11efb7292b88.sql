-- Fix battle_participants INSERT policy to allow challenge creation
-- Currently users can only add their own characters, but challenges require adding both characters

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can add their own characters to battles" ON public.battle_participants;

-- Create a helper function to check if user is battle creator (owns a character already in the battle)
-- or is adding their own character to a pending battle
CREATE OR REPLACE FUNCTION public.can_add_battle_participant(_battle_id uuid, _character_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User owns the character being added
    public.is_character_owner(_character_id)
    OR
    -- User is an admin/moderator
    public.is_admin_or_moderator()
    OR
    -- User is adding opponent to a pending battle where they're the creator
    -- (they own another character already in this battle OR battle has no participants yet)
    (
      EXISTS (
        SELECT 1 FROM public.battles b
        WHERE b.id = _battle_id AND b.status = 'pending'
      )
      AND (
        -- User owns another character in this battle (they're the challenger)
        EXISTS (
          SELECT 1 FROM public.battle_participants bp
          JOIN public.characters c ON bp.character_id = c.id
          WHERE bp.battle_id = _battle_id AND c.user_id = auth.uid()
        )
        OR
        -- No participants yet (first insert of the pair)
        NOT EXISTS (
          SELECT 1 FROM public.battle_participants bp
          WHERE bp.battle_id = _battle_id
        )
      )
    )
$$;

-- Create new INSERT policy using the helper function
CREATE POLICY "Users can add participants to their battles"
ON public.battle_participants
FOR INSERT
WITH CHECK (public.can_add_battle_participant(battle_id, character_id));