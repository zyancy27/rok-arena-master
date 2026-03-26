ALTER TABLE public.campaign_brain 
ADD COLUMN IF NOT EXISTS story_hooks jsonb NOT NULL DEFAULT '[]'::jsonb;