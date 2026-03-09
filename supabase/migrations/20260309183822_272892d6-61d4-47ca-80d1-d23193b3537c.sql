
-- Character Timeline Events table
CREATE TABLE public.character_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  age_or_year text NOT NULL DEFAULT '',
  event_title text NOT NULL DEFAULT '',
  event_description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  emotional_weight integer NOT NULL DEFAULT 3 CHECK (emotional_weight >= 1 AND emotional_weight <= 5),
  visibility text NOT NULL DEFAULT 'public',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own timeline events"
  ON public.character_timeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own timeline events"
  ON public.character_timeline_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timeline events"
  ON public.character_timeline_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timeline events"
  ON public.character_timeline_events FOR DELETE
  USING (auth.uid() = user_id);

-- Narrator can read public/narrator_only events for battle participants
CREATE POLICY "Battle participants can view public timeline events"
  ON public.character_timeline_events FOR SELECT
  USING (
    visibility IN ('public', 'narrator_only')
    AND auth.uid() IS NOT NULL
  );

-- Character Appearance columns on characters table
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS appearance_height text,
  ADD COLUMN IF NOT EXISTS appearance_build text,
  ADD COLUMN IF NOT EXISTS appearance_hair text,
  ADD COLUMN IF NOT EXISTS appearance_eyes text,
  ADD COLUMN IF NOT EXISTS appearance_distinct_features text,
  ADD COLUMN IF NOT EXISTS appearance_clothing_style text,
  ADD COLUMN IF NOT EXISTS appearance_aura text,
  ADD COLUMN IF NOT EXISTS appearance_description text,
  ADD COLUMN IF NOT EXISTS appearance_posture text,
  ADD COLUMN IF NOT EXISTS appearance_voice text,
  ADD COLUMN IF NOT EXISTS appearance_movement_style text,
  ADD COLUMN IF NOT EXISTS appearance_typical_expression text;
