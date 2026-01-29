-- Add column to control friends list visibility
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hide_friends_list boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hide_friends_list IS 'When true, hides the user''s friends list from other users';