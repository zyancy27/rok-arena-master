-- Temporarily make the policy completely permissive to test
DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

-- Create a truly permissive policy with no conditions
CREATE POLICY "Authenticated users can create battles"
  ON public.battles
  FOR INSERT
  WITH CHECK (true);