
-- Add per-player scene state to battle_participants
ALTER TABLE public.battle_participants
  ADD COLUMN IF NOT EXISTS scene_location text,
  ADD COLUMN IF NOT EXISTS scene_tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scene_effect_tags jsonb DEFAULT '[]'::jsonb;

-- Add per-message theme snapshot to battle_messages
ALTER TABLE public.battle_messages
  ADD COLUMN IF NOT EXISTS theme_snapshot jsonb;
