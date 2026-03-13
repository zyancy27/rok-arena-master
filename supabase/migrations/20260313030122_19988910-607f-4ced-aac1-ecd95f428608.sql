
-- Add relationship layers and behavior tracking to narrator_sentiments
ALTER TABLE public.narrator_sentiments
  ADD COLUMN IF NOT EXISTS relationship_stage text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS curiosity integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS respect integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS trust integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS amusement integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS disappointment integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intrigue integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS story_value integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS creativity_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS world_interaction_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS npc_interaction_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS exploration_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS combat_style_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS story_engagement_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS story_compatibility integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS narrator_observations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nickname_history text[] NOT NULL DEFAULT '{}';
