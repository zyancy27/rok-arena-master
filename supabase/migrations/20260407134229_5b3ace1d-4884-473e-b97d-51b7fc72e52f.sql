
-- Phase 3: Location Identity State
-- Persistent location state: territorial ownership, habits, friction, scene residue, quiet-scene value
CREATE TABLE public.campaign_location_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  
  -- Territorial ownership
  controlled_by TEXT DEFAULT NULL,
  control_type TEXT DEFAULT 'unclaimed',
  control_description TEXT DEFAULT NULL,
  
  -- World habits (local behaviors/customs)
  local_habits JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Environmental friction (what is easy/hard/risky here)
  environmental_friction JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Scene residue (traces of past events)
  scene_residue JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Quiet-scene value (what can be gained here without action)
  quiet_scene_value JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Location personality
  location_mood TEXT DEFAULT 'neutral',
  familiarity_level INTEGER NOT NULL DEFAULT 0,
  times_visited INTEGER NOT NULL DEFAULT 0,
  last_visited_day INTEGER DEFAULT NULL,
  notable_features TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(campaign_id, zone_name)
);

ALTER TABLE public.campaign_location_state ENABLE ROW LEVEL SECURITY;

-- Campaign creator can manage location state
CREATE POLICY "Campaign creator can manage location state"
  ON public.campaign_location_state
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaigns c WHERE c.id = campaign_location_state.campaign_id AND c.creator_id = auth.uid()
  ));

-- Campaign members can view location state
CREATE POLICY "Campaign members can view location state"
  ON public.campaign_location_state
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaign_participants cp WHERE cp.campaign_id = campaign_location_state.campaign_id AND cp.user_id = auth.uid()
  ));

-- Campaign members can insert location state (narrator creates via service role, but allow participants too)
CREATE POLICY "Campaign members can insert location state"
  ON public.campaign_location_state
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaign_participants cp WHERE cp.campaign_id = campaign_location_state.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
  ));

-- Campaign members can update location state
CREATE POLICY "Campaign members can update location state"
  ON public.campaign_location_state
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaign_participants cp WHERE cp.campaign_id = campaign_location_state.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
  ));
