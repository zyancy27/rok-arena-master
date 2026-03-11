ALTER TABLE public.campaign_participants 
ADD COLUMN IF NOT EXISTS is_typing boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_typed_at timestamp with time zone DEFAULT NULL;