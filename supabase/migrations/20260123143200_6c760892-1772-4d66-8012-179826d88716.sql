-- Add is_private column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Update characters RLS policy to respect user privacy
DROP POLICY IF EXISTS "Anyone can view all characters" ON public.characters;

CREATE POLICY "Anyone can view public characters"
ON public.characters
FOR SELECT
USING (
  -- Owner can always see their own characters
  auth.uid() = user_id
  -- Others can only see if the owner's profile is not private
  OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = characters.user_id
    AND profiles.is_private = true
  )
  -- Admins/moderators can see all
  OR is_admin_or_moderator()
);

-- Update profiles RLS policy to respect privacy for non-owners
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
USING (
  -- Owner can always see their own profile
  auth.uid() = id
  -- Others can only see if profile is not private
  OR is_private = false
  -- Admins/moderators can see all
  OR is_admin_or_moderator()
);