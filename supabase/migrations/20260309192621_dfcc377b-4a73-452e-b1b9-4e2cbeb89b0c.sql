ALTER TABLE public.character_timeline_events 
  ADD COLUMN IF NOT EXISTS origin_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origin_id uuid;