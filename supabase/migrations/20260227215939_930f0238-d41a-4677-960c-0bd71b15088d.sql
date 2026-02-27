
-- Allow battle participants to delete completed battles they participated in
CREATE POLICY "Participants can delete completed battles"
  ON public.battles
  FOR DELETE
  USING (
    status = 'completed'::battle_status
    AND is_battle_participant(id)
  );

-- Allow battle participants to delete messages from their battles
CREATE POLICY "Participants can delete messages from their battles"
  ON public.battle_messages
  FOR DELETE
  USING (
    is_battle_participant(battle_id)
  );

-- Allow campaign creator to delete campaign messages
CREATE POLICY "Creator can delete campaign messages"
  ON public.campaign_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_messages.campaign_id
      AND c.creator_id = auth.uid()
    )
    OR is_admin_or_moderator()
  );

-- Allow campaign creator to delete campaign logs
CREATE POLICY "Creator can delete campaign logs"
  ON public.campaign_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_logs.campaign_id
      AND c.creator_id = auth.uid()
    )
    OR is_admin_or_moderator()
  );

-- Allow campaign creator to delete campaign inventory
CREATE POLICY "Creator can delete campaign inventory"
  ON public.campaign_inventory
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_inventory.campaign_id
      AND c.creator_id = auth.uid()
    )
    OR is_admin_or_moderator()
  );

-- Allow campaign creator to delete campaign participants
CREATE POLICY "Creator can delete campaign participants"
  ON public.campaign_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_participants.campaign_id
      AND c.creator_id = auth.uid()
    )
    OR is_admin_or_moderator()
  );
