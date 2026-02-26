
-- Create battle_invitations table for group PvP invite tracking
CREATE TABLE public.battle_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one invitation per user per battle
ALTER TABLE public.battle_invitations ADD CONSTRAINT unique_battle_user UNIQUE (battle_id, user_id);

-- Enable RLS
ALTER TABLE public.battle_invitations ENABLE ROW LEVEL SECURITY;

-- Invited users can view their invitations
CREATE POLICY "Users can view their own invitations"
  ON public.battle_invitations FOR SELECT
  USING (auth.uid() = user_id OR is_battle_participant(battle_id) OR is_admin_or_moderator());

-- Battle creators can insert invitations
CREATE POLICY "Battle creators can create invitations"
  ON public.battle_invitations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Invited users can update their invitation (accept/decline)
CREATE POLICY "Invited users can update their invitations"
  ON public.battle_invitations FOR UPDATE
  USING (auth.uid() = user_id OR is_admin_or_moderator());

-- Battle creators can delete invitations
CREATE POLICY "Creators can delete invitations"
  ON public.battle_invitations FOR DELETE
  USING (is_battle_participant(battle_id) OR is_admin_or_moderator());

-- Enable realtime for battle_invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_invitations;

-- Update battles SELECT policy to also allow invited users to view
DROP POLICY IF EXISTS "Participants can view their battles" ON public.battles;
CREATE POLICY "Participants can view their battles"
  ON public.battles FOR SELECT
  USING (
    is_battle_participant(id) 
    OR is_admin_or_moderator() 
    OR (
      status = 'pending' AND auth.uid() IS NOT NULL AND (
        challenged_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.battle_participants bp
          JOIN public.characters c ON bp.character_id = c.id
          WHERE bp.battle_id = battles.id AND c.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.battle_invitations bi
          WHERE bi.battle_id = battles.id AND bi.user_id = auth.uid()
        )
      )
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_battle_invitations_updated_at
  BEFORE UPDATE ON public.battle_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
