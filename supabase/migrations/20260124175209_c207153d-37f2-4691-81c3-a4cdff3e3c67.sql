-- Update solar_systems RLS policy to require authentication
-- This prevents anonymous users from enumerating user IDs

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view solar systems" ON public.solar_systems;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view solar systems"
ON public.solar_systems
FOR SELECT
USING (auth.uid() IS NOT NULL);