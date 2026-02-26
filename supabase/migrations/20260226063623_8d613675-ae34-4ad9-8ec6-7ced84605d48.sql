
-- Add battle_mode, max_players, and emergency location fields to battles table
ALTER TABLE public.battles 
  ADD COLUMN IF NOT EXISTS battle_mode text NOT NULL DEFAULT 'pvp',
  ADD COLUMN IF NOT EXISTS max_players integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS planet_id uuid REFERENCES public.planet_customizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planet_name text,
  ADD COLUMN IF NOT EXISTS location_base text,
  ADD COLUMN IF NOT EXISTS emergency_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_payload jsonb,
  ADD COLUMN IF NOT EXISTS emergency_seed text,
  ADD COLUMN IF NOT EXISTS location_confirmed_by_host boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_shown_arena_intro boolean NOT NULL DEFAULT false;
