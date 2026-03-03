
-- Table to track active campaign enemies across multiple combat turns
CREATE TABLE public.campaign_enemies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  hp integer NOT NULL,
  hp_max integer NOT NULL,
  description text,
  abilities text,
  weakness text,
  count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active', -- active, defeated, fled, hiding
  behavior_profile text DEFAULT 'aggressive', -- aggressive, defensive, cowardly, ambusher, tactical
  spawned_at_zone text,
  spawned_at_day integer,
  last_action text, -- last thing the enemy did (for narrator context)
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_enemies ENABLE ROW LEVEL SECURITY;

-- Policies: campaign participants can view, creator/participants can manage
CREATE POLICY "Campaign members can view enemies"
  ON public.campaign_enemies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_participants cp
      WHERE cp.campaign_id = campaign_enemies.campaign_id
        AND cp.user_id = auth.uid()
    ) OR is_admin_or_moderator()
  );

CREATE POLICY "Campaign members can insert enemies"
  ON public.campaign_enemies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_participants cp
      WHERE cp.campaign_id = campaign_enemies.campaign_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
    )
  );

CREATE POLICY "Campaign members can update enemies"
  ON public.campaign_enemies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaign_participants cp
      WHERE cp.campaign_id = campaign_enemies.campaign_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
    ) OR is_admin_or_moderator()
  );

CREATE POLICY "Campaign creator can delete enemies"
  ON public.campaign_enemies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_enemies.campaign_id
        AND c.creator_id = auth.uid()
    ) OR is_admin_or_moderator()
  );

-- Trigger for updated_at
CREATE TRIGGER update_campaign_enemies_updated_at
  BEFORE UPDATE ON public.campaign_enemies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live HP updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_enemies;
