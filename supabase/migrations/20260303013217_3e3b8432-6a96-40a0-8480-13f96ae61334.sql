
-- Trade offers between campaign party members
CREATE TABLE public.campaign_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  sender_participant_id UUID NOT NULL REFERENCES public.campaign_participants(id) ON DELETE CASCADE,
  receiver_participant_id UUID NOT NULL REFERENCES public.campaign_participants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.campaign_inventory(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, declined, cancelled
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_trades ENABLE ROW LEVEL SECURITY;

-- Campaign members can view trades in their campaign
CREATE POLICY "Campaign members can view trades"
ON public.campaign_trades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_participants cp
    WHERE cp.campaign_id = campaign_trades.campaign_id
      AND cp.user_id = auth.uid()
  )
  OR is_admin_or_moderator()
);

-- Active campaign members can create trade offers
CREATE POLICY "Active members can create trades"
ON public.campaign_trades FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaign_participants cp
    WHERE cp.id = campaign_trades.sender_participant_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
  )
);

-- Sender can cancel, receiver can accept/decline
CREATE POLICY "Trade participants can update trades"
ON public.campaign_trades FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaign_participants cp
    WHERE (cp.id = campaign_trades.sender_participant_id OR cp.id = campaign_trades.receiver_participant_id)
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
  )
);

-- Sender can delete their own pending trades
CREATE POLICY "Sender can delete pending trades"
ON public.campaign_trades FOR DELETE
USING (
  (
    EXISTS (
      SELECT 1 FROM campaign_participants cp
      WHERE cp.id = campaign_trades.sender_participant_id
        AND cp.user_id = auth.uid()
    )
    AND status = 'pending'
  )
  OR is_admin_or_moderator()
);

-- Enable realtime for trade notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_trades;

-- Trigger for updated_at
CREATE TRIGGER update_campaign_trades_updated_at
BEFORE UPDATE ON public.campaign_trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
