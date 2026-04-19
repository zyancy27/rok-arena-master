-- ─────────────────────────────────────────────────────────────────────────
-- ROK Narrator Brain — Phase 1 Foundation Migration
-- 
-- 1. tester_profiles      — flag users as testers/developers
-- 2. tester_feedback      — system-level feedback capture
-- 3. campaign_turn_logs   — raw short-term memory feeding promotion engine
-- 4. campaigns.do_not_learn — exclude from global learning aggregations
-- 5. campaign_brain extensions for promoted memory layers
-- ─────────────────────────────────────────────────────────────────────────

-- 1. TESTER PROFILES ────────────────────────────────────────────────────
CREATE TABLE public.tester_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_tester boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own tester profile"
  ON public.tester_profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_moderator());

CREATE POLICY "Admins manage tester profiles"
  ON public.tester_profiles FOR ALL
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

CREATE TRIGGER update_tester_profiles_updated_at
  BEFORE UPDATE ON public.tester_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is_tester(uuid)
CREATE OR REPLACE FUNCTION public.is_tester(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tester_profiles
    WHERE user_id = _user_id AND is_tester = true
  )
$$;

-- Seed: auto-flag DeadKingSiren
INSERT INTO public.tester_profiles (user_id, is_tester, notes)
VALUES ('56354864-3f1d-47bf-89c8-b2547adee65f', true, 'Primary developer/tester profile')
ON CONFLICT (user_id) DO UPDATE SET is_tester = true;


-- 2. TESTER FEEDBACK ────────────────────────────────────────────────────
CREATE TABLE public.tester_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid,
  message_id uuid,
  category text NOT NULL DEFAULT 'general',
  -- categories: parser_failure, roll_clarity, narrator_consistency,
  -- map_readability, pacing, ux_confusion, memory_promotion, npc_behavior, general
  severity text NOT NULL DEFAULT 'normal',
  -- severity: low | normal | high | critical
  feedback text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Testers create their own feedback"
  ON public.tester_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_tester(auth.uid()));

CREATE POLICY "Users view their own feedback"
  ON public.tester_feedback FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_moderator());

CREATE POLICY "Admins manage feedback"
  ON public.tester_feedback FOR ALL
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

CREATE TRIGGER update_tester_feedback_updated_at
  BEFORE UPDATE ON public.tester_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tester_feedback_user_created ON public.tester_feedback(user_id, created_at DESC);
CREATE INDEX idx_tester_feedback_category ON public.tester_feedback(category) WHERE resolved = false;


-- 3. CAMPAIGN TURN LOGS ────────────────────────────────────────────────
-- Raw, append-only short-term memory. Feeds the Promotion Engine.
-- NOT the same as campaign_brain (which holds promoted/durable memory).
CREATE TABLE public.campaign_turn_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  character_id uuid,
  user_id uuid NOT NULL,
  turn_number integer NOT NULL DEFAULT 0,
  day_number integer NOT NULL DEFAULT 1,
  time_block text,
  zone text,
  raw_input text NOT NULL,
  parsed_intent jsonb DEFAULT '{}'::jsonb,
  resolved_action jsonb DEFAULT '{}'::jsonb,
  roll_result jsonb,
  scene_beat_summary text,
  time_advance numeric DEFAULT 0,
  map_delta jsonb DEFAULT '{}'::jsonb,
  npc_deltas jsonb DEFAULT '[]'::jsonb,
  hook_deltas jsonb DEFAULT '[]'::jsonb,
  opportunity_deltas jsonb DEFAULT '[]'::jsonb,
  consequence_deltas jsonb DEFAULT '[]'::jsonb,
  promoted boolean NOT NULL DEFAULT false,
  promoted_at timestamptz,
  promotion_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_turn_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view turn logs"
  ON public.campaign_turn_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = campaign_turn_logs.campaign_id
        AND cp.user_id = auth.uid()
    )
    OR public.is_admin_or_moderator()
  );

CREATE POLICY "Authenticated insert turn logs"
  ON public.campaign_turn_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creator deletes turn logs"
  ON public.campaign_turn_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_turn_logs.campaign_id
        AND c.creator_id = auth.uid()
    )
    OR public.is_admin_or_moderator()
  );

CREATE POLICY "System updates promotion state"
  ON public.campaign_turn_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_turn_logs.campaign_id
        AND c.creator_id = auth.uid()
    )
    OR public.is_admin_or_moderator()
  );

CREATE INDEX idx_turn_logs_campaign_turn ON public.campaign_turn_logs(campaign_id, turn_number DESC);
CREATE INDEX idx_turn_logs_unpromoted ON public.campaign_turn_logs(campaign_id, created_at) WHERE promoted = false;


-- 4. DO_NOT_LEARN FLAG ON CAMPAIGNS ────────────────────────────────────
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS do_not_learn boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abandonment_reason text;


-- 5. CAMPAIGN_BRAIN EXTENSIONS ─────────────────────────────────────────
-- Promoted memory layers (region mood, social heat, etc.)
ALTER TABLE public.campaign_brain
  ADD COLUMN IF NOT EXISTS region_moods jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS regional_social_heat jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consequence_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rhythm_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS narrator_constitution_version text DEFAULT 'v1';