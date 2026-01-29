-- Allow battle participants and challenged users to delete pending battles
CREATE POLICY "Participants can delete pending battles"
  ON public.battles
  FOR DELETE
  USING (
    status = 'pending' 
    AND (
      is_battle_participant(id) 
      OR challenged_user_id = auth.uid()
    )
  );

-- Allow battle participants to delete their own participation records
CREATE POLICY "Participants can delete their own participation"
  ON public.battle_participants
  FOR DELETE
  USING (
    -- User owns the character in this participation
    is_character_owner(character_id)
    OR
    -- User is admin
    is_admin_or_moderator()
    OR
    -- User is a participant in this battle (can delete opponent's participation when cancelling)
    (
      EXISTS (
        SELECT 1 FROM battles b
        WHERE b.id = battle_participants.battle_id 
        AND b.status = 'pending'
        AND (
          is_battle_participant(b.id) 
          OR b.challenged_user_id = auth.uid()
        )
      )
    )
  );