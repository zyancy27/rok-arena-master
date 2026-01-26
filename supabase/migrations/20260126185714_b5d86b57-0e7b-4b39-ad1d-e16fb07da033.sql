-- Fix: Require authentication to view races from public profiles
-- This prevents unauthenticated users from scraping user_id data

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view races from public profiles" ON public.races;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view races from public profiles" 
ON public.races 
FOR SELECT 
USING (
  (auth.uid() = user_id) 
  OR (
    auth.uid() IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = races.user_id AND profiles.is_private = true
    )
  ) 
  OR is_admin_or_moderator()
);