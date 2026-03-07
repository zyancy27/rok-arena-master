DROP POLICY "Users can join campaigns" ON public.campaign_participants;

CREATE POLICY "Users can join campaigns"
ON public.campaign_participants
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  OR
  (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_participants.campaign_id
      AND c.creator_id = auth.uid()
  ))
  OR
  is_admin_or_moderator()
);