
-- Step 1: Add campaign_length to campaigns table
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS campaign_length text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS genre text NULL,
  ADD COLUMN IF NOT EXISTS tone text NULL,
  ADD COLUMN IF NOT EXISTS elapsed_hours numeric NOT NULL DEFAULT 0;

-- Step 2: Create campaign_brain table - the narrator's persistent memory
CREATE TABLE public.campaign_brain (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  
  -- Core story spine
  premise text NOT NULL DEFAULT '',
  genre text NULL,
  tone text NULL,
  campaign_objective text NULL,
  core_storyline text NULL,
  victory_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Arc tracking
  major_arcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_arc text NULL,
  active_story_beats jsonb NOT NULL DEFAULT '[]'::jsonb,
  unresolved_threads jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Truths and secrets
  known_truths jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden_truths jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Pressure and pacing
  future_pressures jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign_length_target text NOT NULL DEFAULT 'medium',
  remaining_narrative_runway text NULL,
  
  -- Time state
  current_day integer NOT NULL DEFAULT 1,
  current_time_block text NOT NULL DEFAULT 'morning',
  elapsed_hours numeric NOT NULL DEFAULT 0,
  
  -- World snapshot
  world_summary text NULL,
  faction_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  npc_roster_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Location and pressure
  current_location text NULL,
  current_pressure text NULL,
  
  -- Player tracking
  player_impact_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Opening
  opening_hook text NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(campaign_id)
);

-- Step 3: Expand campaign_npcs with enriched NPC data model
ALTER TABLE public.campaign_npcs
  ADD COLUMN IF NOT EXISTS full_name text NULL,
  ADD COLUMN IF NOT EXISTS first_name text NULL,
  ADD COLUMN IF NOT EXISTS title_honorific text NULL,
  ADD COLUMN IF NOT EXISTS occupation text NULL,
  ADD COLUMN IF NOT EXISTS home_zone text NULL,
  ADD COLUMN IF NOT EXISTS age_range text NULL,
  ADD COLUMN IF NOT EXISTS gender_presentation text NULL,
  ADD COLUMN IF NOT EXISTS personality_traits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS temperament text NULL,
  ADD COLUMN IF NOT EXISTS faction_ties jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_ties jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fears jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS secrets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_disposition integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS relationship_summary text NULL,
  ADD COLUMN IF NOT EXISTS notable_hooks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mobility text NOT NULL DEFAULT 'sedentary',
  ADD COLUMN IF NOT EXISTS story_relevance_level text NOT NULL DEFAULT 'background',
  ADD COLUMN IF NOT EXISTS memory_summary text NULL,
  ADD COLUMN IF NOT EXISTS knows_key_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS likely_to_initiate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_outgoing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_chaotic boolean NOT NULL DEFAULT false;

-- Step 4: RLS for campaign_brain
ALTER TABLE public.campaign_brain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign creator can manage brain"
  ON public.campaign_brain FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c 
    WHERE c.id = campaign_brain.campaign_id AND c.creator_id = auth.uid()
  ));

CREATE POLICY "Campaign members can view brain"
  ON public.campaign_brain FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_participants cp 
    WHERE cp.campaign_id = campaign_brain.campaign_id AND cp.user_id = auth.uid()
  ));

-- Step 5: Auto-update updated_at trigger for campaign_brain
CREATE TRIGGER update_campaign_brain_updated_at
  BEFORE UPDATE ON public.campaign_brain
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
