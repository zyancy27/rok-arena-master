-- 1. Regional Social State table (social heat + world mood per region)
CREATE TABLE public.regional_social_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  region_name TEXT NOT NULL,
  world_mood TEXT NOT NULL DEFAULT 'neutral',
  civilian_heat INTEGER NOT NULL DEFAULT 0,
  merchant_heat INTEGER NOT NULL DEFAULT 0,
  guard_heat INTEGER NOT NULL DEFAULT 0,
  criminal_heat INTEGER NOT NULL DEFAULT 0,
  faction_heat INTEGER NOT NULL DEFAULT 0,
  community_heat INTEGER NOT NULL DEFAULT 0,
  mood_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_memory JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, region_name)
);

ALTER TABLE public.regional_social_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view social state"
  ON public.regional_social_state FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM campaign_participants cp
    WHERE cp.campaign_id = regional_social_state.campaign_id AND cp.user_id = auth.uid()
  ) OR is_admin_or_moderator());

CREATE POLICY "Campaign creator can manage social state"
  ON public.regional_social_state FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = regional_social_state.campaign_id AND c.creator_id = auth.uid()
  ));

CREATE POLICY "Campaign members can insert social state"
  ON public.regional_social_state FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaign_participants cp
    WHERE cp.campaign_id = regional_social_state.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
  ));

CREATE POLICY "Campaign members can update social state"
  ON public.regional_social_state FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM campaign_participants cp
    WHERE cp.campaign_id = regional_social_state.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
  ) OR is_admin_or_moderator());

CREATE TRIGGER update_regional_social_state_updated_at
  BEFORE UPDATE ON public.regional_social_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. NPC emotional carryover columns on campaign_npcs
ALTER TABLE public.campaign_npcs
  ADD COLUMN IF NOT EXISTS emotional_tone TEXT DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS emotional_memory JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_emotional_shift TEXT DEFAULT NULL;