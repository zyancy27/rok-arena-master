-- Fix: planet_customizations table allows anonymous access
-- This enables user enumeration and exposes creative content without authentication

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view planet customizations" ON public.planet_customizations;

-- Create a new policy that requires authentication (matches other customization tables)
CREATE POLICY "Authenticated users can view planet customizations"
ON public.planet_customizations
FOR SELECT
USING (auth.uid() IS NOT NULL);