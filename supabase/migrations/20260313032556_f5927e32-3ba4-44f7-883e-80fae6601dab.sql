
-- World State table
CREATE TABLE public.world_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  region_name text NOT NULL DEFAULT 'Unknown Region',
  active_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  environment_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  danger_level integer NOT NULL DEFAULT 0,
  npc_activity_summary text,
  faction_activity_summary text,
  last_simulated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, region_name)
);

ALTER TABLE public.world_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view world state" ON public.world_state
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_participants cp
    WHERE cp.campaign_id = world_state.campaign_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Campaign creator can manage world state" ON public.world_state
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = world_state.campaign_id AND c.creator_id = auth.uid()
  ));

-- World Events table
CREATE TABLE public.world_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'unknown',
  location text,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text NOT NULL DEFAULT '',
  impact_level integer NOT NULL DEFAULT 1,
  story_relevance integer NOT NULL DEFAULT 1,
  player_proximity integer NOT NULL DEFAULT 0,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.world_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view world events" ON public.world_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_participants cp
    WHERE cp.campaign_id = world_events.campaign_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Campaign creator can manage world events" ON public.world_events
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = world_events.campaign_id AND c.creator_id = auth.uid()
  ));

-- World Rumors table
CREATE TABLE public.world_rumors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  rumor_text text NOT NULL,
  origin_location text,
  related_event_id uuid REFERENCES public.world_events(id) ON DELETE SET NULL,
  spread_level integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.world_rumors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view rumors" ON public.world_rumors
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_participants cp
    WHERE cp.campaign_id = world_rumors.campaign_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Campaign creator can manage rumors" ON public.world_rumors
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = world_rumors.campaign_id AND c.creator_id = auth.uid()
  ));

-- Factions table
CREATE TABLE public.factions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  faction_name text NOT NULL,
  faction_goals text,
  territory_regions jsonb NOT NULL DEFAULT '[]'::jsonb,
  military_strength integer NOT NULL DEFAULT 50,
  current_conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  allies jsonb NOT NULL DEFAULT '[]'::jsonb,
  rivals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view factions" ON public.factions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_participants cp
    WHERE cp.campaign_id = factions.campaign_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Campaign creator can manage factions" ON public.factions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = factions.campaign_id AND c.creator_id = auth.uid()
  ));

-- Extend campaign_npcs with autonomy fields
ALTER TABLE public.campaign_npcs
  ADD COLUMN IF NOT EXISTS npc_goal text,
  ADD COLUMN IF NOT EXISTS npc_motivation text,
  ADD COLUMN IF NOT EXISTS npc_current_activity text,
  ADD COLUMN IF NOT EXISTS npc_relationships jsonb NOT NULL DEFAULT '[]'::jsonb;
