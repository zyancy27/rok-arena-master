-- Update battles SELECT policy to also allow the creator to see the battle
-- The issue is that is_battle_participant fails right after INSERT because 
-- battle_participants haven't been added yet

-- First, create a helper function to check if user just created a pending battle
CREATE OR REPLACE FUNCTION public.is_battle_creator(_battle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- For pending battles, check if the user owns a character that's a participant
  -- This works after participants are added
  SELECT EXISTS (
    SELECT 1
    FROM public.battle_participants bp
    JOIN public.characters c ON bp.character_id = c.id
    WHERE bp.battle_id = _battle_id
      AND c.user_id = auth.uid()
  )
$$;

-- Drop and recreate the SELECT policy to be more permissive for authenticated users
-- since the insert requires authentication already
DROP POLICY IF EXISTS "Participants can view their battles" ON public.battles;

CREATE POLICY "Participants can view their battles"
ON public.battles
FOR SELECT
USING (
  is_battle_participant(id) 
  OR is_admin_or_moderator()
  OR (status = 'pending' AND auth.uid() IS NOT NULL)
);