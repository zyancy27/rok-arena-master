
-- Drop enums if they exist from partial earlier attempts
DROP TYPE IF EXISTS public.campaign_status;
DROP TYPE IF EXISTS public.campaign_time;

CREATE TYPE public.campaign_status AS ENUM ('recruiting', 'active', 'paused', 'completed', 'abandoned');
CREATE TYPE public.campaign_time AS ENUM ('dawn', 'morning', 'midday', 'afternoon', 'dusk', 'evening', 'night', 'midnight');

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'recruiting',
  current_zone text NOT NULL DEFAULT 'Starting Area',
  time_of_day public.campaign_time NOT NULL DEFAULT 'morning',
  day_count integer NOT NULL DEFAULT 1,
  difficulty_scale numeric NOT NULL DEFAULT 1.0,
  average_party_level integer NOT NULL DEFAULT 1,
  max_players integer NOT NULL DEFAULT 4,
  campaign_seed text,
  story_context jsonb DEFAULT '{}',
  world_state jsonb DEFAULT '{}',
  name text NOT NULL,
  description text,
  chosen_location text,
  environment_tags jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  campaign_hp integer NOT NULL DEFAULT 100,
  campaign_hp_max integer NOT NULL DEFAULT 100,
  campaign_level integer NOT NULL DEFAULT 1,
  campaign_xp integer NOT NULL DEFAULT 0,
  xp_to_next_level integer NOT NULL DEFAULT 100,
  available_stat_points integer NOT NULL DEFAULT 0,
  stat_overrides jsonb DEFAULT '{}',
  unlocked_abilities jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  last_active_at timestamptz DEFAULT now(),
  power_reset_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, character_id)
);

CREATE TABLE public.campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id uuid REFERENCES public.characters(id),
  sender_type text NOT NULL DEFAULT 'player',
  channel text NOT NULL DEFAULT 'in_universe',
  content text NOT NULL,
  dice_result jsonb,
  theme_snapshot jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_participants;

CREATE POLICY "Authenticated users can view campaigns" ON public.campaigns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator can update campaign" ON public.campaigns FOR UPDATE USING (auth.uid() = creator_id OR is_admin_or_moderator());
CREATE POLICY "Creator can delete campaign" ON public.campaigns FOR DELETE USING (auth.uid() = creator_id OR is_admin_or_moderator());

CREATE POLICY "Anyone can view participants" ON public.campaign_participants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can join campaigns" ON public.campaign_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.campaign_participants FOR UPDATE USING (auth.uid() = user_id OR is_admin_or_moderator());
CREATE POLICY "Users can leave campaigns" ON public.campaign_participants FOR DELETE USING (auth.uid() = user_id OR is_admin_or_moderator());

CREATE POLICY "Members can view messages" ON public.campaign_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.campaign_participants cp WHERE cp.campaign_id = campaign_messages.campaign_id AND cp.user_id = auth.uid()) OR is_admin_or_moderator()
);
CREATE POLICY "Members can send messages" ON public.campaign_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaign_participants cp WHERE cp.campaign_id = campaign_messages.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true)
);

CREATE POLICY "Members can view logs" ON public.campaign_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.campaign_participants cp WHERE cp.campaign_id = campaign_logs.campaign_id AND cp.user_id = auth.uid()) OR is_admin_or_moderator()
);
CREATE POLICY "Authenticated can create logs" ON public.campaign_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_participants_updated_at BEFORE UPDATE ON public.campaign_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
