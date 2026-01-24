-- Fix profiles RLS policy to require authentication for viewing public profiles
-- This prevents username enumeration attacks by anonymous users

DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view public profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) 
  OR (auth.uid() IS NOT NULL AND is_private = false) 
  OR is_admin_or_moderator()
);