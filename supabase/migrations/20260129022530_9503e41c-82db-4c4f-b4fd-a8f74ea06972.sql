-- Try a more explicit check that doesn't depend on auth.uid() parsing
-- First, let's see what happens with a true permissive policy
DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

-- Create a policy that just checks the role is set (not anonymous)
CREATE POLICY "Authenticated users can create battles"
  ON public.battles
  FOR INSERT
  WITH CHECK (
    -- Check that the current_setting for role contains something set by the JWT
    current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL
  );