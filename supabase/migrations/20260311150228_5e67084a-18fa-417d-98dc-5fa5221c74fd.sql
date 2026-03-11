ALTER TABLE public.campaign_participants 
ADD COLUMN IF NOT EXISTS last_read_message_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_read_at timestamp with time zone DEFAULT NULL;