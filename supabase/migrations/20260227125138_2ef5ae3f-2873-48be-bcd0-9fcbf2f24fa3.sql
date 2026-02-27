
-- Campaign inventory items found/equipped during adventures
CREATE TABLE public.campaign_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.campaign_participants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'misc',
  item_rarity TEXT NOT NULL DEFAULT 'common',
  description TEXT,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  stat_bonus JSONB DEFAULT '{}'::jsonb,
  found_at_zone TEXT,
  found_at_day INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.campaign_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory"
  ON public.campaign_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory"
  ON public.campaign_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON public.campaign_inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON public.campaign_inventory FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_inventory;
