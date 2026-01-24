-- Fix galaxy_customizations RLS policy to require authentication
-- This prevents anonymous users from enumerating user IDs

DROP POLICY IF EXISTS "Anyone can view galaxy customizations" ON public.galaxy_customizations;

CREATE POLICY "Authenticated users can view galaxy customizations"
ON public.galaxy_customizations
FOR SELECT
USING (auth.uid() IS NOT NULL);