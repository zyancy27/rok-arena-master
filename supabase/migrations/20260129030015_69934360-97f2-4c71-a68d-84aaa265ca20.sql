
-- Fix SELECT policy to only show pending battles to relevant parties (not all authenticated users)
-- This prevents canceled/declined battles from appearing if they somehow weren't fully deleted

DROP POLICY IF EXISTS "Participants can view their battles" ON public.battles;

CREATE POLICY "Participants can view their battles"
ON public.battles
FOR SELECT
TO public
USING (
  is_battle_participant(id) 
  OR is_admin_or_moderator()
  OR (
    -- Pending battles: only show to challenged user or battle creator
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
);
