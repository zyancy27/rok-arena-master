
-- Add visibility to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Campaign join requests table
CREATE TABLE public.campaign_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.campaign_join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view requests for campaigns they're part of or their own requests
CREATE POLICY "Users can view their own requests"
  ON public.campaign_join_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_join_requests.campaign_id AND c.creator_id = auth.uid()
    )
    OR is_admin_or_moderator()
  );

-- Users can create join requests
CREATE POLICY "Users can create join requests"
  ON public.campaign_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Campaign creator can update (accept/decline) requests
CREATE POLICY "Creator can update join requests"
  ON public.campaign_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_join_requests.campaign_id AND c.creator_id = auth.uid()
    )
    OR is_admin_or_moderator()
  );

-- Users can delete their own pending requests, creators can delete any
CREATE POLICY "Users can delete own requests"
  ON public.campaign_join_requests FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_join_requests.campaign_id AND c.creator_id = auth.uid()
    )
    OR is_admin_or_moderator()
  );

CREATE TRIGGER update_campaign_join_requests_updated_at
  BEFORE UPDATE ON public.campaign_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
