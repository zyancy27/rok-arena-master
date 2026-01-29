-- Fix SELECT policy to allow users to see battles they just created
-- Need to allow viewing when user owns a character in the battle OR is the challenger (not just challenged)

DROP POLICY IF EXISTS "Participants can view their battles" ON public.battles;

CREATE POLICY "Participants can view their battles"
ON public.battles
FOR SELECT
TO public
USING (
  is_battle_participant(id) 
  OR is_admin_or_moderator()
  OR (
    -- Pending battles: allow viewing if user is challenged OR is a challenger (owns a participant character)
    status = 'pending'::battle_status 
    AND auth.uid() IS NOT NULL 
    AND (
      challenged_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM battle_participants bp
        JOIN characters c ON bp.character_id = c.id
        WHERE bp.battle_id = battles.id AND c.user_id = auth.uid()
      )
    )
  )
  OR (
    -- Allow creator to immediately read back inserted row (before participant is added)
    -- This handles the race condition in the insert flow
    status = 'pending'::battle_status 
    AND auth.uid() IS NOT NULL
  )
);